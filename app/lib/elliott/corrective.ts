/**
 * Corrective Wave Labeling — P1 (A-B-C).
 *
 * Spec: ANALISIS_APLIKASI_SAHAM.md §4.1.A komponen 2 "Fallback: kalau pattern
 * tidak match impulse, coba corrective (ABC, WXY, triangle)".
 *
 * P1 scope: pola koreksi sederhana 3-gelombang A-B-C dari 4 pivot endpoint.
 * Dua subtipe yang dideteksi:
 *
 *   - ZIGZAG (5-3-5): koreksi tajam. Wave B retrace dangkal (< ~61.8% Wave A),
 *     Wave C umumnya menembus ujung Wave A (C ≈ A atau lebih panjang).
 *   - FLAT (3-3-5): koreksi sideways. Wave B retrace dalam (≥ ~80% Wave A,
 *     bisa > 100% pada expanded flat), Wave C kembali ke sekitar ujung Wave A.
 *
 * Catatan: kita bekerja dari struktur pivot (bukan sub-divisi internal), jadi
 * pembedaan zigzag vs flat memakai proporsi retracement B dan jangkauan C —
 * heuristik standar yang dipakai banyak EW engine pada level pivot.
 *
 * Hard guideline koreksi (untuk validitas dasar):
 *   - Wave A, B, C harus alternating (high/low) — koreksi punya 3 leg.
 *   - Wave B tidak boleh retrace > 138.2% Wave A (di atas itu bukan ABC sederhana,
 *     lebih mungkin impulse / pola lain).
 *
 * Modul ini murni numerik/struktural (tanpa I/O) → mudah di-unit-test.
 */

import type { ElliottPivot } from "@/lib/elliott/pivots";

export type CorrectiveDirection = "down" | "up"; // arah net koreksi (down = koreksi setelah uptrend)
export type CorrectiveSubtype = "zigzag" | "flat";

/** Empat endpoint harga yang mendefinisikan koreksi A-B-C. */
export interface CorrectivePrices {
  /** Awal Wave A (titik puncak/dasar tren sebelumnya). */
  p0: number;
  /** Akhir Wave A. */
  pA: number;
  /** Akhir Wave B (retracement terhadap A). */
  pB: number;
  /** Akhir Wave C. */
  pC: number;
}

export interface CorrectiveSegment {
  label: "A" | "B" | "C";
  startDate: string;
  endDate: string;
  startPrice: number;
  endPrice: number;
}

export interface CorrectiveResult {
  direction: CorrectiveDirection;
  subtype: CorrectiveSubtype;
  segments: CorrectiveSegment[];
  /** 0-1 */
  confidence: number;
  reasoning: string[];
  /** Endpoint harga A/B/C yang dipakai (untuk fib & current-wave). */
  prices: CorrectivePrices;
  /** Pivot yang membentuk koreksi (4 endpoint). */
  pivots: ElliottPivot[];
}

const MAX_B_RETRACE_PCT = 1.382; // > ini → tolak sebagai ABC sederhana
const FLAT_B_RETRACE_MIN = 0.8; // B retrace ≥ 80% A → flat
const ZIGZAG_B_RETRACE_MAX = 0.618; // B retrace ≤ 61.8% A → tegas zigzag

/** Panjang absolut tiap leg koreksi. */
export function correctiveLengths(p: CorrectivePrices): {
  waveA: number;
  waveB: number;
  waveC: number;
} {
  return {
    waveA: Math.abs(p.pA - p.p0),
    waveB: Math.abs(p.pB - p.pA),
    waveC: Math.abs(p.pC - p.pB),
  };
}

/**
 * Validasi + klasifikasi 4 pivot endpoint sebagai koreksi A-B-C.
 *
 * @param direction "down" = koreksi turun (A turun, B naik, C turun) — lazim
 *                  setelah impulse up. "up" = mirror.
 * @returns CorrectiveResult atau null kalau bukan koreksi valid.
 */
export function classifyCorrective(
  pivots: ElliottPivot[],
  direction: CorrectiveDirection,
): CorrectiveResult | null {
  if (pivots.length < 4) return null;

  const [p0, pA, pB, pC] = pivots as [ElliottPivot, ElliottPivot, ElliottPivot, ElliottPivot];

  // Alternation: koreksi down butuh p0=high, A=low, B=high, C=low (dan mirror untuk up).
  const startType = direction === "down" ? "high" : "low";
  if (p0.type !== startType) return null;
  for (let i = 1; i < 4; i += 1) {
    const expected = pivots[i - 1]!.type === "high" ? "low" : "high";
    if (pivots[i]!.type !== expected) return null;
  }

  const prices: CorrectivePrices = {
    p0: p0.price,
    pA: pA.price,
    pB: pB.price,
    pC: pC.price,
  };
  const { waveA, waveB, waveC } = correctiveLengths(prices);

  if (waveA <= 0 || waveC <= 0) return null;

  // Arah leg harus konsisten dengan koreksi.
  if (direction === "down") {
    if (!(pA.price < p0.price)) return null; // A turun
    if (!(pB.price > pA.price)) return null; // B naik (retrace)
    if (!(pC.price < pB.price)) return null; // C turun
  } else {
    if (!(pA.price > p0.price)) return null;
    if (!(pB.price < pA.price)) return null;
    if (!(pC.price > pB.price)) return null;
  }

  const bRetrace = waveB / waveA;

  // B retrace terlalu besar → bukan ABC sederhana.
  if (bRetrace > MAX_B_RETRACE_PCT) return null;

  const reasoning: string[] = [];
  reasoning.push(
    `✓ Tiga leg alternating terbentuk (A-B-C) arah ${direction === "down" ? "koreksi turun" : "koreksi naik"}`,
  );

  // Klasifikasi subtype dari kedalaman retracement Wave B.
  let subtype: CorrectiveSubtype;
  let confidence = 0.45;

  if (bRetrace >= FLAT_B_RETRACE_MIN) {
    subtype = "flat";
    reasoning.push(`✓ Wave B retrace ${(bRetrace * 100).toFixed(0)}% Wave A (≥ 80%) → FLAT (3-3-5)`);
    confidence += 0.15;
    // Flat: C umumnya berakhir dekat ujung A (regular flat) — beri boost bila C ≈ A.
    const cVsA = waveC / waveA;
    if (cVsA >= 0.8 && cVsA <= 1.5) {
      confidence += 0.1;
      reasoning.push(`✓ Wave C = ${cVsA.toFixed(2)}× Wave A (proporsi flat tipikal)`);
    }
  } else {
    subtype = "zigzag";
    if (bRetrace <= ZIGZAG_B_RETRACE_MAX) {
      reasoning.push(
        `✓ Wave B retrace ${(bRetrace * 100).toFixed(0)}% Wave A (≤ 61.8%) → ZIGZAG (5-3-5)`,
      );
      confidence += 0.15;
    } else {
      reasoning.push(
        `Wave B retrace ${(bRetrace * 100).toFixed(0)}% Wave A → ZIGZAG (retrace menengah)`,
      );
      confidence += 0.05;
    }
    // Zigzag: C sering ≈ A (1.0) atau 1.618× A.
    const cVsA = waveC / waveA;
    if (cVsA >= 0.9 && cVsA <= 1.8) {
      confidence += 0.12;
      reasoning.push(`✓ Wave C = ${cVsA.toFixed(2)}× Wave A (proporsi zigzag tipikal 1.0-1.618)`);
    }
  }

  confidence = Math.min(confidence, 0.85);

  const segments: CorrectiveSegment[] = [
    { label: "A", startDate: p0.date, endDate: pA.date, startPrice: p0.price, endPrice: pA.price },
    { label: "B", startDate: pA.date, endDate: pB.date, startPrice: pA.price, endPrice: pB.price },
    { label: "C", startDate: pB.date, endDate: pC.date, startPrice: pB.price, endPrice: pC.price },
  ];

  return {
    direction,
    subtype,
    segments,
    confidence,
    reasoning,
    prices,
    pivots: [p0, pA, pB, pC],
  };
}

/**
 * Coba kedua arah pada 4 pivot terakhir dan pilih kandidat terbaik.
 * Mengambil 4 pivot terakhir (koreksi = posisi terkini yang relevan).
 */
export function detectCorrective(pivots: ElliottPivot[]): CorrectiveResult | null {
  if (pivots.length < 4) return null;
  const last4 = pivots.slice(-4);

  const down = classifyCorrective(last4, "down");
  const up = classifyCorrective(last4, "up");

  if (down && up) return down.confidence >= up.confidence ? down : up;
  return down ?? up ?? null;
}
