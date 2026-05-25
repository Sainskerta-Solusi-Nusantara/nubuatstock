import { getConfig, ConfigNotFoundError } from "@/lib/config";
import { logger } from "@/lib/logger";
import { scheduleRepeatableJob } from "./index";

/**
 * Scheduler bootstrap — baca cron settings dari `app_config` lalu register
 * repeatable job. Idempotent: hapus repeatable lama dengan nama sama sebelum
 * insert baru, supaya perubahan cron config langsung berlaku saat worker restart.
 *
 * Cron yang dibaca (sudah di-seed default oleh scaffold):
 *   - market_data.eod_ingest_cron → queue `market.ingest.eod`
 *   - picks.generation_cron → queue `picks.generate`
 *
 * Schedules baru tinggal ditambahkan di array di bawah.
 */

interface CronJobDefinition {
  queueName: string;
  jobName: string;
  configKey: string;
  data: Record<string, unknown>;
}

const DEFAULT_TIMEZONE_FALLBACK = "Asia/Jakarta";

const CRON_DEFINITIONS: CronJobDefinition[] = [
  {
    queueName: "market.ingest.eod",
    jobName: "scheduled.eod",
    configKey: "market_data.eod_ingest_cron",
    data: { source: "scheduler" },
  },
  {
    queueName: "picks.generate",
    jobName: "scheduled.daily",
    configKey: "picks.generation_cron",
    data: { source: "scheduler" },
  },
  {
    queueName: "picks.generate",
    jobName: "expire-trial",
    configKey: "billing.trial_expiry_cron",
    data: { source: "scheduler" },
  },
  {
    queueName: "news.ingest",
    jobName: "scheduled.all",
    configKey: "news.ingest_cron",
    data: { source: "scheduler" },
  },
  {
    queueName: "news.sentiment",
    jobName: "backfill",
    configKey: "news.sentiment_backfill_cron",
    data: { limit: 100 },
  },
  {
    queueName: "technical.snapshots",
    jobName: "scheduled.bulk",
    configKey: "technical.snapshots_cron",
    data: { source: "scheduler" },
  },
  {
    queueName: "patterns.detect",
    jobName: "scheduled.bulk",
    configKey: "patterns.detect_cron",
    data: { source: "scheduler" },
  },
];

export async function bootstrapSchedules(): Promise<void> {
  let tz = DEFAULT_TIMEZONE_FALLBACK;
  try {
    tz = await getConfig<string>("runtime.timezone");
  } catch (err) {
    logger.warn({ err }, "runtime.timezone not configured, using fallback");
  }

  for (const def of CRON_DEFINITIONS) {
    try {
      const cron = await getConfig<string>(def.configKey);
      if (!cron || typeof cron !== "string") {
        logger.warn({ key: def.configKey }, "Cron config missing or invalid type, skipping");
        continue;
      }
      await scheduleRepeatableJob(def.queueName, def.jobName, def.data, cron, { tz });
    } catch (err) {
      if (err instanceof ConfigNotFoundError) {
        logger.warn(
          { key: def.configKey },
          "Cron config not found in app_config; run db:seed. Skipping schedule.",
        );
        continue;
      }
      logger.error({ err, queueName: def.queueName }, "Failed to schedule cron job");
    }
  }
}
