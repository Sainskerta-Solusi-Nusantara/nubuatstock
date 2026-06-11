import {
  boolean,
  date,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { jsonbT, ulid, ulidRef, withTimestamps } from "./_base";
import { companies } from "./companies";

/**
 * Daily Picks Engine (Agent 8).
 *
 * Empat tabel inti:
 *  - `picks_scoring_runs`     → audit run generation harian.
 *  - `daily_picks`            → pick yang dipublish per hari per emiten.
 *  - `pick_outcomes`          → evaluasi hasil (T+1/T+5/T+20/final), diisi worker.
 *  - `picks_scoring_weights`  → bobot scoring versioned (untuk A/B & rollback).
 *
 * Konvensi nilai enum disimpan sebagai `text` (extensible) — validasi tipe via
 * Zod schema di `lib/types/picks.ts`. Bobot scoring live di table dedicated
 * (BUKAN hardcoded di scoring.ts) — seed v1 sync dari `app_config.picks.scoring_weights`.
 *
 * FK convention:
 *  - `company_kode` → `companies.kode` (text→text). Konsisten dengan market schema.
 *  - `run_id` → `picks_scoring_runs.id` (ULID).
 *  - `pick_id` → `daily_picks.id` (ULID).
 */

// ============================== picks_scoring_runs ==============================

export const picksScoringRuns = pgTable(
  "picks_scoring_runs",
  {
    id: ulid(),
    runDate: date("run_date", { mode: "string" }).notNull(),
    startedAt: timestamp("started_at", { withTimezone: true, mode: "date" })
      .notNull()
      .default(sql`now()`),
    finishedAt: timestamp("finished_at", { withTimezone: true, mode: "date" }),
    status: text("status").notNull().default("running"),
    universeSize: integer("universe_size").notNull().default(0),
    picksGenerated: integer("picks_generated").notNull().default(0),
    errorMessage: text("error_message"),
    scoringWeights: jsonbT<Record<string, number>>("scoring_weights").notNull().default({}),
    configSnapshot: jsonbT<Record<string, unknown>>("config_snapshot").notNull().default({}),
    ...withTimestamps,
  },
  (t) => [
    index("picks_runs_run_date_idx").on(t.runDate),
    index("picks_runs_status_idx").on(t.status),
    uniqueIndex("picks_runs_run_date_started_uq").on(t.runDate, t.startedAt),
  ],
);

// ============================== daily_picks ==============================

export const dailyPicks = pgTable(
  "daily_picks",
  {
    id: ulid(),
    runId: ulidRef("run_id").references(() => picksScoringRuns.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
    tradeDate: date("trade_date", { mode: "string" }).notNull(),
    companyKode: text("company_kode")
      .notNull()
      .references(() => companies.kode, { onDelete: "cascade", onUpdate: "cascade" }),
    setupType: text("setup_type").notNull(),
    score: numeric("score", { precision: 6, scale: 2 }).notNull(),
    confidence: text("confidence").notNull(),
    entryZoneLow: numeric("entry_zone_low", { precision: 18, scale: 4 }).notNull(),
    entryZoneHigh: numeric("entry_zone_high", { precision: 18, scale: 4 }).notNull(),
    stopLoss: numeric("stop_loss", { precision: 18, scale: 4 }).notNull(),
    tp1: numeric("tp1", { precision: 18, scale: 4 }).notNull(),
    tp2: numeric("tp2", { precision: 18, scale: 4 }),
    tp3: numeric("tp3", { precision: 18, scale: 4 }),
    atr14: numeric("atr_14", { precision: 18, scale: 4 }).notNull(),
    rewardRiskRatio: numeric("reward_risk_ratio", { precision: 8, scale: 4 }).notNull(),
    timeHorizon: text("time_horizon").notNull(),
    factorBreakdown: jsonbT<Record<string, number>>("factor_breakdown").notNull().default({}),
    narrativeText: text("narrative_text"),
    narrativeGeneratedBy: text("narrative_generated_by"),
    narrativeAt: timestamp("narrative_at", { withTimezone: true, mode: "date" }),
    publishedAt: timestamp("published_at", { withTimezone: true, mode: "date" })
      .notNull()
      .default(sql`now()`),
    status: text("status").notNull().default("draft"),
    ...withTimestamps,
  },
  (t) => [
    uniqueIndex("daily_picks_trade_date_company_uq").on(t.tradeDate, t.companyKode),
    index("daily_picks_trade_date_score_idx").on(t.tradeDate, t.score),
    index("daily_picks_run_idx").on(t.runId),
    index("daily_picks_status_idx").on(t.status),
    index("daily_picks_company_idx").on(t.companyKode),
    index("daily_picks_setup_idx").on(t.setupType),
  ],
);

// ============================== pick_outcomes ==============================

export const pickOutcomes = pgTable(
  "pick_outcomes",
  {
    id: ulid(),
    pickId: ulidRef("pick_id").references(() => dailyPicks.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
    evaluationAt: text("evaluation_at").notNull(),
    evaluatedOn: date("evaluated_on", { mode: "string" }).notNull(),
    priceAtEvaluation: numeric("price_at_evaluation", { precision: 18, scale: 4 }).notNull(),
    returnPct: numeric("return_pct", { precision: 8, scale: 4 }).notNull(),
    hitTp1: boolean("hit_tp1").notNull().default(false),
    hitTp2: boolean("hit_tp2").notNull().default(false),
    hitTp3: boolean("hit_tp3").notNull().default(false),
    hitSl: boolean("hit_sl").notNull().default(false),
    statusAtEvaluation: text("status_at_evaluation").notNull(),
    /**
     * Verdict winrate yang jujur: "win" = TP1 tercapai sebelum SL, "loss" = SL
     * duluan (atau SL kena tanpa TP), "ambiguous" = TP1 & SL dua-duanya tersentuh
     * di window tapi urutannya tak bisa ditentukan (intraday tak tersedia),
     * "open" = belum ada yang kena & belum terminal. Null = belum di-resolve
     * (row lama / backfill pending). Dipakai untuk winrate, bukan hit_tp1 mentah.
     */
    verdict: text("verdict"),
    ...withTimestamps,
  },
  (t) => [
    uniqueIndex("pick_outcomes_pick_eval_uq").on(t.pickId, t.evaluationAt),
    index("pick_outcomes_pick_idx").on(t.pickId),
    index("pick_outcomes_evaluated_on_idx").on(t.evaluatedOn),
  ],
);

// ============================== picks_scoring_weights ==============================

export const picksScoringWeights = pgTable(
  "picks_scoring_weights",
  {
    id: ulid(),
    version: text("version").notNull(),
    weights: jsonbT<Record<string, number>>("weights").notNull(),
    isActive: boolean("is_active").notNull().default(false),
    notes: text("notes"),
    activatedAt: timestamp("activated_at", { withTimezone: true, mode: "date" }),
    ...withTimestamps,
  },
  (t) => [
    uniqueIndex("picks_scoring_weights_version_uq").on(t.version),
    index("picks_scoring_weights_active_idx").on(t.isActive),
  ],
);

// ============================== Drizzle inferred types ==============================

export type PicksScoringRun = typeof picksScoringRuns.$inferSelect;
export type NewPicksScoringRun = typeof picksScoringRuns.$inferInsert;

export type DailyPick = typeof dailyPicks.$inferSelect;
export type NewDailyPick = typeof dailyPicks.$inferInsert;

export type PickOutcome = typeof pickOutcomes.$inferSelect;
export type NewPickOutcome = typeof pickOutcomes.$inferInsert;

export type PicksScoringWeights = typeof picksScoringWeights.$inferSelect;
export type NewPicksScoringWeights = typeof picksScoringWeights.$inferInsert;
