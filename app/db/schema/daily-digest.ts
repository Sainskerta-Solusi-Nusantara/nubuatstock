import { sql } from "drizzle-orm";
import {
  date,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { jsonbT, ulid, withTimestamps } from "./_base";

/**
 * Daily Digest snapshot — auto-generated pagi hari oleh worker untuk dashboard "Morning Brief".
 *
 * Content (semua AI-generated narrative + structured data):
 *   - market_outlook: 1-paragraf executive summary IHSG outlook
 *   - top_picks: top 5 pick of the day dari Daily Picks Engine
 *   - top_news: 5 major news with sentiment (last 24h)
 *   - sector_movers: top sector gainer/loser
 *   - upcoming_calendar: aksi korporasi 7 hari ke depan
 *
 * Idempotent per tanggal — re-run replace.
 */

export interface DigestTopPick {
  kode: string;
  namaPerusahaan: string;
  entryPrice: number;
  stopLoss: number;
  targetPrice: number;
  confidence: number;
  reasoning: string;
}

export interface DigestNews {
  title: string;
  source: string;
  url: string;
  sentiment: "bullish" | "neutral" | "bearish" | null;
  tickers: string[];
}

export interface DigestSectorMover {
  sectorKode: string;
  sectorName: string;
  returnPct: number;
  topGainerKode: string | null;
}

export interface DigestCalendarEvent {
  date: string;
  ticker: string;
  type: string;
  detail: string;
}

export const dailyDigests = pgTable(
  "daily_digests",
  {
    id: ulid(),
    digestDate: date("digest_date", { mode: "string" }).notNull(),
    marketOutlook: text("market_outlook").notNull(),
    headline: text("headline").notNull(),
    topPicks: jsonbT<DigestTopPick[]>("top_picks").notNull(),
    topNews: jsonbT<DigestNews[]>("top_news").notNull(),
    sectorMovers: jsonbT<DigestSectorMover[]>("sector_movers").notNull(),
    upcomingCalendar: jsonbT<DigestCalendarEvent[]>("upcoming_calendar").notNull(),
    generatedAt: timestamp("generated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .default(sql`now()`),
    ...withTimestamps,
  },
  (t) => [
    uniqueIndex("daily_digests_date_uq").on(t.digestDate),
    index("daily_digests_date_idx").on(t.digestDate),
  ],
);
