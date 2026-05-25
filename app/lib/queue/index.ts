import {
  Queue,
  QueueEvents,
  Worker,
  type ConnectionOptions,
  type JobsOptions,
  type Processor,
  type WorkerOptions,
} from "bullmq";
import { logger } from "@/lib/logger";
import { queueNames, type QueueName } from "@/lib/types/audit";
import {
  closeAllRedis,
  getQueueConnection,
  getWorkerConnection,
} from "./connection";

/**
 * Public Queue API.
 *
 * Common queues registered di constant `queueNames`. Tetap bisa membuat queue
 * tambahan dengan `createQueue("custom.queue")`. Tapi untuk queue resmi MVP,
 * pakai entry di `queueNames`.
 *
 * Pattern pemakaian (other agents — Agent 5/6/8):
 *
 *   // Producer (di app code):
 *   import { getQueue } from "@/lib/queue";
 *   await getQueue("picks.generate").add("daily", { tradingDate });
 *
 *   // Processor (di worker/jobs/<name>.ts):
 *   export const generatePicksProcessor: Processor = async (job) => {...}
 *
 *   // Wiring (di worker/jobs/index.ts):
 *   import { generatePicksProcessor } from "./generate-picks";
 *   export const jobRegistry = {
 *     "picks.generate": generatePicksProcessor,
 *   };
 */

const queueRegistry = new Map<string, Queue>();
const queueEventsRegistry = new Map<string, QueueEvents>();
const workerRegistry = new Map<string, Worker>();

function connectionForQueue(): ConnectionOptions {
  return getQueueConnection();
}

function connectionForWorker(): ConnectionOptions {
  return getWorkerConnection();
}

export function createQueue<DataT = unknown, ReturnT = unknown>(
  name: string,
  defaultJobOptions?: JobsOptions,
): Queue<DataT, ReturnT> {
  const existing = queueRegistry.get(name);
  if (existing) return existing as Queue<DataT, ReturnT>;

  const q = new Queue<DataT, ReturnT>(name, {
    connection: connectionForQueue(),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 5_000 },
      removeOnComplete: { count: 500, age: 60 * 60 * 24 * 3 },
      removeOnFail: { count: 1000, age: 60 * 60 * 24 * 14 },
      ...defaultJobOptions,
    },
  });
  queueRegistry.set(name, q as unknown as Queue);
  return q;
}

export function getQueue<DataT = unknown, ReturnT = unknown>(
  name: QueueName | string,
): Queue<DataT, ReturnT> {
  return createQueue<DataT, ReturnT>(name);
}

export function listRegisteredQueues(): string[] {
  return Array.from(queueRegistry.keys());
}

/**
 * Pre-register semua "official" queue agar muncul di admin UI walau belum
 * ada job. Dipanggil di entry app (route handler boot) & worker startup.
 */
export function ensureCommonQueues(): void {
  for (const name of queueNames) {
    createQueue(name);
  }
}

export function getQueueEvents(name: string): QueueEvents {
  const existing = queueEventsRegistry.get(name);
  if (existing) return existing;
  const qe = new QueueEvents(name, { connection: connectionForQueue() });
  queueEventsRegistry.set(name, qe);
  return qe;
}

export interface CreateWorkerOptions extends Partial<WorkerOptions> {
  concurrency?: number;
}

export function createWorker<DataT = unknown, ReturnT = unknown>(
  name: string,
  processor: Processor<DataT, ReturnT>,
  opts: CreateWorkerOptions = {},
): Worker<DataT, ReturnT> {
  const existing = workerRegistry.get(name);
  if (existing) return existing as unknown as Worker<DataT, ReturnT>;

  const worker = new Worker<DataT, ReturnT>(name, processor, {
    connection: connectionForWorker(),
    concurrency: opts.concurrency ?? 4,
    lockDuration: 60_000,
    ...opts,
  });

  worker.on("active", (job) => {
    logger.debug({ queue: name, jobId: job.id, jobName: job.name }, "Job active");
  });
  worker.on("completed", (job, result) => {
    logger.info(
      { queue: name, jobId: job.id, jobName: job.name, durationMs: Date.now() - (job.processedOn ?? Date.now()) },
      "Job completed",
    );
    void result;
  });
  worker.on("failed", (job, err) => {
    logger.error(
      { queue: name, jobId: job?.id, jobName: job?.name, err },
      "Job failed",
    );
  });
  worker.on("error", (err) => {
    logger.error({ queue: name, err }, "Worker error");
  });

  workerRegistry.set(name, worker as unknown as Worker);
  return worker;
}

export function listRegisteredWorkers(): string[] {
  return Array.from(workerRegistry.keys());
}

/**
 * Repeatable job helper. Mengganti repeatable lama dengan jobId yang sama
 * supaya tidak duplikat saat cron config berubah.
 */
export async function scheduleRepeatableJob<DataT = unknown>(
  queueName: string,
  jobName: string,
  data: DataT,
  cron: string,
  opts: { tz?: string; jobId?: string } = {},
): Promise<void> {
  const q = createQueue<DataT>(queueName);
  const repeatKey = opts.jobId ?? `${jobName}:${cron}`;

  const existingRepeats = await q.getRepeatableJobs();
  for (const r of existingRepeats) {
    if (r.name === jobName) {
      await q.removeRepeatableByKey(r.key);
    }
  }

  await q.add(jobName, data, {
    repeat: {
      pattern: cron,
      ...(opts.tz ? { tz: opts.tz } : {}),
    },
    jobId: repeatKey,
  });
  logger.info({ queueName, jobName, cron, tz: opts.tz }, "Scheduled repeatable job");
}

/**
 * Graceful shutdown — close semua worker, queue, & redis connections.
 */
export async function closeQueueSystem(): Promise<void> {
  const workerCloses = Array.from(workerRegistry.values()).map(async (w) => {
    try {
      await w.close();
    } catch (err) {
      logger.warn({ err }, "Worker close failed");
    }
  });
  await Promise.allSettled(workerCloses);
  workerRegistry.clear();

  const queueEventsCloses = Array.from(queueEventsRegistry.values()).map(async (qe) => {
    try {
      await qe.close();
    } catch (err) {
      logger.warn({ err }, "QueueEvents close failed");
    }
  });
  await Promise.allSettled(queueEventsCloses);
  queueEventsRegistry.clear();

  const queueCloses = Array.from(queueRegistry.values()).map(async (q) => {
    try {
      await q.close();
    } catch (err) {
      logger.warn({ err }, "Queue close failed");
    }
  });
  await Promise.allSettled(queueCloses);
  queueRegistry.clear();

  await closeAllRedis();
}

export {
  closeAllRedis,
  getQueueConnection,
  getRedis,
  getSubscriberConnection,
  getPublisherConnection,
  getWorkerConnection,
  pingRedis,
} from "./connection";
