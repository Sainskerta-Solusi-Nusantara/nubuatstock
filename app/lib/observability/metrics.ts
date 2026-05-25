import { logger } from "@/lib/logger";
import { getRedis } from "@/lib/queue/connection";

/**
 * Lightweight metrics — Redis-backed counters & histograms.
 *
 * MVP scope: tidak push ke Prometheus / OTel. Cukup HASH `metrics:counter:*`
 * dengan increment atomik & ZSET `metrics:histogram:*` untuk distribusi.
 * Admin UI bisa baca via `getCounters()` / `getHistogramSummary()`.
 *
 * Tags: encode sebagai suffix di field name `<metric>{tag1=v1,tag2=v2}`.
 * Cukup untuk MVP — kalau perlu cardinality query yang serius nanti pindah ke Prom.
 */

const COUNTER_KEY = "metrics:counter";
const HISTOGRAM_KEY_PREFIX = "metrics:histogram";

function buildField(name: string, tags?: Record<string, string | number>): string {
  if (!tags || Object.keys(tags).length === 0) return name;
  const tagStr = Object.entries(tags)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${String(v)}`)
    .join(",");
  return `${name}{${tagStr}}`;
}

export async function incrementCounter(
  name: string,
  by = 1,
  tags?: Record<string, string | number>,
): Promise<void> {
  try {
    const field = buildField(name, tags);
    await getRedis().hincrby(COUNTER_KEY, field, by);
  } catch (err) {
    logger.debug({ err, name }, "incrementCounter failed (non-fatal)");
  }
}

export async function getCounters(): Promise<Record<string, number>> {
  try {
    const raw = await getRedis().hgetall(COUNTER_KEY);
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(raw)) {
      out[k] = Number(v);
    }
    return out;
  } catch (err) {
    logger.warn({ err }, "getCounters failed");
    return {};
  }
}

/**
 * Histogram menggunakan Redis SortedSet dengan score = value, member = ULID-ish unique.
 * Untuk MVP cukup pakai LIST dengan TRIM ke N terakhir (window-based).
 */
const HISTOGRAM_WINDOW = 1024;

export async function observeHistogram(
  name: string,
  value: number,
  tags?: Record<string, string | number>,
): Promise<void> {
  try {
    const r = getRedis();
    const key = `${HISTOGRAM_KEY_PREFIX}:${buildField(name, tags)}`;
    await r.lpush(key, value.toString());
    await r.ltrim(key, 0, HISTOGRAM_WINDOW - 1);
  } catch (err) {
    logger.debug({ err, name }, "observeHistogram failed (non-fatal)");
  }
}

export interface HistogramSummary {
  count: number;
  min: number;
  max: number;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
}

export async function getHistogramSummary(
  name: string,
  tags?: Record<string, string | number>,
): Promise<HistogramSummary | null> {
  try {
    const r = getRedis();
    const key = `${HISTOGRAM_KEY_PREFIX}:${buildField(name, tags)}`;
    const raw = await r.lrange(key, 0, -1);
    if (raw.length === 0) return null;
    const values = raw.map((v) => Number(v)).filter((n) => !Number.isNaN(n));
    if (values.length === 0) return null;
    values.sort((a, b) => a - b);
    const sum = values.reduce((acc, v) => acc + v, 0);
    return {
      count: values.length,
      min: values[0] ?? 0,
      max: values[values.length - 1] ?? 0,
      avg: sum / values.length,
      p50: quantile(values, 0.5),
      p95: quantile(values, 0.95),
      p99: quantile(values, 0.99),
    };
  } catch (err) {
    logger.warn({ err, name }, "getHistogramSummary failed");
    return null;
  }
}

function quantile(sortedValues: number[], q: number): number {
  if (sortedValues.length === 0) return 0;
  const pos = (sortedValues.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  const lo = sortedValues[base] ?? 0;
  const hi = sortedValues[base + 1] ?? lo;
  return lo + (hi - lo) * rest;
}

/**
 * Helper untuk mengukur durasi async function — auto record ke histogram.
 */
export async function timed<T>(
  name: string,
  fn: () => Promise<T>,
  tags?: Record<string, string | number>,
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    await observeHistogram(name, Date.now() - start, { ...tags, status: "ok" });
    return result;
  } catch (err) {
    await observeHistogram(name, Date.now() - start, { ...tags, status: "error" });
    throw err;
  }
}
