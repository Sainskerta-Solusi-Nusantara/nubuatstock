import { logger } from "@/lib/logger";
import { getRedis } from "@/lib/queue/connection";

/**
 * Worker heartbeat — disimpan di Redis sebagai key `nubuat:worker:heartbeat`
 * (timestamp ms terakhir). Worker tulis tiap 10 detik; `checkHealth()` baca
 * untuk menentukan apakah worker hidup.
 */

const HEARTBEAT_KEY = "nubuat:worker:heartbeat";
const HEARTBEAT_TTL_SECONDS = 60; // expire kalau worker mati > 60 dtk
export const HEARTBEAT_FRESH_THRESHOLD_MS = 30_000; // 30 dtk → "ok"

export async function recordHeartbeat(): Promise<void> {
  try {
    const r = getRedis();
    await r.set(HEARTBEAT_KEY, Date.now().toString(), "EX", HEARTBEAT_TTL_SECONDS);
  } catch (err) {
    logger.warn({ err }, "Failed to record worker heartbeat");
  }
}

export async function readHeartbeat(): Promise<{ lastMs: number; ageMs: number } | null> {
  try {
    const r = getRedis();
    const raw = await r.get(HEARTBEAT_KEY);
    if (!raw) return null;
    const lastMs = Number(raw);
    if (!Number.isFinite(lastMs)) return null;
    return { lastMs, ageMs: Date.now() - lastMs };
  } catch (err) {
    logger.warn({ err }, "Failed to read worker heartbeat");
    return null;
  }
}

let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

export function startHeartbeatLoop(intervalMs = 10_000): void {
  if (heartbeatInterval) return;
  void recordHeartbeat();
  heartbeatInterval = setInterval(() => {
    void recordHeartbeat();
  }, intervalMs);
  // Allow process to exit naturally — don't keep event loop alive solely for heartbeat.
  if (typeof heartbeatInterval.unref === "function") {
    heartbeatInterval.unref();
  }
}

export function stopHeartbeatLoop(): void {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}
