import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  paperLeaderboardSnapshots,
  paperPortfolios,
  paperPositions,
  paperTrades,
} from "@/db/schema/paper-trading";
import { companies } from "@/db/schema/companies";
import { quotesEod } from "@/db/schema/market";
import { logger } from "@/lib/logger";

/**
 * Paper Trading service — virtual buy/sell execution + portfolio valuation.
 *
 * Validations:
 *   - Buy: cek cukup cash, harga valid, qty kelipatan 100 (standard lot IDX)
 *   - Sell: cek posisi qty cukup, FIFO untuk realized PnL
 *   - Auto-create default portfolio kalau user belum punya
 *
 * Fee: dihitung dari portfolio settings (default 0.15% buy + 0.25% sell).
 *
 * Pricing source: last close di quotes_eod (real-time intraday di P3).
 */

export interface PaperPortfolioSummary {
  id: string;
  name: string;
  description: string | null;
  cashBalanceIdr: number;
  initialCapitalIdr: number;
  positionsValueIdr: number;
  totalValueIdr: number;
  totalReturnPct: number;
  realizedPnlIdr: number;
  unrealizedPnlIdr: number;
  positionCount: number;
  isDefault: boolean;
}

export interface PaperPositionRow {
  kode: string;
  namaPerusahaan: string | null;
  logoUrl: string | null;
  quantity: number;
  avgBuyPrice: number;
  totalCost: number;
  currentPrice: number | null;
  currentValue: number | null;
  unrealizedPnl: number | null;
  unrealizedPnlPct: number | null;
  realizedPnl: number;
  firstBoughtAt: Date | null;
}

export interface PaperTradeRow {
  id: string;
  kode: string;
  side: "buy" | "sell";
  quantity: number;
  priceIdr: number;
  totalValueIdr: number;
  feeIdr: number;
  realizedPnlIdr: number | null;
  executedAt: Date;
  source: string;
  note: string | null;
}

export class PaperTradingError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = "PaperTradingError";
  }
}

/**
 * Ensure user punya minimal 1 portfolio aktif (default Rp 100jt).
 */
export async function ensureDefaultPortfolio(userId: string): Promise<string> {
  const existing = await db
    .select({ id: paperPortfolios.id })
    .from(paperPortfolios)
    .where(eq(paperPortfolios.userId, userId))
    .limit(1);

  if (existing.length > 0) return existing[0]!.id;

  const [row] = await db
    .insert(paperPortfolios)
    .values({
      userId,
      name: "Portfolio Utama",
      cashBalanceIdr: "100000000",
      initialCapitalIdr: "100000000",
      isDefault: "true",
      description: "Portfolio default — Rp 100 juta untuk simulasi swing/day trading.",
    })
    .returning({ id: paperPortfolios.id });

  logger.info({ userId, portfolioId: row?.id }, "Created default paper portfolio");
  return row!.id;
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
 * Execute BUY trade. Returns new position state.
 */
export async function executeBuy(opts: {
  portfolioId: string;
  userId: string;
  kode: string;
  quantity: number;
  source?: string;
  note?: string;
}): Promise<{ trade: PaperTradeRow; portfolio: PaperPortfolioSummary }> {
  const kode = opts.kode.toUpperCase();

  if (opts.quantity <= 0 || opts.quantity % 100 !== 0) {
    throw new PaperTradingError(
      "Quantity harus kelipatan 100 (lot IDX) dan positif",
      "INVALID_QUANTITY",
    );
  }

  const [portfolio] = await db
    .select()
    .from(paperPortfolios)
    .where(
      and(eq(paperPortfolios.id, opts.portfolioId), eq(paperPortfolios.userId, opts.userId)),
    )
    .limit(1);

  if (!portfolio) throw new PaperTradingError("Portfolio tidak ditemukan", "NOT_FOUND");

  const price = await getLastClose(kode);
  if (!price || price <= 0) {
    throw new PaperTradingError(`Harga ${kode} tidak tersedia`, "PRICE_UNAVAILABLE");
  }

  const totalValue = price * opts.quantity;
  const fee = totalValue * Number(portfolio.buyFeePct);
  const totalCost = totalValue + fee;

  if (totalCost > Number(portfolio.cashBalanceIdr)) {
    throw new PaperTradingError(
      `Cash tidak cukup. Butuh Rp ${totalCost.toLocaleString("id-ID")}, tersedia Rp ${Number(portfolio.cashBalanceIdr).toLocaleString("id-ID")}`,
      "INSUFFICIENT_CASH",
    );
  }

  // 1. Insert trade record
  const [trade] = await db
    .insert(paperTrades)
    .values({
      portfolioId: opts.portfolioId,
      companyKode: kode,
      side: "buy",
      quantity: opts.quantity,
      priceIdr: String(price),
      totalValueIdr: String(totalValue),
      feeIdr: String(fee),
      executedAt: new Date(),
      source: opts.source ?? "manual",
      note: opts.note,
    })
    .returning();

  // 2. Update / insert position (recompute avg price)
  const [existing] = await db
    .select()
    .from(paperPositions)
    .where(
      and(
        eq(paperPositions.portfolioId, opts.portfolioId),
        eq(paperPositions.companyKode, kode),
      ),
    )
    .limit(1);

  if (existing) {
    const oldQty = existing.quantity;
    const oldAvg = Number(existing.avgBuyPriceIdr);
    const newQty = oldQty + opts.quantity;
    const newAvg = (oldQty * oldAvg + opts.quantity * price) / newQty;
    await db
      .update(paperPositions)
      .set({
        quantity: newQty,
        avgBuyPriceIdr: String(newAvg),
        updatedAt: new Date(),
      })
      .where(eq(paperPositions.id, existing.id));
  } else {
    await db.insert(paperPositions).values({
      portfolioId: opts.portfolioId,
      companyKode: kode,
      quantity: opts.quantity,
      avgBuyPriceIdr: String(price),
      firstBoughtAt: new Date(),
    });
  }

  // 3. Deduct cash from portfolio
  await db
    .update(paperPortfolios)
    .set({
      cashBalanceIdr: sql`${paperPortfolios.cashBalanceIdr} - ${totalCost}`,
      updatedAt: new Date(),
    })
    .where(eq(paperPortfolios.id, opts.portfolioId));

  const summary = await getPortfolioSummary(opts.portfolioId, opts.userId);

  return {
    trade: mapTrade(trade!),
    portfolio: summary!,
  };
}

export async function executeSell(opts: {
  portfolioId: string;
  userId: string;
  kode: string;
  quantity: number;
  source?: string;
  note?: string;
}): Promise<{ trade: PaperTradeRow; portfolio: PaperPortfolioSummary }> {
  const kode = opts.kode.toUpperCase();

  if (opts.quantity <= 0 || opts.quantity % 100 !== 0) {
    throw new PaperTradingError("Quantity harus kelipatan 100 dan positif", "INVALID_QUANTITY");
  }

  const [portfolio] = await db
    .select()
    .from(paperPortfolios)
    .where(
      and(eq(paperPortfolios.id, opts.portfolioId), eq(paperPortfolios.userId, opts.userId)),
    )
    .limit(1);
  if (!portfolio) throw new PaperTradingError("Portfolio tidak ditemukan", "NOT_FOUND");

  const [position] = await db
    .select()
    .from(paperPositions)
    .where(
      and(
        eq(paperPositions.portfolioId, opts.portfolioId),
        eq(paperPositions.companyKode, kode),
      ),
    )
    .limit(1);
  if (!position) throw new PaperTradingError(`Tidak ada posisi ${kode}`, "NO_POSITION");

  if (opts.quantity > position.quantity) {
    throw new PaperTradingError(
      `Qty melebihi posisi (${position.quantity} tersedia)`,
      "INSUFFICIENT_QTY",
    );
  }

  const price = await getLastClose(kode);
  if (!price || price <= 0) {
    throw new PaperTradingError(`Harga ${kode} tidak tersedia`, "PRICE_UNAVAILABLE");
  }

  const totalValue = price * opts.quantity;
  const fee = totalValue * Number(portfolio.sellFeePct);
  const netProceeds = totalValue - fee;

  // Realized PnL = (sellPrice - avgBuy) × qty - fee
  const avgBuy = Number(position.avgBuyPriceIdr);
  const realizedPnl = (price - avgBuy) * opts.quantity - fee;

  const [trade] = await db
    .insert(paperTrades)
    .values({
      portfolioId: opts.portfolioId,
      companyKode: kode,
      side: "sell",
      quantity: opts.quantity,
      priceIdr: String(price),
      totalValueIdr: String(totalValue),
      feeIdr: String(fee),
      realizedPnlIdr: String(realizedPnl),
      executedAt: new Date(),
      source: opts.source ?? "manual",
      note: opts.note,
    })
    .returning();

  // Update position
  const remainingQty = position.quantity - opts.quantity;
  if (remainingQty === 0) {
    await db
      .update(paperPositions)
      .set({
        quantity: 0,
        realizedPnlIdr: sql`${paperPositions.realizedPnlIdr} + ${realizedPnl}`,
        updatedAt: new Date(),
      })
      .where(eq(paperPositions.id, position.id));
  } else {
    await db
      .update(paperPositions)
      .set({
        quantity: remainingQty,
        realizedPnlIdr: sql`${paperPositions.realizedPnlIdr} + ${realizedPnl}`,
        updatedAt: new Date(),
      })
      .where(eq(paperPositions.id, position.id));
  }

  await db
    .update(paperPortfolios)
    .set({
      cashBalanceIdr: sql`${paperPortfolios.cashBalanceIdr} + ${netProceeds}`,
      updatedAt: new Date(),
    })
    .where(eq(paperPortfolios.id, opts.portfolioId));

  const summary = await getPortfolioSummary(opts.portfolioId, opts.userId);

  return { trade: mapTrade(trade!), portfolio: summary! };
}

export async function listUserPortfolios(userId: string): Promise<PaperPortfolioSummary[]> {
  const rows = await db
    .select()
    .from(paperPortfolios)
    .where(eq(paperPortfolios.userId, userId))
    .orderBy(desc(paperPortfolios.isDefault), desc(paperPortfolios.createdAt));

  return Promise.all(rows.map((r) => buildSummary(r)));
}

export async function getPortfolioSummary(
  portfolioId: string,
  userId: string,
): Promise<PaperPortfolioSummary | null> {
  const [row] = await db
    .select()
    .from(paperPortfolios)
    .where(and(eq(paperPortfolios.id, portfolioId), eq(paperPortfolios.userId, userId)))
    .limit(1);
  if (!row) return null;
  return buildSummary(row);
}

async function buildSummary(
  row: typeof paperPortfolios.$inferSelect,
): Promise<PaperPortfolioSummary> {
  const positions = await db
    .select({
      kode: paperPositions.companyKode,
      qty: paperPositions.quantity,
      avgBuy: paperPositions.avgBuyPriceIdr,
      realized: paperPositions.realizedPnlIdr,
    })
    .from(paperPositions)
    .where(eq(paperPositions.portfolioId, row.id));

  let positionsValue = 0;
  let unrealized = 0;
  let realized = 0;
  let positionCount = 0;

  for (const p of positions) {
    realized += Number(p.realized);
    if (p.qty === 0) continue;
    positionCount += 1;
    const last = await getLastClose(p.kode);
    if (last == null) continue;
    const value = last * p.qty;
    positionsValue += value;
    unrealized += (last - Number(p.avgBuy)) * p.qty;
  }

  const cash = Number(row.cashBalanceIdr);
  const total = cash + positionsValue;
  const initial = Number(row.initialCapitalIdr);
  const returnPct = initial > 0 ? ((total - initial) / initial) * 100 : 0;

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    cashBalanceIdr: cash,
    initialCapitalIdr: initial,
    positionsValueIdr: positionsValue,
    totalValueIdr: total,
    totalReturnPct: returnPct,
    realizedPnlIdr: realized,
    unrealizedPnlIdr: unrealized,
    positionCount,
    isDefault: row.isDefault === "true",
  };
}

export async function getPortfolioPositions(portfolioId: string): Promise<PaperPositionRow[]> {
  const rows = await db
    .select({
      kode: paperPositions.companyKode,
      qty: paperPositions.quantity,
      avgBuy: paperPositions.avgBuyPriceIdr,
      realized: paperPositions.realizedPnlIdr,
      firstBoughtAt: paperPositions.firstBoughtAt,
      namaPerusahaan: companies.namaPerusahaan,
      logoUrl: companies.logoUrl,
    })
    .from(paperPositions)
    .leftJoin(companies, eq(companies.kode, paperPositions.companyKode))
    .where(eq(paperPositions.portfolioId, portfolioId));

  const out: PaperPositionRow[] = [];
  for (const r of rows) {
    if (r.qty === 0) continue;
    const last = await getLastClose(r.kode);
    const avgBuy = Number(r.avgBuy);
    const totalCost = avgBuy * r.qty;
    const value = last != null ? last * r.qty : null;
    const unrealizedPnl = value != null ? value - totalCost : null;
    const unrealizedPnlPct =
      unrealizedPnl != null && totalCost > 0 ? (unrealizedPnl / totalCost) * 100 : null;
    out.push({
      kode: r.kode,
      namaPerusahaan: r.namaPerusahaan,
      logoUrl: r.logoUrl,
      quantity: r.qty,
      avgBuyPrice: avgBuy,
      totalCost,
      currentPrice: last,
      currentValue: value,
      unrealizedPnl,
      unrealizedPnlPct,
      realizedPnl: Number(r.realized),
      firstBoughtAt: r.firstBoughtAt,
    });
  }
  // Sort by value desc
  out.sort((a, b) => (b.currentValue ?? 0) - (a.currentValue ?? 0));
  return out;
}

export async function getPortfolioTrades(
  portfolioId: string,
  limit = 100,
): Promise<PaperTradeRow[]> {
  const rows = await db
    .select()
    .from(paperTrades)
    .where(eq(paperTrades.portfolioId, portfolioId))
    .orderBy(desc(paperTrades.executedAt))
    .limit(limit);
  return rows.map(mapTrade);
}

function mapTrade(row: typeof paperTrades.$inferSelect): PaperTradeRow {
  return {
    id: row.id,
    kode: row.companyKode,
    side: row.side as "buy" | "sell",
    quantity: row.quantity,
    priceIdr: Number(row.priceIdr),
    totalValueIdr: Number(row.totalValueIdr),
    feeIdr: Number(row.feeIdr),
    realizedPnlIdr: row.realizedPnlIdr != null ? Number(row.realizedPnlIdr) : null,
    executedAt: row.executedAt,
    source: row.source,
    note: row.note,
  };
}

/**
 * Leaderboard — top performers berdasarkan total return %.
 * Window: 'weekly' | 'monthly' | 'all-time'
 */
export async function getLeaderboard(
  window: "weekly" | "monthly" | "all-time" = "all-time",
  limit = 20,
): Promise<
  Array<{ portfolioId: string; portfolioName: string; userId: string; returnPct: number; totalValue: number }>
> {
  // Get latest snapshot per portfolio
  const cutoff =
    window === "weekly"
      ? new Date(Date.now() - 7 * 86400000)
      : window === "monthly"
        ? new Date(Date.now() - 30 * 86400000)
        : null;

  const conds = cutoff ? [sql`${paperLeaderboardSnapshots.snapshotDate} >= ${cutoff.toISOString().slice(0, 10)}`] : [];

  const subquery = db
    .select({
      portfolioId: paperLeaderboardSnapshots.portfolioId,
      maxDate: sql<string>`max(${paperLeaderboardSnapshots.snapshotDate})`.as("max_date"),
    })
    .from(paperLeaderboardSnapshots)
    .where(conds.length > 0 ? and(...conds) : undefined)
    .groupBy(paperLeaderboardSnapshots.portfolioId)
    .as("latest");

  const rows = await db
    .select({
      portfolioId: paperLeaderboardSnapshots.portfolioId,
      returnPct: paperLeaderboardSnapshots.returnPct,
      totalValue: paperLeaderboardSnapshots.totalValueIdr,
      portfolioName: paperPortfolios.name,
      userId: paperPortfolios.userId,
    })
    .from(paperLeaderboardSnapshots)
    .innerJoin(
      subquery,
      and(
        eq(paperLeaderboardSnapshots.portfolioId, subquery.portfolioId),
        eq(paperLeaderboardSnapshots.snapshotDate, subquery.maxDate),
      ),
    )
    .innerJoin(paperPortfolios, eq(paperPortfolios.id, paperLeaderboardSnapshots.portfolioId))
    .orderBy(desc(paperLeaderboardSnapshots.returnPct))
    .limit(limit);

  return rows.map((r) => ({
    portfolioId: r.portfolioId,
    portfolioName: r.portfolioName,
    userId: r.userId,
    returnPct: Number(r.returnPct),
    totalValue: Number(r.totalValue),
  }));
}
