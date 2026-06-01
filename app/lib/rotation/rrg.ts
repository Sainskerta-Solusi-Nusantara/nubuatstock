/**
 * RRG (Relative Rotation Graph) — pure computation core.
 *
 * IMPROVEMENT_PLAN §3.C.5 — Rotation Chart 4-kuadran.
 *
 * Modul ini MURNI (tanpa DB / IO). Semua fungsi deterministik atas array harga
 * close yang sudah ter-align chronological. Dipakai oleh `service.ts` (yang
 * meng-handle pengambilan data EOD dari Postgres) dan oleh unit test.
 *
 * Setiap entity (sektor / emiten) di-plot pada 2 sumbu:
 *   x-axis: JdK RS-Ratio    — relative strength vs benchmark (IHSG proxy), normalized ~100
 *   y-axis: JdK RS-Momentum — rate-of-change dari RS-Ratio, normalized ~100
 *
 * Kuadran:
 *   Leading   (kanan-atas): RS >= 100 AND mom >= 100 — outperform + akselerasi
 *   Weakening (kanan-bawah): RS >= 100 AND mom < 100  — outperform tapi melambat
 *   Lagging   (kiri-bawah): RS < 100 AND mom < 100    — underperform + decelerating
 *   Improving (kiri-atas):  RS < 100 AND mom >= 100   — underperform tapi akselerasi
 *
 * Rotasi tipikal searah jarum jam: Improving → Leading → Weakening → Lagging → Improving.
 */

export type Quadrant = "Leading" | "Weakening" | "Lagging" | "Improving";

export interface RotationPoint {
  date: string;
  rsRatio: number; // normalized ~100
  rsMomentum: number; // normalized ~100
  quadrant: Quadrant;
}

/** Default parameter perhitungan trail. */
export const RRG_DEFAULTS = {
  /** Lookback (bars) untuk RS-Ratio. */
  rsLookback: 21,
  /** Lookback (bars) untuk membandingkan RS sekarang vs RS lampau (momentum). */
  momLookback: 10,
  /**
   * Jumlah titik trail (selain titik terakhir). Lebih banyak titik + step harian
   * → ekor mulus melengkung (seperti RRG profesional), bukan zig-zag mingguan.
   */
  pointsBack: 10,
  /** Jarak (bars) antar titik trail — 1 = harian (ekor rapat & halus). */
  stepBars: 1,
  /** Span EMA untuk menghaluskan RS-Ratio sebelum di-plot (redam noise/outlier). */
  smoothSpan: 5,
  /** Minimum bars yang dibutuhkan agar trail valid. */
  minBars: 40,
} as const;

/**
 * Exponential moving average sederhana atas deret angka.
 * Dipakai menghaluskan RS-Ratio supaya ekor RRG tidak patah-patah / outlier.
 */
function ema(values: number[], span: number): number[] {
  if (span <= 1 || values.length === 0) return values.slice();
  const k = 2 / (span + 1);
  const out: number[] = [values[0]!];
  for (let i = 1; i < values.length; i += 1) {
    out.push(values[i]! * k + out[i - 1]! * (1 - k));
  }
  return out;
}

/**
 * Klasifikasikan satu titik ke kuadran berdasar RS-Ratio & RS-Momentum.
 * Garis pembatas pada 100 (perform sama dengan benchmark).
 */
export function classifyQuadrant(rsRatio: number, rsMomentum: number): Quadrant {
  if (rsRatio >= 100 && rsMomentum >= 100) return "Leading";
  if (rsRatio >= 100 && rsMomentum < 100) return "Weakening";
  if (rsRatio < 100 && rsMomentum < 100) return "Lagging";
  return "Improving";
}

/**
 * RS-Ratio pada bar `idx`: cumulative relative return entity vs benchmark
 * selama `lookback` bar, dinormalisasi ke 100.
 *
 *   entRet = (P_idx - P_(idx-lookback)) / P_(idx-lookback)
 *   benRet = (B_idx - B_(idx-lookback)) / B_(idx-lookback)
 *   rsRatio = 100 * (1 + (entRet - benRet))
 *
 * rsRatio > 100 → entity outperform benchmark dalam window tsb.
 */
export function rsRatioAt(
  entityCloses: number[],
  benchmarkCloses: number[],
  idx: number,
  lookback: number,
): number {
  const eBase = entityCloses[idx - lookback]!;
  const bBase = benchmarkCloses[idx - lookback]!;
  const entRet = (entityCloses[idx]! - eBase) / eBase;
  const benRet = (benchmarkCloses[idx]! - bBase) / bBase;
  return 100 * (1 + (entRet - benRet));
}

/**
 * Hitung trail RRG (deret titik) untuk entity vs benchmark.
 *
 * @param entityCloses    close array chronological (ascending)
 * @param benchmarkCloses close array chronological, ter-align ke tanggal yang sama
 * @param opts            override parameter (lihat RRG_DEFAULTS)
 * @param dates           optional — tanggal per bar (untuk label titik); fallback `bar-<idx>`
 * @returns trail (urutan lama → baru). Kosong jika data tidak cukup / tidak align.
 */
export function computeTrail(
  entityCloses: number[],
  benchmarkCloses: number[],
  opts: Partial<typeof RRG_DEFAULTS> = {},
  dates?: string[],
): RotationPoint[] {
  const { rsLookback, momLookback, pointsBack, stepBars, minBars, smoothSpan } = {
    ...RRG_DEFAULTS,
    ...opts,
  };

  const trail: RotationPoint[] = [];
  if (entityCloses.length !== benchmarkCloses.length) return trail;
  if (entityCloses.length < minBars) return trail;

  const end = entityCloses.length - 1;

  // 1. Hitung RS-Ratio mentah untuk SEMUA bar yang punya cukup history, lalu
  //    haluskan dengan EMA. Smoothing meredam noise/outlier → ekor melengkung
  //    mulus seperti RRG profesional, bukan zig-zag patah-patah.
  const rawRs: number[] = [];
  const rsIndex: number[] = []; // bar index untuk tiap entri rawRs
  for (let idx = rsLookback; idx <= end; idx += 1) {
    rawRs.push(rsRatioAt(entityCloses, benchmarkCloses, idx, rsLookback));
    rsIndex.push(idx);
  }
  if (rawRs.length < momLookback + 2) return trail;
  const smoothRs = ema(rawRs, smoothSpan);

  // Map bar index → posisi di array smoothRs (untuk ambil nilai & momentum).
  const posOfIdx = new Map<number, number>();
  rsIndex.forEach((bi, pos) => posOfIdx.set(bi, pos));

  // 2. Daftar index titik trail (lama → baru): end - pointsBack*step ... end
  const indices: number[] = [];
  for (let i = pointsBack; i >= 0; i -= 1) {
    indices.push(end - i * stepBars);
  }

  for (const idx of indices) {
    const pos = posOfIdx.get(idx);
    const prevPos = posOfIdx.get(idx - momLookback);
    if (pos === undefined || prevPos === undefined) continue;

    const rsRatio = smoothRs[pos]!;
    // RS-Momentum: perubahan RS-Ratio (sudah dihaluskan) vs `momLookback` bar lalu.
    const rsMomentum = 100 * (1 + (rsRatio - smoothRs[prevPos]!) / 100);

    trail.push({
      date: dates?.[idx] ?? `bar-${idx}`,
      rsRatio,
      rsMomentum,
      quadrant: classifyQuadrant(rsRatio, rsMomentum),
    });
  }

  return trail;
}

/**
 * Build deret close ter-bobot market-cap dari beberapa konstituen, dinormalisasi
 * ke 100 pada tanggal dasar masing-masing. Dipakai untuk membentuk index sektor
 * maupun benchmark IHSG proxy.
 *
 * @param constituents  daftar { bars, weight } (weight tidak harus ternormalisasi)
 * @returns deret { date, close } chronological (ascending by date string)
 */
export function buildWeightedIndex(
  constituents: Array<{ bars: Array<{ date: string; close: number }>; weight: number }>,
): Array<{ date: string; close: number }> {
  const dateMap = new Map<string, { weighted: number; weight: number }>();

  for (const c of constituents) {
    if (c.weight <= 0 || c.bars.length === 0) continue;
    const base = c.bars[0]!.close;
    if (base === 0) continue;
    for (const b of c.bars) {
      const normVal = (b.close / base) * 100;
      const cur = dateMap.get(b.date) ?? { weighted: 0, weight: 0 };
      cur.weighted += normVal * c.weight;
      cur.weight += c.weight;
      dateMap.set(b.date, cur);
    }
  }

  return Array.from(dateMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, v]) => ({ date, close: v.weight > 0 ? v.weighted / v.weight : 100 }));
}
