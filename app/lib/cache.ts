import { unstable_cache } from "next/cache";

/**
 * Centralized cache wrapper for read-heavy services.
 *
 * Convention:
 *   - TTL `revalidate` dalam detik. 30s untuk near-real-time, 300s untuk slow-changing.
 *   - Tags supaya kita bisa invalidate manual via revalidateTag (mis. saat worker selesai compute).
 *
 * IMPORTANT: unstable_cache mensyaratkan function pure (semua input via args, no closure).
 *
 * Cache tags convention:
 *   - "sectors" — sector heatmap, sector metrics
 *   - "news" — news list, news stats
 *   - "screener" — screener results (per-filter combo)
 *   - "snapshots" — analysis_snapshots refresh
 *   - "picks" — daily picks list
 */

export const CACHE_TAGS = {
  sectors: "sectors",
  news: "news",
  screener: "screener",
  snapshots: "snapshots",
  picks: "picks",
  rotation: "rotation",
  capitalFlow: "capital-flow",
} as const;

export const CACHE_TTL = {
  // Sektor heatmap berubah lambat (EOD); cache 5 menit
  sectorMetrics: 300,
  // News flow update tiap 15 menit; cache 60s safe
  newsList: 60,
  newsStats: 120,
  // Screener results sensitif ke filter; cache per-filter 60s
  screener: 60,
  // Rotation chart compute mahal; cache 5 menit
  rotation: 300,
  // Capital flow sama mahalnya
  capitalFlow: 300,
  // Reference data (sectors list, papan list) jarang berubah
  reference: 3600,
} as const;

/**
 * Wrap async function dengan unstable_cache.
 *
 * Usage:
 *   const cachedFn = cached(
 *     async (arg1, arg2) => {...},
 *     "my-fn",
 *     { revalidate: 60, tags: ["sectors"] }
 *   );
 *
 * Cache key terdiri dari (fn name + arguments serialized). Pastikan args
 * serializable (no functions, no Date objects without toISOString).
 */
export function cached<T extends (...args: never[]) => Promise<unknown>>(
  fn: T,
  keyPrefix: string,
  opts: { revalidate: number; tags: string[] },
): T {
  return unstable_cache(fn as never, [keyPrefix], {
    revalidate: opts.revalidate,
    tags: opts.tags,
  }) as T;
}
