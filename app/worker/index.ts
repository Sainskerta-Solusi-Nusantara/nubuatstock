import { logger } from "@/lib/logger";
import {
  closeQueueSystem,
  createWorker,
  ensureCommonQueues,
} from "@/lib/queue";
import { bootstrapSchedules } from "@/lib/queue/scheduler";
import { logSystemEvent } from "@/lib/observability/audit";
import {
  startHeartbeatLoop,
  stopHeartbeatLoop,
} from "@/lib/observability/heartbeat";
import { jobRegistry, getJobRegistration } from "./jobs";
import { queueNames } from "@/lib/types/audit";
import { registerEventSubscribers } from "./subscribers";

/**
 * Worker entry point — di-run via `npm run worker`.
 *
 * Tugas:
 *   1. Init logger, Redis, queue system.
 *   2. Untuk tiap queue di `queueNames`, spawn BullMQ Worker dengan processor
 *      dari `jobRegistry`. Queue tanpa processor pakai placeholder no-op.
 *   3. Load cron schedules dari `app_config` (lihat lib/queue/scheduler.ts).
 *   4. Heartbeat tiap 10 detik → Redis (untuk `/api/health`).
 *   5. Graceful shutdown saat SIGTERM/SIGINT — drain in-flight, close koneksi.
 *
 * Other agents register processor mereka di `worker/jobs/index.ts` via
 * `registerJobProcessor` atau langsung mutate `jobRegistry`.
 */

let shuttingDown = false;

async function bootstrap(): Promise<void> {
  logger.info({ pid: process.pid }, "Worker bootstrap");

  // Pre-register all official queues so they show up in admin UI even before
  // a producer pushes a job.
  ensureCommonQueues();

  // Spawn a BullMQ Worker only for queues that have a registered processor.
  // Queues di `queueNames` tetap pre-registered (lihat ensureCommonQueues) supaya
  // admin UI bisa list-nya, tapi job-nya akan menunggu sampai processor terpasang.
  const spawned: string[] = [];
  const skipped: string[] = [];
  for (const qn of queueNames) {
    if (!jobRegistry[qn]) {
      skipped.push(qn);
      continue;
    }
    const reg = getJobRegistration(qn);
    createWorker(qn, reg.processor, { concurrency: reg.concurrency ?? 4 });
    spawned.push(qn);
    logger.info(
      { queue: qn, concurrency: reg.concurrency ?? 4 },
      "Worker registered for queue",
    );
  }

  // Allow other agents to add custom queues beyond queueNames.
  for (const qn of Object.keys(jobRegistry)) {
    if (queueNames.includes(qn as (typeof queueNames)[number])) continue;
    const reg = getJobRegistration(qn);
    createWorker(qn, reg.processor, { concurrency: reg.concurrency ?? 2 });
    spawned.push(qn);
    logger.info({ queue: qn, custom: true }, "Worker registered for custom queue");
  }

  if (skipped.length > 0) {
    logger.warn(
      { skipped },
      "Queue(s) registered tapi tanpa processor — job akan menunggu sampai processor dipasang oleh agent terkait",
    );
  }

  // Cron schedules from app_config.
  await bootstrapSchedules();

  // Cross-feature event subscribers (market.eod.ingested → picks.generate, etc.)
  await registerEventSubscribers();

  // Heartbeat loop.
  startHeartbeatLoop();

  await logSystemEvent({
    source: "worker.boot",
    level: "info",
    eventType: "worker.started",
    message: "Worker process started",
    metadata: { pid: process.pid, spawned, skipped },
  });

  logger.info("Worker ready");
}

async function shutdown(signal: NodeJS.Signals | "uncaught"): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, "Worker shutdown initiated, draining...");

  stopHeartbeatLoop();

  try {
    await logSystemEvent({
      source: "worker.shutdown",
      level: "info",
      eventType: "worker.stopping",
      message: `Worker shutdown via ${signal}`,
      metadata: { signal },
    });
  } catch {
    // ignore
  }

  try {
    await closeQueueSystem();
    logger.info("Worker queue system closed");
  } catch (err) {
    logger.error({ err }, "Error during queue system close");
  }

  process.exit(0);
}

(["SIGINT", "SIGTERM"] as const).forEach((sig) => {
  process.on(sig, () => {
    void shutdown(sig);
  });
});

process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "Uncaught exception in worker");
  void shutdown("uncaught");
});

process.on("unhandledRejection", (reason) => {
  logger.fatal({ reason }, "Unhandled rejection in worker");
  void shutdown("uncaught");
});

bootstrap().catch((err) => {
  logger.fatal({ err }, "Worker bootstrap failed");
  process.exit(1);
});
