import { and, asc, count, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { watchlists, watchlistItems } from "@/db/schema/user-data";
import { logger } from "@/lib/logger";
import { NotFoundError, ValidationError } from "@/lib/errors";
import type {
  AddItemInput,
  CreateWatchlistInput,
  RenameWatchlistInput,
  ReorderItemsInput,
  ReorderWatchlistsInput,
  UpdateItemInput,
  WatchlistDetail,
  WatchlistItemView,
  WatchlistQuoteSnapshot,
  WatchlistView,
} from "@/lib/types/watchlist";
import { getQuotesBatch, requireEntitlement, publishEvent } from "./cross-deps";
import { WATCHLIST_EVENTS } from "./events";

/**
 * Default watchlist name yang otomatis dibuat saat user pertama akses.
 * Bukan hardcode UX label — ini key konvensional yang admin tidak boleh ubah,
 * supaya seeding & migration konsisten. Label visual tetap "Utama" sesuai brief.
 */
const DEFAULT_WATCHLIST_NAME = "Utama";

const QUOTA_KEY_WATCHLIST_ITEMS = "watchlist.max_items";

function rowToView(row: typeof watchlists.$inferSelect, itemCount = 0): WatchlistView {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    sortOrder: row.sortOrder,
    colorHex: row.colorHex,
    isDefault: row.isDefault === "true",
    itemCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * Ensure user punya minimal 1 watchlist default ("Utama").
 * Idempotent: kalau sudah ada, no-op.
 *
 * Dipanggil oleh:
 * - Agent 3 (signal `user.created`) — preferred.
 * - Lazy-create di setiap getter watchlist sebagai safety net.
 */
export async function ensureDefaultWatchlist(userId: string): Promise<string> {
  const existing = await db
    .select({ id: watchlists.id })
    .from(watchlists)
    .where(
      and(
        eq(watchlists.userId, userId),
        eq(watchlists.isDefault, "true"),
        isNull(watchlists.deletedAt),
      ),
    )
    .limit(1);
  if (existing[0]) return existing[0].id;

  const inserted = await db
    .insert(watchlists)
    .values({
      userId,
      name: DEFAULT_WATCHLIST_NAME,
      sortOrder: 0,
      isDefault: "true",
    })
    .onConflictDoNothing({ target: [watchlists.userId, watchlists.name] })
    .returning({ id: watchlists.id });
  if (inserted[0]) {
    logger.debug({ userId, watchlistId: inserted[0].id }, "Default watchlist created");
    return inserted[0].id;
  }

  // Conflict happened — fetch by name.
  const fallback = await db
    .select({ id: watchlists.id })
    .from(watchlists)
    .where(and(eq(watchlists.userId, userId), eq(watchlists.name, DEFAULT_WATCHLIST_NAME)))
    .limit(1);
  if (!fallback[0]) {
    throw new NotFoundError("Default watchlist");
  }
  return fallback[0].id;
}

/**
 * Hitung total item across all watchlists user untuk quota check cumulative.
 */
async function countUserItems(userId: string): Promise<number> {
  const rows = await db
    .select({ total: count() })
    .from(watchlistItems)
    .innerJoin(watchlists, eq(watchlistItems.watchlistId, watchlists.id))
    .where(and(eq(watchlists.userId, userId), isNull(watchlists.deletedAt)));
  return rows[0]?.total ?? 0;
}

async function getOwnedWatchlist(userId: string, watchlistId: string) {
  const row = await db
    .select()
    .from(watchlists)
    .where(
      and(
        eq(watchlists.id, watchlistId),
        eq(watchlists.userId, userId),
        isNull(watchlists.deletedAt),
      ),
    )
    .limit(1);
  if (!row[0]) throw new NotFoundError("Watchlist");
  return row[0];
}

export async function listWatchlists(userId: string): Promise<WatchlistView[]> {
  await ensureDefaultWatchlist(userId);

  const wls = await db
    .select()
    .from(watchlists)
    .where(and(eq(watchlists.userId, userId), isNull(watchlists.deletedAt)))
    .orderBy(asc(watchlists.sortOrder), asc(watchlists.createdAt));

  if (wls.length === 0) return [];

  const counts = await db
    .select({
      watchlistId: watchlistItems.watchlistId,
      total: count(),
    })
    .from(watchlistItems)
    .where(
      inArray(
        watchlistItems.watchlistId,
        wls.map((w) => w.id),
      ),
    )
    .groupBy(watchlistItems.watchlistId);
  const countMap = new Map(counts.map((c) => [c.watchlistId, c.total]));
  return wls.map((w) => rowToView(w, countMap.get(w.id) ?? 0));
}

export async function createWatchlist(
  userId: string,
  input: CreateWatchlistInput,
): Promise<WatchlistView> {
  const existing = await db
    .select({ id: watchlists.id })
    .from(watchlists)
    .where(
      and(
        eq(watchlists.userId, userId),
        eq(watchlists.name, input.name),
        isNull(watchlists.deletedAt),
      ),
    )
    .limit(1);
  if (existing[0]) {
    throw new ValidationError("Nama watchlist sudah dipakai");
  }
  const maxSort = await db
    .select({ max: sql<number>`coalesce(max(${watchlists.sortOrder}), -1)` })
    .from(watchlists)
    .where(and(eq(watchlists.userId, userId), isNull(watchlists.deletedAt)));
  const nextSort = (maxSort[0]?.max ?? -1) + 1;

  const inserted = await db
    .insert(watchlists)
    .values({
      userId,
      name: input.name,
      colorHex: input.colorHex,
      sortOrder: nextSort,
      isDefault: "false",
    })
    .returning();
  const row = inserted[0];
  if (!row) throw new Error("Failed to insert watchlist");
  await publishEvent(WATCHLIST_EVENTS.CREATED, { userId, watchlistId: row.id });
  return rowToView(row, 0);
}

export async function renameWatchlist(
  userId: string,
  watchlistId: string,
  input: RenameWatchlistInput,
): Promise<WatchlistView> {
  const row = await getOwnedWatchlist(userId, watchlistId);
  const update: Partial<typeof watchlists.$inferInsert> = {};
  if (input.name !== undefined) update.name = input.name;
  if (input.colorHex !== undefined) update.colorHex = input.colorHex ?? null;
  if (Object.keys(update).length === 0) return rowToView(row);
  const updated = await db
    .update(watchlists)
    .set({ ...update, updatedAt: new Date() })
    .where(eq(watchlists.id, watchlistId))
    .returning();
  const next = updated[0];
  if (!next) throw new NotFoundError("Watchlist");
  return rowToView(next);
}

export async function deleteWatchlist(userId: string, watchlistId: string): Promise<void> {
  const row = await getOwnedWatchlist(userId, watchlistId);
  if (row.isDefault === "true") {
    throw new ValidationError("Watchlist default tidak bisa dihapus");
  }
  await db.transaction(async (tx) => {
    await tx.delete(watchlistItems).where(eq(watchlistItems.watchlistId, watchlistId));
    await tx
      .update(watchlists)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(watchlists.id, watchlistId));
  });
  await publishEvent(WATCHLIST_EVENTS.DELETED, { userId, watchlistId });
}

export async function reorderWatchlists(
  userId: string,
  input: ReorderWatchlistsInput,
): Promise<void> {
  const ids = input.order.map((o) => o.id);
  const owned = await db
    .select({ id: watchlists.id })
    .from(watchlists)
    .where(
      and(eq(watchlists.userId, userId), inArray(watchlists.id, ids), isNull(watchlists.deletedAt)),
    );
  if (owned.length !== ids.length) {
    throw new ValidationError("Beberapa watchlist tidak ditemukan");
  }
  await db.transaction(async (tx) => {
    for (const item of input.order) {
      await tx
        .update(watchlists)
        .set({ sortOrder: item.sortOrder, updatedAt: new Date() })
        .where(and(eq(watchlists.id, item.id), eq(watchlists.userId, userId)));
    }
  });
}

// =================== Items ===================

export async function addItem(
  userId: string,
  watchlistId: string,
  input: AddItemInput,
): Promise<WatchlistItemView> {
  await getOwnedWatchlist(userId, watchlistId);

  const dup = await db
    .select({ id: watchlistItems.id })
    .from(watchlistItems)
    .where(
      and(
        eq(watchlistItems.watchlistId, watchlistId),
        eq(watchlistItems.companyKode, input.companyKode),
      ),
    )
    .limit(1);
  if (dup[0]) {
    throw new ValidationError("Emiten sudah ada di watchlist ini");
  }

  const cumulative = await countUserItems(userId);
  await requireEntitlement(userId, QUOTA_KEY_WATCHLIST_ITEMS, (limit) => cumulative < limit);

  const maxSort = await db
    .select({ max: sql<number>`coalesce(max(${watchlistItems.sortOrder}), -1)` })
    .from(watchlistItems)
    .where(eq(watchlistItems.watchlistId, watchlistId));
  const nextSort = (maxSort[0]?.max ?? -1) + 1;

  const inserted = await db
    .insert(watchlistItems)
    .values({
      watchlistId,
      companyKode: input.companyKode,
      sortOrder: nextSort,
      note: input.note,
    })
    .returning();
  const row = inserted[0];
  if (!row) throw new Error("Failed to insert watchlist item");

  await publishEvent(WATCHLIST_EVENTS.ITEM_ADDED, {
    userId,
    watchlistId,
    companyKode: input.companyKode,
  });

  return {
    id: row.id,
    watchlistId: row.watchlistId,
    companyKode: row.companyKode,
    sortOrder: row.sortOrder,
    note: row.note,
    namaPerusahaan: null,
    sectorKode: null,
    quote: null,
  };
}

export async function removeItem(
  userId: string,
  watchlistId: string,
  itemId: string,
): Promise<void> {
  await getOwnedWatchlist(userId, watchlistId);
  const removed = await db
    .delete(watchlistItems)
    .where(
      and(eq(watchlistItems.id, itemId), eq(watchlistItems.watchlistId, watchlistId)),
    )
    .returning({ companyKode: watchlistItems.companyKode });
  const row = removed[0];
  if (!row) throw new NotFoundError("Watchlist item");
  await publishEvent(WATCHLIST_EVENTS.ITEM_REMOVED, {
    userId,
    watchlistId,
    companyKode: row.companyKode,
  });
}

export async function updateItem(
  userId: string,
  watchlistId: string,
  itemId: string,
  input: UpdateItemInput,
): Promise<void> {
  await getOwnedWatchlist(userId, watchlistId);
  const item = await db
    .select()
    .from(watchlistItems)
    .where(and(eq(watchlistItems.id, itemId), eq(watchlistItems.watchlistId, watchlistId)))
    .limit(1);
  if (!item[0]) throw new NotFoundError("Watchlist item");

  if (input.targetWatchlistId && input.targetWatchlistId !== watchlistId) {
    await moveItem(userId, itemId, input.targetWatchlistId);
  }

  const update: Partial<typeof watchlistItems.$inferInsert> = {};
  if (input.sortOrder !== undefined) update.sortOrder = input.sortOrder;
  if (input.note !== undefined) update.note = input.note ?? null;
  if (Object.keys(update).length > 0) {
    const target = input.targetWatchlistId ?? watchlistId;
    await db
      .update(watchlistItems)
      .set({ ...update, updatedAt: new Date() })
      .where(and(eq(watchlistItems.id, itemId), eq(watchlistItems.watchlistId, target)));
  }
}

export async function reorderItems(
  userId: string,
  watchlistId: string,
  input: ReorderItemsInput,
): Promise<void> {
  await getOwnedWatchlist(userId, watchlistId);
  await db.transaction(async (tx) => {
    for (const it of input.order) {
      await tx
        .update(watchlistItems)
        .set({ sortOrder: it.sortOrder, updatedAt: new Date() })
        .where(
          and(eq(watchlistItems.id, it.id), eq(watchlistItems.watchlistId, watchlistId)),
        );
    }
  });
}

export async function moveItem(
  userId: string,
  itemId: string,
  targetWatchlistId: string,
): Promise<void> {
  await getOwnedWatchlist(userId, targetWatchlistId);
  const item = await db
    .select({
      id: watchlistItems.id,
      currentWl: watchlistItems.watchlistId,
      companyKode: watchlistItems.companyKode,
    })
    .from(watchlistItems)
    .innerJoin(watchlists, eq(watchlistItems.watchlistId, watchlists.id))
    .where(and(eq(watchlistItems.id, itemId), eq(watchlists.userId, userId)))
    .limit(1);
  if (!item[0]) throw new NotFoundError("Watchlist item");
  if (item[0].currentWl === targetWatchlistId) return;

  const dup = await db
    .select({ id: watchlistItems.id })
    .from(watchlistItems)
    .where(
      and(
        eq(watchlistItems.watchlistId, targetWatchlistId),
        eq(watchlistItems.companyKode, item[0].companyKode),
      ),
    )
    .limit(1);
  if (dup[0]) {
    throw new ValidationError("Emiten sudah ada di watchlist tujuan");
  }
  await db
    .update(watchlistItems)
    .set({ watchlistId: targetWatchlistId, updatedAt: new Date() })
    .where(eq(watchlistItems.id, itemId));
}

// =================== Quoted view ===================

/**
 * Ambil watchlist beserta items + company metadata + latest quote.
 * Quote diambil batch via Agent 5; kalau market-data unavailable → quote = null per item.
 */
export async function getWatchlistWithQuotes(
  userId: string,
  watchlistId: string,
): Promise<WatchlistDetail> {
  const wl = await getOwnedWatchlist(userId, watchlistId);
  const items = await db
    .select({
      id: watchlistItems.id,
      watchlistId: watchlistItems.watchlistId,
      companyKode: watchlistItems.companyKode,
      sortOrder: watchlistItems.sortOrder,
      note: watchlistItems.note,
    })
    .from(watchlistItems)
    .where(eq(watchlistItems.watchlistId, watchlistId))
    .orderBy(asc(watchlistItems.sortOrder), asc(watchlistItems.createdAt));

  const companyMeta = await fetchCompanyMeta(items.map((i) => i.companyKode));
  const quoteMap = await getQuotesBatch(items.map((i) => i.companyKode));

  const views: WatchlistItemView[] = items.map((i) => {
    const meta = companyMeta.get(i.companyKode);
    const quote = quoteMap[i.companyKode] ?? null;
    return {
      id: i.id,
      watchlistId: i.watchlistId,
      companyKode: i.companyKode,
      sortOrder: i.sortOrder,
      note: i.note,
      namaPerusahaan: meta?.namaPerusahaan ?? null,
      sectorKode: meta?.sectorKode ?? null,
      quote: quote
        ? ({
            companyKode: i.companyKode,
            last: quote.last,
            prevClose: quote.prevClose,
            changeAbs: quote.changeAbs,
            changePct: quote.changePct,
            volume: quote.volume,
            value: quote.value,
            asOf: quote.asOf,
          } satisfies WatchlistQuoteSnapshot)
        : null,
    };
  });

  return { ...rowToView(wl, views.length), items: views };
}

/**
 * Companies metadata lookup. Companies table dimiliki Agent 2 namun di-read langsung
 * via Drizzle dengan typed-import; kalau schema belum ada saat compile, fallback ke
 * minimal info (kode only).
 */
async function fetchCompanyMeta(
  codes: string[],
): Promise<Map<string, { namaPerusahaan: string; sectorKode: string }>> {
  const out = new Map<string, { namaPerusahaan: string; sectorKode: string }>();
  if (codes.length === 0) return out;
  try {
    const mod = (await import("@/db/schema/companies").catch(() => null)) as {
      companies?: typeof import("@/db/schema/companies").companies;
    } | null;
    if (!mod?.companies) return out;
    const rows = await db
      .select({
        kode: mod.companies.kode,
        namaPerusahaan: mod.companies.namaPerusahaan,
        sectorKode: mod.companies.sectorKode,
      })
      .from(mod.companies)
      .where(inArray(mod.companies.kode, codes));
    for (const r of rows) {
      out.set(r.kode, { namaPerusahaan: r.namaPerusahaan, sectorKode: r.sectorKode });
    }
  } catch (err) {
    logger.debug({ err }, "fetchCompanyMeta unavailable; returning empty metadata");
  }
  return out;
}
