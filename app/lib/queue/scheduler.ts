import { getConfig, ConfigNotFoundError } from "@/lib/config";
import { logger } from "@/lib/logger";
import { scheduleRepeatableJob } from "./index";

/**
 * Scheduler bootstrap — baca cron settings dari `app_config` lalu register
 * repeatable job. Idempotent: hapus repeatable lama dengan nama sama sebelum
 * insert baru, supaya perubahan cron config langsung berlaku saat worker restart.
 *
 * Cron pattern diinterpretasi pada timezone `runtime.timezone` (default
 * Asia/Jakarta / WIB), jadi semua angka jam di bawah = jam WIB.
 *
 * Tiap definisi punya `defaultCron`: kalau key config belum ada di `app_config`
 * (mis. belum di-seed), scheduler tetap mendaftarkan job dengan default ini.
 * Ini penting supaya job operasional kritikal (evaluate outcomes, expire trial,
 * check alerts, daily digest, account deletion sweep) selalu terjadwal walau
 * config belum lengkap. Operator boleh override lewat `app_config` kapan saja.
 *
 * Schedules baru tinggal ditambahkan di array di bawah.
 */

interface CronJobDefinition {
  queueName: string;
  jobName: string;
  /** Key di `app_config`; kalau ada & valid string, dipakai sebagai cron. */
  configKey: string;
  /** Fallback cron kalau `configKey` tidak ada di `app_config`. WIB. */
  defaultCron: string;
  data: Record<string, unknown>;
}

const DEFAULT_TIMEZONE_FALLBACK = "Asia/Jakarta";

const CRON_DEFINITIONS: CronJobDefinition[] = [
  {
    queueName: "market.ingest.eod",
    jobName: "scheduled.eod",
    configKey: "market_data.eod_ingest_cron",
    defaultCron: "0 16 * * 1-5", // 16:00 WIB hari bursa
    data: { source: "scheduler" },
  },
  {
    queueName: "picks.generate",
    jobName: "scheduled.daily",
    configKey: "picks.generation_cron",
    defaultCron: "30 7 * * 1-5", // 07:30 WIB hari bursa (pre-market)
    data: { source: "scheduler" },
  },
  {
    // Daily picks evaluator harian otomatis (IMPROVEMENT_PLAN §8.5 #34).
    // Routed oleh generatePicksAdapter ke evaluatePickOutcomesProcessor.
    // Jalan post-market setelah EOD ingest (16:00 WIB) selesai → 16:30 WIB.
    queueName: "picks.generate",
    jobName: "evaluate-outcomes",
    configKey: "picks.outcome_eval_cron",
    defaultCron: "30 16 * * 1-5", // 16:30 WIB hari bursa
    data: { source: "scheduler" },
  },
  {
    // Routed oleh generatePicksAdapter ke expireTrialProcessor.
    queueName: "picks.generate",
    jobName: "expire-trial",
    configKey: "billing.trial_expiry_cron",
    defaultCron: "0 1 * * *", // 01:00 WIB tiap hari
    data: { source: "scheduler" },
  },
  {
    // Trial → paid drip campaign (IMPROVEMENT_PLAN §8.5 #35).
    // Routed oleh generatePicksAdapter ke trialDripProcessor.
    // Jalan pagi sebelum expire-trial (01:00) supaya email "besok turun ke Free"
    // di hari ke-6 dikirim sebelum trial benar-benar berakhir di hari ke-7.
    queueName: "picks.generate",
    jobName: "trial-drip",
    configKey: "billing.trial_drip_cron",
    defaultCron: "0 9 * * *", // 09:00 WIB tiap hari
    data: { source: "scheduler" },
  },
  {
    queueName: "alerts.check",
    jobName: "scheduled.check",
    configKey: "alerts.check_cron",
    defaultCron: "*/5 9-16 * * 1-5", // tiap 5 menit selama jam bursa WIB
    data: { source: "scheduler" },
  },
  {
    queueName: "digest.daily",
    jobName: "scheduled.daily",
    configKey: "digest.daily_cron",
    defaultCron: "0 17 * * 1-5", // 17:00 WIB hari bursa (post-market wrap-up)
    data: { source: "scheduler" },
  },
  {
    queueName: "news.ingest",
    jobName: "scheduled.all",
    configKey: "news.ingest_cron",
    defaultCron: "*/15 * * * *", // tiap 15 menit
    data: { source: "scheduler" },
  },
  {
    queueName: "news.sentiment",
    jobName: "backfill",
    configKey: "news.sentiment_backfill_cron",
    defaultCron: "10 * * * *", // menit ke-10 tiap jam
    data: { limit: 100 },
  },
  {
    queueName: "technical.snapshots",
    jobName: "scheduled.bulk",
    configKey: "technical.snapshots_cron",
    defaultCron: "15 16 * * 1-5", // 16:15 WIB, setelah EOD ingest
    data: { source: "scheduler" },
  },
  {
    queueName: "patterns.detect",
    jobName: "scheduled.bulk",
    configKey: "patterns.detect_cron",
    defaultCron: "20 16 * * 1-5", // 16:20 WIB, setelah technical snapshots
    data: { source: "scheduler" },
  },
  {
    // UU PDP — account hard-delete sweep (FOLLOW-UP §8.7 #46).
    // Sweep users dengan scheduledDeletionAt <= now() → purge permanen.
    queueName: "account.deletion.sweep",
    jobName: "scheduled.sweep",
    configKey: "account.deletion_sweep_cron",
    defaultCron: "0 3 * * *", // 03:00 WIB tiap hari (low traffic)
    data: { source: "scheduler" },
  },
  {
    // Paper Trading Hall of Fame — snapshot ranking harian.
    queueName: "paper.leaderboard",
    jobName: "scheduled.snapshot",
    configKey: "paper.leaderboard_cron",
    defaultCron: "45 16 * * 1-5", // 16:45 WIB hari bursa, setelah EOD ingest (mark-to-market pakai close terbaru)
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
    let cron = def.defaultCron;
    try {
      const configured = await getConfig<string>(def.configKey);
      if (configured && typeof configured === "string") {
        cron = configured;
      } else {
        logger.warn(
          { key: def.configKey, defaultCron: def.defaultCron },
          "Cron config missing or invalid type, using defaultCron",
        );
      }
    } catch (err) {
      if (err instanceof ConfigNotFoundError) {
        logger.warn(
          { key: def.configKey, defaultCron: def.defaultCron },
          "Cron config not found in app_config; using built-in defaultCron",
        );
      } else {
        logger.error(
          { err, key: def.configKey, defaultCron: def.defaultCron },
          "Failed to read cron config; using built-in defaultCron",
        );
      }
    }

    try {
      await scheduleRepeatableJob(def.queueName, def.jobName, def.data, cron, { tz });
    } catch (err) {
      logger.error({ err, queueName: def.queueName, jobName: def.jobName }, "Failed to schedule cron job");
    }
  }
}
