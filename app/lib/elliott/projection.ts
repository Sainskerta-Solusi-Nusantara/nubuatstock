/**
 * Elliott Wave — P2 projection & guideline scoring (PURE / deterministik).
 *
 * Spec: ANALISIS_APLIKASI_SAHAM.md §4.1.A komponen 3-4 ("Fibonacci guideline &
 * target projection", "alternation / ratio guideline score", "degree labeling").
 *
 * Modul ini SENGAJA tidak merombak labeler.ts. Ia hanya meng-IMPORT tipe output
 * labeler (`WaveSegment`) dan menghitung:
 *
 *   1. projectTargets()      — level proyeksi harga Fibonacci untuk wave berikutnya
 *                              berdasar struktur wave yang sudah terlabel.
 *   2. guidelineScore()      — skor kualitas wave count 0-100 dari pedoman LUNAK
 *                              (alternation, rasio Fibonacci), BUKAN hard rule.
 *   3. labelDegree()         — degree sederhana (Primary/Intermediate/Minor)
 *                              dari timeframe / panjang swing.
 *
 * Semua fungsi murni (tanpa I/O, deterministik) → mudah di-unit-test.
 */

import type { WaveSegment } from "@/db/schema/elliott";
import type { WaveType } from "@/lib/elliott/labeler";

/** Satu level target proyeksi. */
export interface ProjectionTarget {
  /** Label deskriptif, mis. "Wave 3 target (1.618× W1)". */
  label: string;
  /** Harga proyeksi (rupiah). */
  price: number;
  /** Rasio Fibonacci yang dipakai (mis. 1.618). */
  ratio: number;
}

/** Degree Elliott sederhana. */
export type WaveDegree = "Primary" | "Intermediate" | "Minor";

/** Hasil guideline score lengkap dengan rincian. */
export interface GuidelineScore {
  /** 0-100 — makin tinggi makin "rapi" sesuai pedoman lunak EW. */
  score: number;
  /** Penjelasan tiap komponen yang dinilai. */
  checks: GuidelineCheck[];
}

export interface GuidelineCheck {
  name: string;
  /** Kontribusi poin aktual (bisa 0). */
  points: number;
  /** Poin maksimum komponen ini. */
  maxPoints: number;
  passed: boolean;
  detail: string;
}

/** Panjang absolut (price distance) sebuah segment. */
function segLen(s: WaveSegment): number {
  return Math.abs(s.endPrice - s.startPrice);
}

/** Ambil map label → segment untuk akses cepat. */
function byLabel(waves: WaveSegment[]): Map<string, WaveSegment> {
  const m = new Map<string, WaveSegment>();
  for (const w of waves) m.set(w.label, w);
  return m;
}

/** Arah net sebuah segment: +1 naik, -1 turun. */
function dir(s: WaveSegment): 1 | -1 {
  return s.endPrice >= s.startPrice ? 1 : -1;
}

function round(n: number): number {
  // Harga saham IDX bilangan bulat; bulatkan agar target enak dibaca & deterministik.
  return Math.round(n);
}

/**
 * Proyeksikan level target Fibonacci untuk gelombang BERIKUTNYA berdasar
 * struktur wave terlabel.
 *
 * Heuristik (pedoman EW standar):
 *
 *   IMPULSE (label 1..5):
 *     - Bila Wave 1 & 2 ada tapi Wave 3 belum lengkap → proyeksi Wave 3:
 *         W3 = akhir-W2 ± {1.0, 1.618, 2.618} × panjang W1
 *     - Bila Wave 3 & 4 ada tapi Wave 5 belum lengkap → proyeksi Wave 5:
 *         W5 = akhir-W4 ± {0.618, 1.0, 1.618} × panjang W1
 *     - Bila 5 wave lengkap → proyeksi koreksi pasca-impulse:
 *         retrace {0.382, 0.5, 0.618} × panjang total (akhir-W1 → akhir-W5)
 *
 *   CORRECTIVE (label A/B/C):
 *     - Bila A & B ada tapi C belum → proyeksi Wave C:
 *         C = akhir-B ± {1.0, 1.618} × panjang A
 *     - Bila A-B-C lengkap → proyeksi lanjutan tren (retrace koreksi):
 *         {0.382, 0.618, 1.0} × panjang total koreksi (p0 → akhir-C)
 *
 * @returns Array target terurut sesuai ratio (boleh kosong bila struktur tak cukup).
 */
export function projectTargets(waves: WaveSegment[]): ProjectionTarget[] {
  if (!waves || waves.length === 0) return [];

  const map = byLabel(waves);

  // Deteksi mode dari label yang ada.
  const isImpulse = map.has("1") || map.has("3") || map.has("5");
  const isCorrective = map.has("A") || map.has("B") || map.has("C");

  if (isImpulse) return projectImpulseTargets(map);
  if (isCorrective) return projectCorrectiveTargets(map);
  return [];
}

function projectImpulseTargets(map: Map<string, WaveSegment>): ProjectionTarget[] {
  const w1 = map.get("1");
  const w2 = map.get("2");
  const w3 = map.get("3");
  const w4 = map.get("4");
  const w5 = map.get("5");

  if (!w1) return [];
  const trend = dir(w1); // arah impulse (+1 up / -1 down)
  const w1Len = segLen(w1);
  if (w1Len <= 0) return [];

  // Kasus A: punya W1+W2, BELUM ada W3 → proyeksikan target Wave 3.
  if (w2 && !w3) {
    const base = w2.endPrice;
    return [
      mk("Wave 3 target (1.0× W1)", base + trend * w1Len * 1.0, 1.0),
      mk("Wave 3 target (1.618× W1)", base + trend * w1Len * 1.618, 1.618),
      mk("Wave 3 target (2.618× W1)", base + trend * w1Len * 2.618, 2.618),
    ];
  }

  // Kasus B: punya W3+W4, BELUM ada W5 → proyeksikan target Wave 5.
  if (w3 && w4 && !w5) {
    const base = w4.endPrice;
    return [
      mk("Wave 5 target (0.618× W1)", base + trend * w1Len * 0.618, 0.618),
      mk("Wave 5 target (1.0× W1)", base + trend * w1Len * 1.0, 1.0),
      mk("Wave 5 target (1.618× W1)", base + trend * w1Len * 1.618, 1.618),
    ];
  }

  // Kasus C: 5 wave lengkap → proyeksikan koreksi pasca-impulse (retrace tren).
  if (w5) {
    const impulseStart = w1.startPrice;
    const impulseEnd = w5.endPrice;
    const totalLen = Math.abs(impulseEnd - impulseStart);
    if (totalLen <= 0) return [];
    // Koreksi bergerak melawan tren impulse (kembali turun bila impulse up).
    return [
      mk("Koreksi pasca-impulse (0.382)", impulseEnd - trend * totalLen * 0.382, 0.382),
      mk("Koreksi pasca-impulse (0.5)", impulseEnd - trend * totalLen * 0.5, 0.5),
      mk("Koreksi pasca-impulse (0.618)", impulseEnd - trend * totalLen * 0.618, 0.618),
    ];
  }

  // Fallback: hanya W1 (mungkin sedang W2 retrace) → proyeksikan zona retrace W2.
  if (w1 && !w2) {
    const base = w1.endPrice;
    return [
      mk("Wave 2 retrace (0.382 W1)", base - trend * w1Len * 0.382, 0.382),
      mk("Wave 2 retrace (0.5 W1)", base - trend * w1Len * 0.5, 0.5),
      mk("Wave 2 retrace (0.618 W1)", base - trend * w1Len * 0.618, 0.618),
    ];
  }

  return [];
}

function projectCorrectiveTargets(map: Map<string, WaveSegment>): ProjectionTarget[] {
  const a = map.get("A");
  const b = map.get("B");
  const c = map.get("C");

  if (!a) return [];
  const corrDir = dir(a); // arah net koreksi (+1 up / -1 down)
  const aLen = segLen(a);
  if (aLen <= 0) return [];

  // Punya A+B, belum C → proyeksikan target Wave C.
  if (b && !c) {
    const base = b.endPrice;
    return [
      mk("Wave C target (1.0× A)", base + corrDir * aLen * 1.0, 1.0),
      mk("Wave C target (1.272× A)", base + corrDir * aLen * 1.272, 1.272),
      mk("Wave C target (1.618× A)", base + corrDir * aLen * 1.618, 1.618),
    ];
  }

  // A-B-C lengkap → proyeksikan lanjutan tren utama (retrace koreksi).
  if (c) {
    const corrStart = a.startPrice;
    const corrEnd = c.endPrice;
    const totalLen = Math.abs(corrEnd - corrStart);
    if (totalLen <= 0) return [];
    // Tren utama melawan arah koreksi.
    return [
      mk("Lanjutan tren (0.382 koreksi)", corrEnd - corrDir * totalLen * 0.382, 0.382),
      mk("Lanjutan tren (0.618 koreksi)", corrEnd - corrDir * totalLen * 0.618, 0.618),
      mk("Lanjutan tren (1.0 koreksi)", corrEnd - corrDir * totalLen * 1.0, 1.0),
    ];
  }

  return [];
}

function mk(label: string, price: number, ratio: number): ProjectionTarget {
  return { label, price: round(price), ratio };
}

/**
 * Skor kualitas wave count 0-100 dari pedoman LUNAK Elliott (BUKAN hard rule).
 *
 * Komponen yang dinilai (impulse):
 *   - Wave 2 retrace di golden zone (0.5-0.618 W1)           — 20 poin
 *   - Wave 3 = ekstensi Fibonacci (≈1.618 W1, atau ≥ W1)     — 25 poin
 *   - Wave 4 retrace tipikal (0.236-0.5 W3)                  — 15 poin
 *   - Alternation: Wave 2 vs Wave 4 beda kedalaman retrace   — 20 poin
 *   - Wave 5 ≈ Wave 1 atau 0.618× W1 (equality guideline)    — 20 poin
 *
 * Untuk corrective (A-B-C):
 *   - Wave B retrace sehat (≤ 0.618 zigzag / ~flat)          — 35 poin
 *   - Wave C ≈ Wave A atau 1.618× A                          — 40 poin
 *   - Alternation arah leg benar                             — 25 poin
 *
 * Bila struktur tak dikenal/kurang lengkap → skor proporsional dari komponen
 * yang bisa dinilai.
 */
export function guidelineScore(waves: WaveSegment[], waveType?: WaveType): GuidelineScore {
  const map = byLabel(waves);
  const isImpulse =
    waveType === "impulse_up" ||
    waveType === "impulse_down" ||
    map.has("1") ||
    map.has("3");
  const isCorrective = waveType === "corrective" || map.has("A") || map.has("B");

  if (isImpulse && map.has("1")) return scoreImpulse(map);
  if (isCorrective && map.has("A")) return scoreCorrective(map);

  return { score: 0, checks: [] };
}

function scoreImpulse(map: Map<string, WaveSegment>): GuidelineScore {
  const checks: GuidelineCheck[] = [];
  const w1 = map.get("1")!;
  const w2 = map.get("2");
  const w3 = map.get("3");
  const w4 = map.get("4");
  const w5 = map.get("5");
  const len1 = segLen(w1);

  // 1) Wave 2 golden-zone retrace.
  if (w2 && len1 > 0) {
    const r = segLen(w2) / len1;
    const ok = r >= 0.5 && r <= 0.65;
    const near = r >= 0.382 && r < 0.5;
    const pts = ok ? 20 : near ? 12 : r > 0 && r < 1 ? 5 : 0;
    checks.push({
      name: "Wave 2 retrace",
      points: pts,
      maxPoints: 20,
      passed: ok,
      detail: `Wave 2 retrace ${(r * 100).toFixed(0)}% Wave 1${ok ? " (golden zone 50-61.8%)" : ""}`,
    });
  }

  // 2) Wave 3 extension.
  if (w3 && len1 > 0) {
    const r = segLen(w3) / len1;
    const ok = r >= 1.5 && r <= 2.7;
    const pts = ok ? 25 : r >= 1.0 ? 15 : r > 0 ? 5 : 0;
    checks.push({
      name: "Wave 3 extension",
      points: pts,
      maxPoints: 25,
      passed: ok,
      detail: `Wave 3 = ${r.toFixed(2)}× Wave 1${ok ? " (dekat 1.618 ekstensi)" : ""}`,
    });
  }

  // 3) Wave 4 retrace tipikal.
  if (w3 && w4) {
    const len3 = segLen(w3);
    const r = len3 > 0 ? segLen(w4) / len3 : 0;
    const ok = r >= 0.236 && r <= 0.5;
    const pts = ok ? 15 : r > 0 && r < 0.65 ? 8 : 0;
    checks.push({
      name: "Wave 4 retrace",
      points: pts,
      maxPoints: 15,
      passed: ok,
      detail: `Wave 4 retrace ${(r * 100).toFixed(0)}% Wave 3${ok ? " (tipikal 23.6-50%)" : ""}`,
    });
  }

  // 4) Alternation Wave 2 vs Wave 4 (kedalaman retrace berbeda).
  if (w2 && w4 && w3 && len1 > 0) {
    const r2 = segLen(w2) / len1;
    const r4 = segLen(w4) / segLen(w3);
    const diff = Math.abs(r2 - r4);
    const ok = diff >= 0.15; // satu dalam, satu dangkal → alternation sehat
    const pts = ok ? 20 : diff >= 0.08 ? 10 : 0;
    checks.push({
      name: "Alternation W2/W4",
      points: pts,
      maxPoints: 20,
      passed: ok,
      detail: `Selisih kedalaman retrace W2 vs W4 = ${(diff * 100).toFixed(0)}%${ok ? " (alternation sehat)" : ""}`,
    });
  }

  // 5) Wave 5 equality (≈ W1 atau 0.618× W1).
  if (w5 && len1 > 0) {
    const r = segLen(w5) / len1;
    const okEq = r >= 0.8 && r <= 1.2;
    const okFib = r >= 0.5 && r <= 0.7;
    const pts = okEq || okFib ? 20 : r > 0 ? 8 : 0;
    checks.push({
      name: "Wave 5 equality",
      points: pts,
      maxPoints: 20,
      passed: okEq || okFib,
      detail: `Wave 5 = ${r.toFixed(2)}× Wave 1${okEq ? " (equality ≈1.0)" : okFib ? " (≈0.618)" : ""}`,
    });
  }

  return finalize(checks);
}

function scoreCorrective(map: Map<string, WaveSegment>): GuidelineScore {
  const checks: GuidelineCheck[] = [];
  const a = map.get("A")!;
  const b = map.get("B");
  const c = map.get("C");
  const lenA = segLen(a);

  // 1) Wave B retrace sehat (≤ 1.382× A, di luar itu bukan ABC sederhana).
  if (b && lenA > 0) {
    const r = segLen(b) / lenA;
    const ok = r > 0 && r <= 0.618;
    const flat = r > 0.618 && r <= 1.0;
    const pts = ok ? 35 : flat ? 25 : r > 0 && r <= 1.382 ? 12 : 0;
    checks.push({
      name: "Wave B retrace",
      points: pts,
      maxPoints: 35,
      passed: ok || flat,
      detail: `Wave B retrace ${(r * 100).toFixed(0)}% Wave A${ok ? " (zigzag sehat)" : flat ? " (flat)" : ""}`,
    });
  }

  // 2) Wave C ≈ Wave A atau 1.618× A.
  if (c && lenA > 0) {
    const r = segLen(c) / lenA;
    const okEq = r >= 0.9 && r <= 1.15;
    const okExt = r > 1.15 && r <= 1.8;
    const pts = okEq || okExt ? 40 : r > 0 ? 15 : 0;
    checks.push({
      name: "Wave C proportion",
      points: pts,
      maxPoints: 40,
      passed: okEq || okExt,
      detail: `Wave C = ${r.toFixed(2)}× Wave A${okEq ? " (≈1.0)" : okExt ? " (≈1.618)" : ""}`,
    });
  }

  // 3) Alternation arah leg (A & C searah, B berlawanan).
  if (b && c) {
    const ok = dir(a) === dir(c) && dir(b) !== dir(a);
    checks.push({
      name: "Alternation A-B-C",
      points: ok ? 25 : 0,
      maxPoints: 25,
      passed: ok,
      detail: ok ? "Arah leg A-B-C konsisten (A/C searah, B berlawanan)" : "Arah leg tidak konsisten",
    });
  }

  return finalize(checks);
}

/** Normalisasi poin terkumpul → 0-100 terhadap maxPoints yang dinilai. */
function finalize(checks: GuidelineCheck[]): GuidelineScore {
  if (checks.length === 0) return { score: 0, checks };
  const earned = checks.reduce((s, c) => s + c.points, 0);
  const max = checks.reduce((s, c) => s + c.maxPoints, 0);
  const score = max > 0 ? Math.round((earned / max) * 100) : 0;
  return { score: Math.max(0, Math.min(100, score)), checks };
}

/**
 * Degree labeling sederhana dari timeframe + panjang swing (jumlah bar).
 *
 * Prioritas: timeframe (paling andal). Bila timeframe tak dikenal, fallback ke
 * jangkauan kalender wave (hari) sebagai proksi degree.
 *
 *   - 1M atau swing ≳ 1 tahun  → Primary
 *   - 1W atau swing ≳ 3 bulan  → Intermediate
 *   - selain itu (1D, swing pendek) → Minor
 */
export function labelDegree(timeframe: string | undefined, waves?: WaveSegment[]): WaveDegree {
  const tf = (timeframe ?? "").toUpperCase();
  if (tf === "1M" || tf === "1MO" || tf === "MONTHLY") return "Primary";
  if (tf === "1W" || tf === "WEEKLY") return "Intermediate";
  if (tf === "1D" || tf === "DAILY") return "Minor";

  // Fallback: estimasi dari rentang kalender total wave.
  const days = totalSpanDays(waves);
  if (days >= 330) return "Primary";
  if (days >= 80) return "Intermediate";
  return "Minor";
}

function totalSpanDays(waves?: WaveSegment[]): number {
  if (!waves || waves.length === 0) return 0;
  const first = waves[0]!;
  const last = waves[waves.length - 1]!;
  const start = Date.parse(first.startDate);
  const end = Date.parse(last.endDate);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.abs(end - start) / (1000 * 60 * 60 * 24);
}
