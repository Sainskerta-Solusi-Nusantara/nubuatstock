import type { Processor } from "bullmq";
import type { QueueName } from "@/lib/types/audit";
import { ingestEodProcessor } from "./ingest-eod";
import { ingestIntradayProcessor } from "./ingest-intraday";
import { ingestNewsProcessor } from "./ingest-news";
import { scoreNewsSentimentProcessor } from "./score-news-sentiment";
import { computeTechnicalSnapshotsProcessor } from "./compute-technical-snapshots";
import { detectPatternsProcessor } from "./detect-patterns";
import { analyzeElliottProcessor } from "./analyze-elliott";
import { generateDailyDigestProcessor } from "./generate-daily-digest";
import { computeAnalysisSnapshotsProcessor } from "./compute-analysis-snapshots";
import { accountDeletionSweepProcessor } from "./account-deletion-sweep";
import { paperLeaderboardProcessor } from "./paper-leaderboard";
import { renewSubscriptionsProcessor } from "./renew-subscriptions";

/**
 * Worker Job Registry.
 *
 * Agen lain (5, 6, 7, 8) menambahkan processor mereka di sini:
 *
 *   // worker/jobs/ingest-eod.ts (Agent 5):
 *   import type { Processor } from "bullmq";
 *   export const ingestEodProcessor: Processor = async (job) => { ... };
 *
 *   // worker/jobs/generate-picks.ts (Agent 8):
 *   export const generatePicksProcessor: Processor = async (job) => { ... };
 *
 * Lalu register di `jobRegistry` di bawah (atau panggil `registerJobProcessor()`
 * di module init). Worker entry (`worker/index.ts`) akan iterate registry &
 * spawn `createWorker` untuk tiap queue yang punya processor. Queue tanpa
 * processor tetap terdaftar (lihat `ensureCommonQueues`) tapi pakai placeholder
 * yang no-op sampai processor dipasang.
 *
 * Concurrency override per queue: lihat field `concurrency` di registry entry.
 */

export interface JobRegistration {
  processor: Processor;
  concurrency?: number;
}

/**
 * Default placeholder processor — log + retry, supaya kalau ada job tersangkut
 * di queue yang belum ada agennya, tidak DLQ langsung.
 */
const placeholderProcessor: Processor = async (job) => {
  // Other agents will replace via jobRegistry.
  return { skipped: true, queue: job.queueName, jobId: job.id, jobName: job.name };
};

/**
 * Map queue name → processor. Mutable: agent lain melakukan
 * `registerJobProcessor("queue.name", processor, opts?)` saat module mereka
 * di-load di worker startup (lihat worker/index.ts).
 *
 * Wiring sementara untuk processor Agent 5 yang sudah men-export Processor
 * yang kompatibel. Untuk Agent 6 (`check-alerts.ts`) & Agent 8 (`generate-picks.ts`)
 * yang export shape-nya berbeda, masing-masing agen perlu menambahkan adapter
 * Processor di sini (job.data → arg signature mereka).
 */
/**
 * Adapter processors — Agent 6 & Agent 8 export shape mereka berbeda dari `Processor` BullMQ.
 * Wrapper di sini convert ke signature BullMQ standard, dengan soft-import supaya
 * worker tidak crash kalau modul belum di-build.
 */
const checkAlertsAdapter: Processor = async (job) => {
  try {
    const mod = await import("./check-alerts");
    const m = mod as {
      runCheckAlerts?: (data?: unknown) => Promise<unknown>;
      checkAlertsJob?: { name: string; handler: (data?: unknown) => Promise<unknown> };
    };
    if (m.runCheckAlerts) return m.runCheckAlerts(job.data);
    if (m.checkAlertsJob) return m.checkAlertsJob.handler(job.data);
    return { skipped: true, reason: "check-alerts processor not exported" };
  } catch (err) {
    return { skipped: true, error: (err as Error).message };
  }
};

const generatePicksAdapter: Processor = async (job) => {
  try {
    // Route by job name
    if (job.name === "evaluate-outcomes") {
      const mod = await import("./evaluate-pick-outcomes");
      return mod.evaluatePickOutcomesProcessor(job, job.token!);
    }
    if (job.name === "expire-trial") {
      const mod = await import("./expire-trial");
      return mod.expireTrialProcessor(job, job.token!);
    }
    if (job.name === "trial-drip") {
      const mod = await import("./trial-drip");
      return mod.trialDripProcessor(job, job.token!);
    }
    const mod = await import("./generate-picks");
    const m = mod as {
      generatePicksJob?: (data: unknown) => Promise<unknown>;
      generatePicksProcessor?: Processor;
    };
    if (m.generatePicksJob) return m.generatePicksJob(job.data);
    if (m.generatePicksProcessor) return m.generatePicksProcessor(job, job.token!);
    return { skipped: true, reason: "generate-picks processor not exported" };
  } catch (err) {
    return { skipped: true, error: (err as Error).message };
  }
};

const notificationsAdapter: Processor = async (job) => {
  try {
    // Route by job name: welcome-email → welcomeEmailProcessor, sisanya → generic dispatcher
    if (job.name === "welcome-email") {
      const mod = await import("./welcome-email");
      return mod.welcomeEmailProcessor(job, job.token!);
    }
    const mod = await import("@/lib/notifications");
    const m = mod as { processNotificationJob?: (data: unknown) => Promise<unknown> };
    if (m.processNotificationJob) return m.processNotificationJob(job.data);
    return { skipped: true, reason: "notifications dispatcher not yet wired" };
  } catch (err) {
    return { skipped: true, error: (err as Error).message };
  }
};

export const jobRegistry: Partial<Record<QueueName | string, JobRegistration>> = {
  "market.ingest.eod": { processor: ingestEodProcessor as Processor, concurrency: 2 },
  "market.ingest.intraday": { processor: ingestIntradayProcessor as Processor, concurrency: 4 },
  "picks.generate": { processor: generatePicksAdapter, concurrency: 1 },
  "alerts.check": { processor: checkAlertsAdapter, concurrency: 2 },
  "notifications.send": { processor: notificationsAdapter, concurrency: 4 },
  "news.ingest": { processor: ingestNewsProcessor, concurrency: 1 },
  "news.sentiment": { processor: scoreNewsSentimentProcessor, concurrency: 1 },
  "technical.snapshots": { processor: computeTechnicalSnapshotsProcessor, concurrency: 1 },
  "patterns.detect": { processor: detectPatternsProcessor, concurrency: 1 },
  "elliott.analyze": { processor: analyzeElliottProcessor, concurrency: 1 },
  "digest.daily": { processor: generateDailyDigestProcessor, concurrency: 1 },
  "analysis.snapshots": { processor: computeAnalysisSnapshotsProcessor, concurrency: 1 },
  // Custom queue (di luar queueNames) — worker/index.ts spawn worker untuk
  // semua key jobRegistry di luar queueNames juga.
  "account.deletion.sweep": { processor: accountDeletionSweepProcessor, concurrency: 1 },
  "paper.leaderboard": { processor: paperLeaderboardProcessor, concurrency: 1 },
  "billing.renew": { processor: renewSubscriptionsProcessor, concurrency: 1 },
};

export function registerJobProcessor(
  name: QueueName | string,
  processor: Processor,
  opts: { concurrency?: number } = {},
): void {
  jobRegistry[name] = { processor, concurrency: opts.concurrency };
}

export function getJobRegistration(name: string): JobRegistration {
  return jobRegistry[name] ?? { processor: placeholderProcessor, concurrency: 1 };
}

export function listRegisteredJobNames(): string[] {
  return Object.keys(jobRegistry);
}
