import { and, desc, eq, ilike, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { kseiOwnership, kseiOwnershipImport, type KseiOwnership } from "@/db/schema/ksei";
import { logger } from "@/lib/logger";
import { parseBalancePos } from "./parse";

/** URL resmi KSEI untuk unduh komposisi kepemilikan (referensi update). */
export const KSEI_SOURCE_URL = "https://web.ksei.co.id/archive_download/holding_composition";

const pct = (part: number, total: number): number =>
  total > 0 ? Math.round((part / total) * 10000) / 100 : 0;

export interface ImportResult {
  posDate: string;
  rowCount: number;
  skipped: number;
}

/**
 * Import konten file BalancePos KSEI. Idempotent per tanggal: hapus baris tanggal
 * itu lalu insert ulang. Return ringkasan.
 */
export async function importBalancePos(
  content: string,
  opts: { fileName?: string; actorUserId?: string } = {},
): Promise<ImportResult> {
  const { posDate, rows, skipped } = parseBalancePos(content);
  if (!posDate || rows.length === 0) {
    throw new Error("File tidak valid / tidak ada baris data KSEI yang terbaca.");
  }

  // Hapus posisi lama tanggal yang sama (re-upload aman).
  await db.delete(kseiOwnership).where(eq(kseiOwnership.posDate, posDate));

  const values = rows.map((r) => ({
    posDate: r.posDate,
    kode: r.kode,
    secType: r.secType,
    secNum: r.secNum,
    priceIdr: r.priceIdr,
    localTotal: r.localTotal,
    foreignTotal: r.foreignTotal,
    foreignPct: pct(r.foreignTotal, r.secNum),
    localPct: pct(r.localTotal, r.secNum),
    local: r.local,
    foreign: r.foreign,
  }));

  // Insert batch (hindari payload raksasa sekali query).
  const BATCH = 500;
  for (let i = 0; i < values.length; i += BATCH) {
    await db.insert(kseiOwnership).values(values.slice(i, i + BATCH));
  }

  await db
    .insert(kseiOwnershipImport)
    .values({ posDate, rowCount: rows.length, fileName: opts.fileName ?? null, actorUserId: opts.actorUserId ?? null })
    .onConflictDoUpdate({
      target: kseiOwnershipImport.posDate,
      set: { rowCount: rows.length, fileName: opts.fileName ?? null, actorUserId: opts.actorUserId ?? null, updatedAt: new Date() },
    });

  logger.info({ posDate, rowCount: rows.length, skipped }, "KSEI BalancePos imported");
  return { posDate, rowCount: rows.length, skipped };
}

/** Tanggal posisi terbaru yang tersimpan. */
export async function getLatestPosDate(): Promise<string | null> {
  const rows = await db
    .select({ d: kseiOwnership.posDate })
    .from(kseiOwnership)
    .orderBy(desc(kseiOwnership.posDate))
    .limit(1);
  return rows[0]?.d ?? null;
}

export interface OwnershipListResult {
  posDate: string | null;
  total: number;
  rows: KseiOwnership[];
}

/**
 * Daftar kepemilikan posisi terbaru, dengan pencarian kode & sort.
 */
export async function listOwnership(opts: {
  q?: string;
  sort?: "kode" | "foreign" | "local" | "price";
  page?: number;
  pageSize?: number;
}): Promise<OwnershipListResult> {
  const posDate = await getLatestPosDate();
  if (!posDate) return { posDate: null, total: 0, rows: [] };

  const q = (opts.q ?? "").trim().toUpperCase();
  const pageSize = Math.min(100, Math.max(10, opts.pageSize ?? 50));
  const page = Math.max(1, opts.page ?? 1);
  const offset = (page - 1) * pageSize;

  const where = q
    ? and(eq(kseiOwnership.posDate, posDate), ilike(kseiOwnership.kode, `${q}%`))
    : eq(kseiOwnership.posDate, posDate);

  const orderBy =
    opts.sort === "foreign"
      ? desc(kseiOwnership.foreignPct)
      : opts.sort === "local"
        ? desc(kseiOwnership.localPct)
        : opts.sort === "price"
          ? desc(kseiOwnership.priceIdr)
          : kseiOwnership.kode;

  const [countRows, rows] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(kseiOwnership).where(where),
    db.select().from(kseiOwnership).where(where).orderBy(orderBy).limit(pageSize).offset(offset),
  ]);

  return { posDate, total: countRows[0]?.n ?? 0, rows };
}

/** Detail satu emiten (posisi terbaru). */
export async function getOwnershipByKode(kode: string): Promise<KseiOwnership | null> {
  const posDate = await getLatestPosDate();
  if (!posDate) return null;
  const rows = await db
    .select()
    .from(kseiOwnership)
    .where(and(eq(kseiOwnership.posDate, posDate), eq(kseiOwnership.kode, kode.trim().toUpperCase())))
    .limit(1);
  return rows[0] ?? null;
}
