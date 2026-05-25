import type { Processor } from "bullmq";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { companies } from "@/db/schema/companies";
import { quotesIntraday } from "@/db/schema/market";
import { getConfig } from "@/lib/config";
import { logger } from "@/lib/logger";
import { getActiveAdapter } from "@/lib/market-data/adapters/factory";
import { AdapterNotConfiguredError, VendorError } from "@/lib/market-data/adapters/base";

/**
 * Worker job: `market.ingest.intraday`
 *
 * Snapshot quote untuk semua active companies & insert ke `quotes_intraday`.
 * Hanya jalan saat jam bursa (default 09:00–15:30 WIB) — di-cek terhadap
 * timezone dari config `runtime.timezone`.
 *
 * Refresh interval dari `market_data.intraday_refresh_seconds` (default 60 detik);
 * worker bootstrap (Agent 10) yang men-schedule repeat berdasarkan nilai ini.
 *
 * Yahoo Finance adapter punya `fetchIntraday`; kalau adapter aktif tidak,
 * fallback ke `fetchQuote` (satu titik per ticker).
 */

export interface IngestIntradayJobData {
  companyKodes?: string[];
  /**
   * Skip check jam bursa (untuk testing / manual run).
   */
  force?: boolean;
}

export interface IngestIntradayJobResult {
  skipped: boolean;
  reason?: string;
  companiesProcessed: number;
  companiesFailed: number;
  pointsInserted: number;
  vendor: string;
  durationMs: number;
}

const FETCH_CONCURRENCY = 6;

/**
 * Cek apakah saat ini dalam jam bursa IDX (Senin-Jumat 09:00–15:30 WIB).
 *
 * Pakai Intl.DateTimeFormat untuk extract jam pada timezone target.
 */
function isMarketOpen(tz: string, now: Date = new Date()): boolean {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  const parts = fmt.formatToParts(now);
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");

  if (weekday === "Sat" || weekday === "Sun") return false;
  const totalMin = hour * 60 + minute;
  // IDX: 09:00–11:30 (sesi 1) + 13:30–15:30 (sesi 2). Untuk MVP cukup window besar.
  const openWindow = totalMin >= 9 * 60 && totalMin <= 15 * 60 + 30;
  return openWindow;
}

export const ingestIntradayProcessor: Processor<IngestIntradayJobData, IngestIntradayJobResult> =
  async (job) => {
    const started = Date.now();

    const tz = await getConfig<string>("runtime.timezone", { defaultValue: "Asia/Jakarta" });
    if (!job.data.force && !isMarketOpen(tz)) {
      logger.debug({ tz }, "Market closed; skipping intraday ingest");
      return {
        skipped: true,
        reason: "market_closed",
        companiesProcessed: 0,
        companiesFailed: 0,
        pointsInserted: 0,
        vendor: "n/a",
        durationMs: Date.now() - started,
      };
    }

    const adapter = await getActiveAdapter();

    let targets: { kode: string }[];
    if (job.data.companyKodes && job.data.companyKodes.length > 0) {
      targets = job.data.companyKodes.map((k) => ({ kode: k.toUpperCase() }));
    } else {
      targets = await db
        .select({ kode: companies.kode })
        .from(companies)
        .where(and(eq(companies.isActive, true), isNull(companies.deletedAt)));
    }

    let processed = 0;
    let failed = 0;
    let pointsInserted = 0;

    const queue = [...targets];
    async function workerLoop(): Promise<void> {
      for (;;) {
        const c = queue.shift();
        if (!c) return;
        try {
          // Prefer fetchIntraday kalau adapter support; else fallback ke quote snapshot.
          if (adapter.fetchIntraday) {
            const points = await adapter.fetchIntraday(c.kode, "1d");
            if (points.length > 0) {
              const values = points.map((p) => ({
                ts: new Date(p.ts),
                companyKode: c.kode,
                price: p.price,
                volume: BigInt(p.volume || "0"),
              }));
              await db
                .insert(quotesIntraday)
                .values(values)
                .onConflictDoNothing({ target: [quotesIntraday.companyKode, quotesIntraday.ts] });
              pointsInserted += values.length;
            }
          } else {
            const q = await adapter.fetchQuote(c.kode);
            await db
              .insert(quotesIntraday)
              .values({
                ts: new Date(q.marketTime),
                companyKode: c.kode,
                price: q.price,
                volume: BigInt(q.volume ?? "0"),
              })
              .onConflictDoNothing({ target: [quotesIntraday.companyKode, quotesIntraday.ts] });
            pointsInserted += 1;
          }
          processed += 1;
        } catch (err) {
          failed += 1;
          if (err instanceof AdapterNotConfiguredError) {
            logger.error({ err, code: c.kode }, "Adapter not configured; aborting");
            throw err;
          }
          if (err instanceof VendorError) {
            logger.warn(
              { err: err.message, code: c.kode, status: err.status },
              "Vendor error per-ticker (intraday)",
            );
          } else {
            logger.warn({ err, code: c.kode }, "ingest-intraday ticker failed");
          }
        }
      }
    }
    await Promise.all(
      Array.from({ length: Math.min(FETCH_CONCURRENCY, targets.length || 1) }, () =>
        workerLoop(),
      ),
    );

    const durationMs = Date.now() - started;
    logger.info(
      { jobId: job.id, vendor: adapter.name, processed, failed, pointsInserted, durationMs },
      "ingest-intraday done",
    );

    return {
      skipped: false,
      companiesProcessed: processed,
      companiesFailed: failed,
      pointsInserted,
      vendor: adapter.name,
      durationMs,
    };
  };

/**
 * Read interval (detik) dari config.
 */
export async function getIntradayRefreshSeconds(): Promise<number> {
  const sec = await getConfig<number>("market_data.intraday_refresh_seconds", {
    defaultValue: 60,
  });
  return Math.max(15, Math.min(sec, 600));
}
