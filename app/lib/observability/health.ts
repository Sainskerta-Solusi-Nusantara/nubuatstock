import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { pingRedis } from "@/lib/queue/connection";
import type { HealthCheckStatus, HealthResponse } from "@/lib/types/audit";
import { HEARTBEAT_FRESH_THRESHOLD_MS, readHeartbeat } from "./heartbeat";

/**
 * Composite health check untuk endpoint `/api/health`.
 *
 * - `db`: SELECT 1 dengan timeout pendek.
 * - `redis`: ping.
 * - `worker`: baca heartbeat di Redis; threshold 30 detik = ok, < 5 mnt = degraded.
 *
 * Versi app dari `package.json` (lazy-loaded). Tidak melakukan fs read di
 * production-critical path — di-cache setelah pertama kali.
 */

const PROCESS_START_MS = Date.now();
let cachedVersion: string | null = null;

async function pingDb(timeoutMs = 1500): Promise<HealthCheckStatus> {
  try {
    const probe = db.execute(sql`SELECT 1`);
    await Promise.race([
      probe,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("db ping timeout")), timeoutMs),
      ),
    ]);
    return "ok";
  } catch (err) {
    logger.warn({ err }, "DB health check failed");
    return "fail";
  }
}

async function getVersion(): Promise<string> {
  if (cachedVersion) return cachedVersion;
  try {
    const [fs, path] = await Promise.all([
      import("node:fs/promises"),
      import("node:path"),
    ]);
    // process.cwd() saat run via `npm run dev` / `npm run worker` selalu app root.
    const pkgPath = path.join(process.cwd(), "package.json");
    const raw = await fs.readFile(pkgPath, "utf8");
    const parsed = JSON.parse(raw) as { version?: string };
    cachedVersion = parsed.version ?? "0.0.0";
  } catch {
    cachedVersion = "unknown";
  }
  return cachedVersion;
}

export async function checkHealth(): Promise<HealthResponse> {
  const [dbStatus, redisOk, heartbeat, version] = await Promise.all([
    pingDb(),
    pingRedis(),
    readHeartbeat(),
    getVersion(),
  ]);

  let workerStatus: HealthCheckStatus = "unknown";
  let lastHeartbeatIso: string | null = null;
  let ageSeconds: number | null = null;
  if (heartbeat) {
    lastHeartbeatIso = new Date(heartbeat.lastMs).toISOString();
    ageSeconds = Math.floor(heartbeat.ageMs / 1000);
    if (heartbeat.ageMs <= HEARTBEAT_FRESH_THRESHOLD_MS) workerStatus = "ok";
    else if (heartbeat.ageMs <= HEARTBEAT_FRESH_THRESHOLD_MS * 10) workerStatus = "degraded";
    else workerStatus = "fail";
  }

  const checks = {
    db: dbStatus,
    redis: redisOk ? ("ok" as const) : ("fail" as const),
    worker: {
      status: workerStatus,
      lastHeartbeatAt: lastHeartbeatIso,
      ageSeconds,
    },
  };

  const ok = checks.db === "ok" && checks.redis === "ok";

  return {
    ok,
    version,
    uptimeSeconds: Math.floor((Date.now() - PROCESS_START_MS) / 1000),
    checks,
  };
}
