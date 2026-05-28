/**
 * Elliott's 3 hard rules — P0 (validasi impulse 1-2-3-4-5).
 *
 * Spec: ANALISIS_APLIKASI_SAHAM.md §4.1.A komponen 2.
 *
 * Sebuah pola impulse 5-gelombang HARUS memenuhi ketiga aturan keras berikut.
 * Bila salah satu dilanggar, label impulse TIDAK valid (bukan sekadar low
 * confidence — memang bukan impulse).
 *
 *   Rule 1 — Wave 2 tidak boleh retrace > 100% Wave 1.
 *            (Wave 2 tidak boleh menembus titik awal Wave 1.)
 *   Rule 2 — Wave 3 tidak boleh menjadi yang TERPENDEK di antara Wave 1, 3, 5.
 *   Rule 3 — Wave 4 tidak boleh overlap wilayah harga Wave 1
 *            (kecuali diagonal — di luar scope P0).
 *
 * Modul ini murni numerik (tanpa I/O) sehingga mudah di-unit-test.
 */

export type ImpulseDirection = "up" | "down";

/**
 * Enam endpoint harga yang mendefinisikan 5 gelombang impulse.
 *
 *   p0 = awal Wave 1
 *   p1 = akhir Wave 1 (extreme searah trend)
 *   p2 = akhir Wave 2 (retracement)
 *   p3 = akhir Wave 3 (extreme searah trend)
 *   p4 = akhir Wave 4 (retracement)
 *   p5 = akhir Wave 5 (extreme searah trend)
 */
export interface ImpulsePrices {
  p0: number;
  p1: number;
  p2: number;
  p3: number;
  p4: number;
  p5: number;
}

export interface RuleResult {
  passed: boolean;
  message: string;
}

export interface RulesValidation {
  valid: boolean;
  rule1: RuleResult;
  rule2: RuleResult;
  rule3: RuleResult;
  wave1Length: number;
  wave2Length: number;
  wave3Length: number;
  wave4Length: number;
  wave5Length: number;
}

/** Panjang absolut tiap gelombang (price distance). */
export function waveLengths(p: ImpulsePrices): {
  wave1: number;
  wave2: number;
  wave3: number;
  wave4: number;
  wave5: number;
} {
  return {
    wave1: Math.abs(p.p1 - p.p0),
    wave2: Math.abs(p.p2 - p.p1),
    wave3: Math.abs(p.p3 - p.p2),
    wave4: Math.abs(p.p4 - p.p3),
    wave5: Math.abs(p.p5 - p.p4),
  };
}

/**
 * Rule 1: Wave 2 tidak retrace > 100% Wave 1.
 * Setara: panjang Wave 2 < panjang Wave 1 (Wave 2 tidak menembus awal Wave 1).
 */
export function checkRule1(p: ImpulsePrices): RuleResult {
  const { wave1, wave2 } = waveLengths(p);
  // Wave 1 degenerate (panjang 0) → tidak valid sebagai impulse.
  if (wave1 <= 0) {
    return { passed: false, message: "Rule 1 gagal: Wave 1 tidak memiliki panjang" };
  }
  const retracePct = (wave2 / wave1) * 100;
  if (wave2 >= wave1) {
    return {
      passed: false,
      message: `Rule 1 gagal: Wave 2 retrace ${retracePct.toFixed(0)}% (> 100% Wave 1)`,
    };
  }
  return {
    passed: true,
    message: `Rule 1 OK: Wave 2 retrace ${retracePct.toFixed(0)}% (< 100% Wave 1)`,
  };
}

/**
 * Rule 2: Wave 3 bukan yang terpendek di antara Wave 1, 3, 5.
 * Wave 3 boleh sama dengan salah satunya, tapi tidak boleh lebih pendek dari
 * KEDUA Wave 1 dan Wave 5.
 */
export function checkRule2(p: ImpulsePrices): RuleResult {
  const { wave1, wave3, wave5 } = waveLengths(p);
  if (wave3 < wave1 && wave3 < wave5) {
    return {
      passed: false,
      message: "Rule 2 gagal: Wave 3 adalah yang terpendek di antara Wave 1/3/5",
    };
  }
  return { passed: true, message: "Rule 2 OK: Wave 3 bukan yang terpendek" };
}

/**
 * Rule 3: Wave 4 tidak overlap wilayah harga Wave 1.
 *
 * Untuk impulse UP: akhir Wave 4 (p4) harus tetap di atas akhir Wave 1 (p1).
 * Untuk impulse DOWN: akhir Wave 4 (p4) harus tetap di bawah akhir Wave 1 (p1).
 */
export function checkRule3(p: ImpulsePrices, direction: ImpulseDirection): RuleResult {
  if (direction === "up") {
    if (p.p4 <= p.p1) {
      return {
        passed: false,
        message: "Rule 3 gagal: Wave 4 overlap wilayah Wave 1 (turun ke/atas puncak Wave 1)",
      };
    }
  } else {
    if (p.p4 >= p.p1) {
      return {
        passed: false,
        message: "Rule 3 gagal: Wave 4 overlap wilayah Wave 1 (naik ke/bawah dasar Wave 1)",
      };
    }
  }
  return { passed: true, message: "Rule 3 OK: Wave 4 tidak overlap Wave 1" };
}

/**
 * Jalankan ketiga hard rules. `valid` = true hanya bila ketiganya lolos.
 */
export function validateImpulse(p: ImpulsePrices, direction: ImpulseDirection): RulesValidation {
  const rule1 = checkRule1(p);
  const rule2 = checkRule2(p);
  const rule3 = checkRule3(p, direction);
  const lengths = waveLengths(p);
  return {
    valid: rule1.passed && rule2.passed && rule3.passed,
    rule1,
    rule2,
    rule3,
    wave1Length: lengths.wave1,
    wave2Length: lengths.wave2,
    wave3Length: lengths.wave3,
    wave4Length: lengths.wave4,
    wave5Length: lengths.wave5,
  };
}
