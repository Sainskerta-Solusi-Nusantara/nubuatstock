import { describe, expect, it } from "vitest";
import {
  checkRule1,
  checkRule2,
  checkRule3,
  validateImpulse,
  waveLengths,
  type ImpulsePrices,
} from "@/lib/elliott/rules";

/**
 * Tests untuk Elliott's 3 hard rules (lib/elliott/rules.ts).
 *
 * Strategi: pakai harga endpoint sintetis yang eksplisit agar tiap rule bisa
 * diuji terisolasi — satu kasus VALID (semua lolos) + satu kasus pelanggaran
 * untuk MASING-MASING dari ketiga rule.
 */

// Impulse UP yang sehat:
//   W1: 100 -> 120  (panjang 20)
//   W2: 120 -> 110  (retrace 50% W1)
//   W3: 110 -> 160  (panjang 50, terpanjang)
//   W4: 160 -> 145  (tidak overlap W1 = 120)
//   W5: 145 -> 175
const validUp: ImpulsePrices = {
  p0: 100,
  p1: 120,
  p2: 110,
  p3: 160,
  p4: 145,
  p5: 175,
};

describe("lib/elliott/rules — waveLengths", () => {
  it("menghitung panjang absolut tiap gelombang", () => {
    const l = waveLengths(validUp);
    expect(l.wave1).toBe(20);
    expect(l.wave2).toBe(10);
    expect(l.wave3).toBe(50);
    expect(l.wave4).toBe(15);
    expect(l.wave5).toBe(30);
  });
});

describe("lib/elliott/rules — kasus VALID", () => {
  it("impulse up yang sehat lolos ketiga hard rules", () => {
    const v = validateImpulse(validUp, "up");
    expect(v.rule1.passed).toBe(true);
    expect(v.rule2.passed).toBe(true);
    expect(v.rule3.passed).toBe(true);
    expect(v.valid).toBe(true);
  });

  it("impulse down (mirror) yang sehat lolos ketiga hard rules", () => {
    // Mirror dari validUp di sekitar harga.
    const validDown: ImpulsePrices = {
      p0: 175,
      p1: 155,
      p2: 165,
      p3: 115,
      p4: 130,
      p5: 100,
    };
    const v = validateImpulse(validDown, "down");
    expect(v.valid).toBe(true);
  });
});

describe("lib/elliott/rules — Rule 1 (Wave 2 ≤ 100% Wave 1)", () => {
  it("gagal saat Wave 2 retrace > 100% Wave 1", () => {
    // W1: 100->120 (20). W2 turun ke 99 (panjang 21 > 20) → tembus awal W1.
    const bad: ImpulsePrices = { ...validUp, p2: 99 };
    const r = checkRule1(bad);
    expect(r.passed).toBe(false);
    expect(validateImpulse(bad, "up").valid).toBe(false);
  });

  it("gagal saat Wave 1 tidak punya panjang (degenerate)", () => {
    const r = checkRule1({ ...validUp, p0: 120, p1: 120 });
    expect(r.passed).toBe(false);
  });

  it("lolos saat Wave 2 retrace tepat di bawah 100%", () => {
    const r = checkRule1({ ...validUp, p2: 100.5 });
    expect(r.passed).toBe(true);
  });
});

describe("lib/elliott/rules — Rule 2 (Wave 3 bukan terpendek)", () => {
  it("gagal saat Wave 3 adalah yang terpendek di antara 1/3/5", () => {
    // W1 = 20, W5 = 30, jadikan W3 = 5 (terpendek).
    // p2=110, p3=115 → W3 = 5; p4 harus tetap > p1(120) untuk isolasi rule 2,
    // tapi p3=115 < 120 akan memicu masalah arah. Gunakan susunan eksplisit:
    //   W1: 100->120 (20), W2: 120->110 (10), W3: 110->113 (3 terpendek),
    //   W4: 113->? — agar tidak melanggar rule 3 (W4>120) butuh naik, mustahil.
    // Maka uji Rule 2 secara terisolasi lewat checkRule2 langsung.
    const bad: ImpulsePrices = { p0: 100, p1: 120, p2: 110, p3: 113, p4: 111, p5: 160 };
    const r = checkRule2(bad);
    expect(r.passed).toBe(false);
  });

  it("lolos saat Wave 3 sama dengan Wave 1 (tidak lebih pendek dari keduanya)", () => {
    const r = checkRule2({ p0: 100, p1: 120, p2: 110, p3: 130, p4: 125, p5: 135 });
    // W1 = 20, W3 = 20, W5 = 10 → W3 tidak < W1 dan tidak < W5 → lolos.
    expect(r.passed).toBe(true);
  });
});

describe("lib/elliott/rules — Rule 3 (Wave 4 tidak overlap Wave 1)", () => {
  it("gagal (up) saat akhir Wave 4 turun ke/atas akhir Wave 1", () => {
    // p1 = 120; set p4 = 118 (< 120) → overlap.
    const bad: ImpulsePrices = { ...validUp, p4: 118 };
    const r = checkRule3(bad, "up");
    expect(r.passed).toBe(false);
    expect(validateImpulse(bad, "up").valid).toBe(false);
  });

  it("gagal (down) saat akhir Wave 4 naik ke/bawah akhir Wave 1", () => {
    const validDown: ImpulsePrices = { p0: 175, p1: 155, p2: 165, p3: 115, p4: 130, p5: 100 };
    // p1 = 155; set p4 = 157 (> 155) → overlap untuk downtrend.
    const r = checkRule3({ ...validDown, p4: 157 }, "down");
    expect(r.passed).toBe(false);
  });

  it("lolos (up) saat Wave 4 tetap di atas akhir Wave 1", () => {
    expect(checkRule3(validUp, "up").passed).toBe(true);
  });
});
