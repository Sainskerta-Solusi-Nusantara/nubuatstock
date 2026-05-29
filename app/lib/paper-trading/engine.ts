import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  paperLeaderboardSnapshots,
  paperPortfolios,
  paperPositions,
} from "@/db/schema/paper-trading";
import { quotesEod } from "@/db/schema/market";
import { users } from "@/db/schema/auth";
import { requireEntitlement } from "@/lib/billing/entitlements";
import { logger } from "@/lib/logger";
import {
  PaperTradingError,
  ensureDefaultPortfolio,
  executeBuy,
  executeSell,
  getLeaderboard,
  getPortfolioPositions,
  getPortfolioSummary,
  type PaperPortfolioSummary,
  type PaperPositionRow,
  type PaperTradeRow,
} from "./service";

/**
 * Paper Trading ENGINE — high-level API di atas service.ts.
 *
 * Tambahan vs service.ts:
 *   - SLIPPAGE model: harga fill digeser dari last close (buy lebih mahal,
 *     sell lebih murah) untuk meniru market impact + bid/ask spread.
 *   - Entitlement gate `feature.paper_trading` (Elite-only) di placeOrder.
 *   - Canonical helpers: getOrCreatePortfolio / placeOrder / getPortfolioState /
 *     computeLeaderboard.
 *
 * Money konvensi: rupiah disimpan sebagai numeric string di DB. Engine bekerja
 * dengan Number untuk kalkulasi & menulis kembali via service.ts.
 */

/** Entitlement key — Elite-only (sudah ada di tiers). */
export const PAPER_TRADING_ENTITLEMENT = "feature.paper_trading";

/**
 * Slippage dalam basis points (bps). 1 bps = 0.01%.
 * Buy → fill = last × (1 + bps/10000); Sell → fill = last × (1 − bps/10000).
 * 15 bps (0.15%) konservatif untuk likuiditas large/mid-cap IDX.
 */
export const SLIPPAGE_BPS = 15;

/** IDX standard lot. */
export const LOT_SIZE = 100;

export interface PlaceOrderInput {
  ticker: string;
  side: "buy" | "sell";
  qty: number;
  /** Optional explicit portfolio; default = portfolio default user. */
  portfolioId?: string;
  source?: string;
  note?: string;
}

export interface PlaceOrderResult {
  trade: PaperTradeRow;
  portfolio: PaperPortfolioSummary;
  /** Harga last close sebelum slippage (untuk transparansi UI). */
  referencePrice: number;
  /** Harga fill setelah slippage. */
  fillPrice: number;
  slippageBps: number;
}

export interface PaperPortfolioState extends PaperPortfolioSummary {
  positions: PaperPositionRow[];
}

/**
 * Pastikan user punya portfolio default (Rp 100jt). Alias semantik untuk
 * `ensureDefaultPortfolio` — sesuai kontrak task `getOrCreatePortfolio(userId)`.
 */
export async function getOrCreatePortfolio(userId: string): Promise<string> {
  return ensureDefaultPortfolio(userId);
}

/**
 * Hitung harga fill dengan slippage.
 *   buy  → naik (kita beli lebih mahal)
 *   sell → turun (kita jual lebih murah)
 */
export function applySlippage(
  lastPrice: number,
  side: "buy" | "sell",
  slippageBps = SLIPPAGE_BPS,
): number {
  const factor = side === "buy" ? 1 + slippageBps / 10_000 : 1 - slippageBps / 10_000;
  // Bulatkan ke harga utuh (IDX tick simplification — paper trading approx).
  return Math.round(lastPrice * factor);
}

async function getLastClose(kode: string): Promise<number | null> {
  const [row] = await db
    .select({ close: quotesEod.close })
    .from(quotesEod)
    .where(eq(quotesEod.companyKode, kode.toUpperCase()))
    .orderBy(desc(quotesEod.tradeDate))
    .limit(1);
  return row ? Number(row.close) : null;
}

/**
 * Place a paper order — validasi + slippage + eksekusi.
 *
 * Gate: `feature.paper_trading` (Elite-only). Kalau user tidak entitled,
 * `requireEntitlement` throw ForbiddenError (di-handle API/caller).
 *
 * Mekanisme slippage: kita inject harga fill (last close ± slippage) ke
 * service.executeBuy/Sell lewat sebuah temporary EoD row override? Tidak —
 * service membaca last close sendiri. Untuk menjaga single source of truth &
 * tidak menduplikasi seluruh logika eksekusi, engine menghitung harga fill,
 * lalu memanggil eksekutor internal yang menerima harga eksplisit.
 */
export async function placeOrder(
  userId: string,
  input: PlaceOrderInput,
): Promise<PlaceOrderResult> {
  await requireEntitlement(userId, PAPER_TRADING_ENTITLEMENT);

  const ticker = input.ticker.toUpperCase();
  const qty = input.qty;

  if (!Number.isInteger(qty) || qty <= 0 || qty % LOT_SIZE !== 0) {
    throw new PaperTradingError(
      `Quantity harus kelipatan ${LOT_SIZE} (lot IDX) dan positif`,
      "INVALID_QUANTITY",
    );
  }

  const portfolioId = input.portfolioId ?? (await getOrCreatePortfolio(userId));

  const referencePrice = await getLastClose(ticker);
  if (!referencePrice || referencePrice <= 0) {
    throw new PaperTradingError(`Harga ${ticker} tidak tersedia`, "PRICE_UNAVAILABLE");
  }
  const fillPrice = applySlippage(referencePrice, input.side, SLIPPAGE_BPS);

  const note = input.note
    ? `${input.note} (slippage ${SLIPPAGE_BPS}bps)`
    : `slippage ${SLIPPAGE_BPS}bps`;

  // Eksekusi via service, dengan override harga fill (slippage-adjusted).
  const result =
    input.side === "buy"
      ? await executeBuy({
          portfolioId,
          userId,
          kode: ticker,
          quantity: qty,
          source: input.source,
          note,
          overridePrice: fillPrice,
        })
      : await executeSell({
          portfolioId,
          userId,
          kode: ticker,
          quantity: qty,
          source: input.source,
          note,
          overridePrice: fillPrice,
        });

  return {
    trade: result.trade,
    portfolio: result.portfolio,
    referencePrice,
    fillPrice,
    slippageBps: SLIPPAGE_BPS,
  };
}

/**
 * Snapshot lengkap portfolio user untuk UI: summary (cash, equity, return%,
 * unrealized PnL) + positions marked-to-market.
 */
export async function getPortfolioState(
  userId: string,
  portfolioId?: string,
): Promise<PaperPortfolioState | null> {
  const pid = portfolioId ?? (await getOrCreatePortfolio(userId));
  const summary = await getPortfolioSummary(pid, userId);
  if (!summary) return null;
  const positions = await getPortfolioPositions(pid);
  return { ...summary, positions };
}

/**
 * Compute leaderboard snapshot HARIAN.
 *
 * Untuk tiap portfolio aktif: hitung cash + Σ(qty × last close) = total value,
 * return% = (total − initial)/initial, lalu tulis 1 row ke
 * paper_leaderboard_snapshots untuk tanggal hari ini (idempotent via unique
 * (portfolio_id, snapshot_date)). Rank weekly/monthly/all-time diisi
 * berdasarkan ranking return% pada snapshot hari ini (all-time = ranking saat
 * ini; weekly/monthly tetap diisi sama untuk konsistensi query getLeaderboard
 * yang memilih snapshot terbaru per window).
 *
 * Dipanggil oleh worker job `paper-leaderboard` setelah EoD ingest.
 */
export async function computeLeaderboard(opts?: {
  snapshotDate?: string;
}): Promise<{ snapshotDate: string; portfolios: number }> {
  const snapshotDate = opts?.snapshotDate ?? new Date().toISOString().slice(0, 10);

  const portfolios = await db.select().from(paperPortfolios);

  interface Computed {
    portfolioId: string;
    cash: number;
    positionsValue: number;
    total: number;
    returnPct: number;
    positionCount: number;
  }
  const computed: Computed[] = [];

  for (const p of portfolios) {
    const positions = await db
      .select({
        kode: paperPositions.companyKode,
        qty: paperPositions.quantity,
      })
      .from(paperPositions)
      .where(eq(paperPositions.portfolioId, p.id));

    let positionsValue = 0;
    let positionCount = 0;
    for (const pos of positions) {
      if (pos.qty === 0) continue;
      positionCount += 1;
      const last = await getLastClose(pos.kode);
      if (last == null) continue;
      positionsValue += last * pos.qty;
    }

    const cash = Number(p.cashBalanceIdr);
    const total = cash + positionsValue;
    const initial = Number(p.initialCapitalIdr);
    const returnPct = initial > 0 ? ((total - initial) / initial) * 100 : 0;

    computed.push({
      portfolioId: p.id,
      cash,
      positionsValue,
      total,
      returnPct,
      positionCount,
    });
  }

  // Rank by return% desc (1-indexed).
  const ranked = [...computed].sort((a, b) => b.returnPct - a.returnPct);
  const rankMap = new Map<string, number>();
  ranked.forEach((c, i) => rankMap.set(c.portfolioId, i + 1));

  for (const c of computed) {
    const rank = rankMap.get(c.portfolioId) ?? null;
    await db
      .insert(paperLeaderboardSnapshots)
      .values({
        portfolioId: c.portfolioId,
        snapshotDate,
        cashBalanceIdr: String(c.cash),
        positionsValueIdr: String(c.positionsValue),
        totalValueIdr: String(c.total),
        returnPct: String(c.returnPct.toFixed(4)),
        rankWeekly: rank,
        rankMonthly: rank,
        rankAllTime: rank,
        metadata: { positionCount: c.positionCount },
      })
      .onConflictDoUpdate({
        target: [paperLeaderboardSnapshots.portfolioId, paperLeaderboardSnapshots.snapshotDate],
        set: {
          cashBalanceIdr: String(c.cash),
          positionsValueIdr: String(c.positionsValue),
          totalValueIdr: String(c.total),
          returnPct: String(c.returnPct.toFixed(4)),
          rankWeekly: rank,
          rankMonthly: rank,
          rankAllTime: rank,
          metadata: { positionCount: c.positionCount },
          updatedAt: new Date(),
        },
      });
  }

  logger.info(
    { snapshotDate, portfolios: computed.length },
    "Paper leaderboard snapshot computed",
  );
  return { snapshotDate, portfolios: computed.length };
}

export interface LeaderboardEntry {
  rank: number;
  portfolioId: string;
  /** Display name yang sudah di-mask (privacy). */
  displayName: string;
  returnPct: number;
  totalValue: number;
}

/**
 * Mask display name untuk leaderboard publik.
 * "Budi Santoso" → "Budi S.";  "andre" → "and***";  kosong → "Trader".
 */
export function maskDisplayName(name: string | null | undefined): string {
  const n = (name ?? "").trim();
  if (!n) return "Trader";
  const parts = n.split(/\s+/);
  if (parts.length > 1) {
    return `${parts[0]} ${parts[parts.length - 1]!.charAt(0).toUpperCase()}.`;
  }
  if (n.length <= 3) return `${n}***`;
  return `${n.slice(0, 3)}${"*".repeat(Math.min(3, n.length - 3))}`;
}

/**
 * Leaderboard publik (Hall of Fame) dengan masked display name + rank.
 * Tidak gated — drive engagement.
 */
export async function getPublicLeaderboard(
  window: "weekly" | "monthly" | "all-time" = "all-time",
  limit = 20,
): Promise<LeaderboardEntry[]> {
  const rows = await getLeaderboard(window, limit);
  if (rows.length === 0) return [];

  const userIds = [...new Set(rows.map((r) => r.userId))];
  const userRows = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(inArray(users.id, userIds));
  const nameMap = new Map(userRows.map((u) => [u.id, u.name]));

  return rows.map((r, i) => ({
    rank: i + 1,
    portfolioId: r.portfolioId,
    displayName: maskDisplayName(nameMap.get(r.userId) ?? r.portfolioName),
    returnPct: r.returnPct,
    totalValue: r.totalValue,
  }));
}

/** Re-export tipe & util yang sering dipakai caller engine. */
export {
  PaperTradingError,
  type PaperPortfolioSummary,
  type PaperPositionRow,
  type PaperTradeRow,
} from "./service";
