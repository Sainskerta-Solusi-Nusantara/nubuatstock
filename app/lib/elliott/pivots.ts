import type { OhlcvBar } from "@/lib/types/picks";

/**
 * Elliott Pivot Detection Engine — P0 (ZigZag-based).
 *
 * Spec: ANALISIS_APLIKASI_SAHAM.md §4.1.A komponen 1 "Pivot Detection Engine".
 *
 * Mendeteksi swing high / swing low (pivot) memakai algoritma ZigZag:
 * sebuah pivot dikonfirmasi ketika harga sudah bergerak balik arah minimal
 * `thresholdPct` persen dari extreme terakhir. Ini menyaring noise kecil dan
 * hanya menyisakan swing yang signifikan — input ideal untuk wave labeling.
 *
 * Output: array `ElliottPivot` urut kronologis dengan field:
 *   - index   : indeks bar pada array `bars`
 *   - date    : tanggal bar
 *   - price   : harga extreme (high untuk pivot "high", low untuk pivot "low")
 *   - type    : "high" | "low"
 *   - strength: 0-1, seberapa besar swing menuju pivot ini relatif `thresholdPct`
 *               (di-cap 1 saat swing >= 3× threshold). Berguna untuk ranking /
 *               filter noise lebih lanjut.
 *
 * Catatan desain:
 *   - `minBarSeparation` menolak dua pivot yang terlalu berdekatan (anti-noise).
 *   - Algoritma deterministik & murni (tidak ada I/O) sehingga mudah di-unit-test.
 */

export type PivotType = "high" | "low";

export interface ElliottPivot {
  index: number;
  date: string;
  price: number;
  type: PivotType;
  strength: number;
}

export interface PivotDetectionOptions {
  /** Minimum % move balik arah untuk konfirmasi pivot. Default 3 (daily). */
  thresholdPct?: number;
  /** Minimum jarak bar antar dua pivot berurutan. Default 1. */
  minBarSeparation?: number;
}

const DEFAULT_THRESHOLD_PCT = 3;
const DEFAULT_MIN_BAR_SEPARATION = 1;

/**
 * Deteksi pivot ZigZag dari deret OHLCV kronologis.
 */
export function detectPivots(
  bars: OhlcvBar[],
  options: PivotDetectionOptions = {},
): ElliottPivot[] {
  const thresholdPct = options.thresholdPct ?? DEFAULT_THRESHOLD_PCT;
  const minBarSeparation = options.minBarSeparation ?? DEFAULT_MIN_BAR_SEPARATION;

  if (bars.length < 3 || thresholdPct <= 0) return [];

  // Tentukan arah awal: bandingkan bar pertama dengan extreme awal data.
  // Mulai dengan menganggap bar[0] sebagai anchor; "direction" = arah yang
  // sedang kita cari extreme-nya. Kita cari high dulu kalau harga naik, low
  // kalau turun — diputuskan oleh extreme pertama yang melampaui threshold.
  const raw: ElliottPivot[] = [];

  // Kandidat extreme yang sedang berjalan (belum dikonfirmasi).
  let extremeIdx = 0;
  let extremeHigh = bars[0]!.high;
  let extremeLow = bars[0]!.low;
  let extremeHighIdx = 0;
  let extremeLowIdx = 0;
  // direction null = belum tahu; "up" = sedang mencari swing high; "down" = mencari swing low.
  let direction: "up" | "down" | null = null;

  const pushPivot = (idx: number, price: number, type: PivotType, swingPct: number) => {
    const strength = Math.min(swingPct / (thresholdPct * 3), 1);
    raw.push({ index: idx, date: bars[idx]!.date, price, type, strength });
  };

  for (let i = 1; i < bars.length; i += 1) {
    const b = bars[i]!;

    if (direction === null) {
      // Tahap penentuan arah awal.
      const upMove = ((b.high - extremeLow) / extremeLow) * 100;
      const downMove = ((extremeHigh - b.low) / extremeHigh) * 100;
      if (upMove >= thresholdPct) {
        // Harga naik dari low awal → low awal jadi pivot pertama, sekarang cari high.
        pushPivot(extremeLowIdx, extremeLow, "low", upMove);
        direction = "up";
        extremeHigh = b.high;
        extremeHighIdx = i;
      } else if (downMove >= thresholdPct) {
        pushPivot(extremeHighIdx, extremeHigh, "high", downMove);
        direction = "down";
        extremeLow = b.low;
        extremeLowIdx = i;
      } else {
        // Update extreme awal yang sedang berjalan.
        if (b.high > extremeHigh) {
          extremeHigh = b.high;
          extremeHighIdx = i;
        }
        if (b.low < extremeLow) {
          extremeLow = b.low;
          extremeLowIdx = i;
        }
      }
      continue;
    }

    if (direction === "up") {
      // Sedang mencari swing high: catat high tertinggi.
      if (b.high > extremeHigh) {
        extremeHigh = b.high;
        extremeHighIdx = i;
      }
      // Konfirmasi pivot high bila harga turun >= threshold dari high.
      const pullback = ((extremeHigh - b.low) / extremeHigh) * 100;
      if (pullback >= thresholdPct) {
        const swingUp =
          raw.length > 0
            ? ((extremeHigh - raw[raw.length - 1]!.price) / raw[raw.length - 1]!.price) * 100
            : pullback;
        if (extremeHighIdx - (raw[raw.length - 1]?.index ?? -minBarSeparation - 1) >= minBarSeparation) {
          pushPivot(extremeHighIdx, extremeHigh, "high", Math.abs(swingUp));
        }
        direction = "down";
        extremeLow = b.low;
        extremeLowIdx = i;
      }
    } else {
      // direction === "down": mencari swing low.
      if (b.low < extremeLow) {
        extremeLow = b.low;
        extremeLowIdx = i;
      }
      const recovery = ((b.high - extremeLow) / extremeLow) * 100;
      if (recovery >= thresholdPct) {
        const swingDown =
          raw.length > 0
            ? ((raw[raw.length - 1]!.price - extremeLow) / raw[raw.length - 1]!.price) * 100
            : recovery;
        if (extremeLowIdx - (raw[raw.length - 1]?.index ?? -minBarSeparation - 1) >= minBarSeparation) {
          pushPivot(extremeLowIdx, extremeLow, "low", Math.abs(swingDown));
        }
        direction = "up";
        extremeHigh = b.high;
        extremeHighIdx = i;
      }
    }
  }

  // Tambahkan extreme terakhir yang belum dikonfirmasi sebagai terminal pivot
  // (penting agar wave terakhir / posisi saat ini tertangkap).
  if (direction === "up" && raw[raw.length - 1]?.index !== extremeHighIdx) {
    const prev = raw[raw.length - 1];
    const swing = prev ? ((extremeHigh - prev.price) / prev.price) * 100 : thresholdPct;
    if (!prev || extremeHighIdx - prev.index >= minBarSeparation) {
      pushPivot(extremeHighIdx, extremeHigh, "high", Math.abs(swing));
    }
  } else if (direction === "down" && raw[raw.length - 1]?.index !== extremeLowIdx) {
    const prev = raw[raw.length - 1];
    const swing = prev ? ((prev.price - extremeLow) / prev.price) * 100 : thresholdPct;
    if (!prev || extremeLowIdx - prev.index >= minBarSeparation) {
      pushPivot(extremeLowIdx, extremeLow, "low", Math.abs(swing));
    }
  }

  return raw;
}
