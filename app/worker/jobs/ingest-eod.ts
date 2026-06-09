import type { Processor } from "bullmq";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { companies } from "@/db/schema/companies";
import { quotesEod } from "@/db/schema/market";
import { getConfig } from "@/lib/config";
import { logger } from "@/lib/logger";
import { publishEvent } from "@/lib/queue/events";
import { getActiveAdapter } from "@/lib/market-data/adapters/factory";
import { AdapterNotConfiguredError, VendorError } from "@/lib/market-data/adapters/base";
import { dateToIso } from "@/lib/market-data/range";

/**
 * Worker job: `market.ingest.eod`
 *
 * Loop semua `companies.is_active=true`, fetch EoD bars 5 hari terakhir via
 * adapter aktif, upsert ke `quotes_eod`. Emit `market.eod.ingested` event.
 *
 * Scheduled by Agent 10 worker bootstrap menggunakan cron dari config
 * `market_data.eod_ingest_cron` (default `0 16 * * 1-5` WIB).
 *
 * Idempotent: upsert dengan ON CONFLICT.
 */

export interface IngestEodJobData {
  tradingDate?: string;
  /**
   * Days back to ingest (default 5, max 30). Berguna saat first-run / backfill.
   */
  daysBack?: number;
  /**
   * Filter optional list of company kode. Empty = all active companies.
   */
  companyKodes?: string[];
}

export interface IngestEodJobResult {
  tradingDate: string;
  companiesProcessed: number;
  companiesFailed: number;
  barsInserted: number;
  vendor: string;
  durationMs: number;
  /** Kode emiten yang gagal di-fetch (capped 50) — untuk diagnosa coverage. */
  failedKodes: string[];
}

const MAX_DAYS_BACK = 30;
const FETCH_CONCURRENCY = 4;

export const ingestEodProcessor: Processor<IngestEodJobData, IngestEodJobResult> = async (job) => {
  const started = Date.now();
  const daysBack = Math.min(Math.max(job.data.daysBack ?? 5, 1), MAX_DAYS_BACK);

  const adapter = await getActiveAdapter();
  logger.info(
    { jobId: job.id, vendor: adapter.name, daysBack },
    "ingest-eod start",
  );

  // Resolve company set.
  let targets: { kode: string }[];
  if (job.data.companyKodes && job.data.companyKodes.length > 0) {
    targets = job.data.companyKodes.map((k) => ({ kode: k.toUpperCase() }));
  } else {
    targets = await db
      .select({ kode: companies.kode })
      .from(companies)
      .where(and(eq(companies.isActive, true), isNull(companies.deletedAt)));
  }

  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - daysBack);

  let processed = 0;
  let failed = 0;
  let barsInserted = 0;
  const failedKodes: string[] = [];

  // Bounded concurrency loop.
  const queue = [...targets];
  async function workerLoop(): Promise<void> {
    for (;;) {
      const c = queue.shift();
      if (!c) return;
      try {
        const bars = await adapter.fetchOhlcv(c.kode, from, to, "1d");
        if (bars.length > 0) {
          const values = bars.map((b) => {
            // Banyak adapter (mis. Yahoo) tak menyediakan nilai transaksi (turnover).
            // Estimasi value_idr = close × volume agar filter likuiditas & scoring jalan.
            const vol = Number(b.volume || "0");
            const close = Number(b.close || "0");
            const estValue = vol > 0 && close > 0 ? Math.round(close * vol) : 0;
            const provided = Number(b.valueIdr ?? "0");
            return {
              tradeDate: b.date,
              companyKode: c.kode,
              open: b.open,
              high: b.high,
              low: b.low,
              close: b.close,
              volume: BigInt(b.volume || "0"),
              valueIdr: String(provided > 0 ? provided : estValue),
            };
          });
          await db
            .insert(quotesEod)
            .values(values)
            .onConflictDoUpdate({
              target: [quotesEod.companyKode, quotesEod.tradeDate],
              set: {
                open: sql`EXCLUDED.open`,
                high: sql`EXCLUDED.high`,
                low: sql`EXCLUDED.low`,
                close: sql`EXCLUDED.close`,
                volume: sql`EXCLUDED.volume`,
                valueIdr: sql`EXCLUDED.value_idr`,
                updatedAt: new Date(),
              },
            });
          barsInserted += values.length;
        }
        processed += 1;
      } catch (err) {
        failed += 1;
        if (failedKodes.length < 50) failedKodes.push(c.kode);
        if (err instanceof AdapterNotConfiguredError) {
          logger.error({ err, code: c.kode }, "Adapter not configured; aborting");
          throw err;
        }
        if (err instanceof VendorError) {
          logger.warn({ err: err.message, code: c.kode, status: err.status }, "Vendor error per-ticker");
        } else {
          logger.warn({ err, code: c.kode }, "ingest-eod ticker failed");
        }
      }
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(FETCH_CONCURRENCY, targets.length || 1) }, () =>
      workerLoop(),
    ),
  );

  const tradingDate = job.data.tradingDate ?? dateToIso(to);
  const durationMs = Date.now() - started;

  try {
    await publishEvent("market.eod.ingested", {
      tradingDate,
      ingestedCount: processed,
      vendor: adapter.name,
      ingestedAt: new Date().toISOString(),
    });
  } catch (err) {
    logger.warn({ err }, "publishEvent market.eod.ingested failed");
  }

  logger.info(
    {
      jobId: job.id,
      vendor: adapter.name,
      tradingDate,
      processed,
      failed,
      barsInserted,
      durationMs,
      failedKodes: failedKodes.length > 0 ? failedKodes : undefined,
    },
    "ingest-eod done",
  );

  return {
    tradingDate,
    companiesProcessed: processed,
    companiesFailed: failed,
    barsInserted,
    vendor: adapter.name,
    durationMs,
    failedKodes,
  };
};

/**
 * Read cron pattern dari config. Disebut oleh worker bootstrap (Agent 10)
 * untuk register repeatable job di queue `market.ingest.eod`.
 */
export async function getIngestEodCron(): Promise<{ cron: string; tz: string }> {
  const [cron, tz] = await Promise.all([
    getConfig<string>("market_data.eod_ingest_cron", { defaultValue: "0 16 * * 1-5" }),
    getConfig<string>("runtime.timezone", { defaultValue: "Asia/Jakarta" }),
  ]);
  return { cron, tz };
}
