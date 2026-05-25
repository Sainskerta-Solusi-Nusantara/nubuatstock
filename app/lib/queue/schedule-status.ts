import { logger } from "@/lib/logger";
import { queueNames } from "@/lib/types/audit";
import { ensureCommonQueues, getQueue, listRegisteredQueues } from "./index";

/**
 * Read-only introspection of cron schedules registered di BullMQ.
 *
 * Catatan API BullMQ v5:
 *   - `getJobSchedulers()` adalah successor dari `getRepeatableJobs()`. Mengembalikan
 *     `JobSchedulerJson[]` yang sudah include `iterationCount` + `next` (epoch ms).
 *   - Untuk "last run" tidak ada field langsung — kita query `getCompleted/getFailed`
 *     lalu ambil job dengan `name` yang sama (paling baru).
 *   - Bila Redis down atau BullMQ throw, helper return `[]` (lihat try/catch di sini).
 */

export interface ScheduleInfo {
  name: string; // queue + job name (format: "queue::jobName")
  queueName: string;
  jobName: string;
  pattern: string; // cron expression (atau "every:<ms>" fallback)
  tz: string | null;
  lastRunAt: Date | null;
  lastStatus: "success" | "failed" | "running" | null;
  nextRunAt: Date | null;
  iterationCount: number;
}

interface LastRun {
  at: Date | null;
  status: "success" | "failed" | "running" | null;
}

/**
 * Cari last run untuk pasangan (queueName, jobName) dengan membandingkan
 * completed/failed/active terbaru. Return paling recent.
 */
async function findLastRun(
  queueName: string,
  jobName: string,
): Promise<LastRun> {
  try {
    const q = getQueue(queueName);
    // Ambil sebagian kecil saja — top 50 untuk masing-masing list cukup buat
    // identifikasi run terakhir tanpa hammer Redis.
    const [completed, failed, active] = await Promise.all([
      q.getCompleted(0, 50),
      q.getFailed(0, 50),
      q.getActive(0, 50),
    ]);

    let best: LastRun = { at: null, status: null };

    const consider = (ts: number | null | undefined, status: LastRun["status"]) => {
      if (!ts) return;
      const t = new Date(ts);
      if (!best.at || t.getTime() > best.at.getTime()) {
        best = { at: t, status };
      }
    };

    for (const j of active) {
      if (j.name !== jobName) continue;
      consider(j.processedOn, "running");
    }
    for (const j of completed) {
      if (j.name !== jobName) continue;
      consider(j.finishedOn, "success");
    }
    for (const j of failed) {
      if (j.name !== jobName) continue;
      consider(j.finishedOn, "failed");
    }

    return best;
  } catch (err) {
    logger.warn({ err, queueName, jobName }, "findLastRun failed, returning null");
    return { at: null, status: null };
  }
}

/**
 * Enumerasi semua schedule yang ke-register di BullMQ.
 *
 * Defensive: jika Redis down, return `[]`. Halaman admin akan render empty state.
 */
export async function listSchedules(): Promise<ScheduleInfo[]> {
  try {
    // Web app belum tentu sudah pre-register semua queue. Pastikan dulu —
    // ini idempotent dan murah (cuma `new Queue()` di registry singleton).
    ensureCommonQueues();

    // Gabungkan official queueNames + queue yang sempat ke-register custom.
    const candidateNames = new Set<string>([...queueNames, ...listRegisteredQueues()]);

    const results: ScheduleInfo[] = [];

    for (const qName of candidateNames) {
      let schedulers: Awaited<ReturnType<ReturnType<typeof getQueue>["getJobSchedulers"]>>;
      try {
        const q = getQueue(qName);
        schedulers = await q.getJobSchedulers();
      } catch (err) {
        logger.warn({ err, queue: qName }, "getJobSchedulers failed, skipping queue");
        continue;
      }

      for (const s of schedulers) {
        const jobName = s.name ?? "(anonymous)";
        const pattern =
          (typeof s.pattern === "string" && s.pattern) ||
          (typeof s.every === "number" ? `every:${s.every}ms` : "(unknown)");
        const tz = typeof s.tz === "string" ? s.tz : null;
        const nextRunAt = typeof s.next === "number" ? new Date(s.next) : null;
        const iterationCount = typeof s.iterationCount === "number" ? s.iterationCount : 0;

        const lastRun = await findLastRun(qName, jobName);

        results.push({
          name: `${qName}::${jobName}`,
          queueName: qName,
          jobName,
          pattern,
          tz,
          lastRunAt: lastRun.at,
          lastStatus: lastRun.status,
          nextRunAt,
          iterationCount,
        });
      }
    }

    // Stable sort: by next run asc (null last), then queue name.
    results.sort((a, b) => {
      const an = a.nextRunAt?.getTime() ?? Number.POSITIVE_INFINITY;
      const bn = b.nextRunAt?.getTime() ?? Number.POSITIVE_INFINITY;
      if (an !== bn) return an - bn;
      return a.name.localeCompare(b.name);
    });

    return results;
  } catch (err) {
    logger.warn({ err }, "listSchedules failed, returning empty list");
    return [];
  }
}
