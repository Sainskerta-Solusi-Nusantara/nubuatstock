import { sql } from "drizzle-orm";
import {
  bigint,
  date,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { jsonbT, softDelete, ulid, ulidRef, withTimestamps } from "./_base";

/**
 * Paper Trading — virtual portfolio dengan harga real (EoD) untuk simulasi trading.
 *
 * Default: setiap user dapat 1 portfolio "Default" dengan capital Rp 100jt saat first time.
 * User bisa create multiple portfolio (mis. "Aggressive Swing", "Defensive Income").
 *
 * Trade execution: pakai harga last close EoD (real-time intraday di P3+).
 * Fee model: configurable per portfolio, default broker fee Indonesia (0.15% buy + 0.25% sell).
 *
 * Leaderboard: daily snapshot total_value untuk ranking weekly/monthly/all-time.
 */

export const paperPortfolios = pgTable(
  "paper_portfolios",
  {
    id: ulid(),
    userId: ulidRef("user_id"),
    name: text("name").notNull(),
    cashBalanceIdr: numeric("cash_balance_idr", { precision: 24, scale: 2 }).notNull(),
    initialCapitalIdr: numeric("initial_capital_idr", { precision: 24, scale: 2 })
      .notNull()
      .default("100000000"), // Rp 100jt default
    buyFeePct: numeric("buy_fee_pct", { precision: 6, scale: 5 }).notNull().default("0.0015"), // 0.15%
    sellFeePct: numeric("sell_fee_pct", { precision: 6, scale: 5 }).notNull().default("0.0025"), // 0.25%
    isDefault: text("is_default", { enum: ["true", "false"] }).notNull().default("false"),
    description: text("description"),
    ...withTimestamps,
    ...softDelete,
  },
  (t) => [
    index("paper_portfolios_user_idx").on(t.userId),
    uniqueIndex("paper_portfolios_user_name_uq").on(t.userId, t.name),
  ],
);

export const paperPositions = pgTable(
  "paper_positions",
  {
    id: ulid(),
    portfolioId: ulidRef("portfolio_id"),
    companyKode: text("company_kode").notNull(),
    quantity: integer("quantity").notNull(),
    avgBuyPriceIdr: numeric("avg_buy_price_idr", { precision: 18, scale: 4 }).notNull(),
    realizedPnlIdr: numeric("realized_pnl_idr", { precision: 24, scale: 2 })
      .notNull()
      .default("0"),
    firstBoughtAt: timestamp("first_bought_at", { withTimezone: true, mode: "date" }),
    ...withTimestamps,
  },
  (t) => [
    uniqueIndex("paper_positions_portfolio_kode_uq").on(t.portfolioId, t.companyKode),
    index("paper_positions_portfolio_idx").on(t.portfolioId),
  ],
);

export const paperTrades = pgTable(
  "paper_trades",
  {
    id: ulid(),
    portfolioId: ulidRef("portfolio_id"),
    companyKode: text("company_kode").notNull(),
    side: text("side", { enum: ["buy", "sell"] }).notNull(),
    quantity: integer("quantity").notNull(),
    priceIdr: numeric("price_idr", { precision: 18, scale: 4 }).notNull(),
    totalValueIdr: numeric("total_value_idr", { precision: 24, scale: 2 }).notNull(),
    feeIdr: numeric("fee_idr", { precision: 24, scale: 2 }).notNull().default("0"),
    realizedPnlIdr: numeric("realized_pnl_idr", { precision: 24, scale: 2 }), // null untuk buy
    executedAt: timestamp("executed_at", { withTimezone: true, mode: "date" })
      .notNull()
      .default(sql`now()`),
    source: text("source").notNull().default("manual"), // 'manual' | 'follow_pick' | 'follow_screener'
    note: text("note"),
    ...withTimestamps,
  },
  (t) => [
    index("paper_trades_portfolio_idx").on(t.portfolioId, t.executedAt),
    index("paper_trades_kode_idx").on(t.companyKode),
  ],
);

/**
 * Daily snapshot total value untuk performance tracking & leaderboard.
 * Worker setiap hari setelah EoD ingest compute value = cash + Σ(position.qty × close).
 */
export const paperLeaderboardSnapshots = pgTable(
  "paper_leaderboard_snapshots",
  {
    id: ulid(),
    portfolioId: ulidRef("portfolio_id"),
    snapshotDate: date("snapshot_date", { mode: "string" }).notNull(),
    cashBalanceIdr: numeric("cash_balance_idr", { precision: 24, scale: 2 }).notNull(),
    positionsValueIdr: numeric("positions_value_idr", { precision: 24, scale: 2 }).notNull(),
    totalValueIdr: numeric("total_value_idr", { precision: 24, scale: 2 }).notNull(),
    returnPct: numeric("return_pct", { precision: 8, scale: 4 }).notNull(),
    rankWeekly: integer("rank_weekly"),
    rankMonthly: integer("rank_monthly"),
    rankAllTime: integer("rank_all_time"),
    metadata: jsonbT<{ positionCount: number; topGainer?: string; topLoser?: string }>("metadata"),
    ...withTimestamps,
  },
  (t) => [
    uniqueIndex("paper_leaderboard_uq").on(t.portfolioId, t.snapshotDate),
    index("paper_leaderboard_date_value_idx").on(t.snapshotDate, t.totalValueIdr),
  ],
);
