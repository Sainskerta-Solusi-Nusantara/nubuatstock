import { describe, expect, it } from "vitest";
import {
  selectDripStage,
  resolveTrialStartedAt,
  readDripSent,
  type DripSentMap,
} from "@/worker/jobs/trial-drip";

/**
 * Unit tests untuk pure logic pemilihan stage drip campaign trial → paid
 * (IMPROVEMENT_PLAN §8.5 #35). Trial 1 hari → tahap berbasis JAM (h6/h14/h20).
 * Tanpa DB / I/O — mirror perilaku worker trial-drip.
 */

const HOUR = 3_600_000;

function atH(start: Date, hours: number): Date {
  return new Date(start.getTime() + hours * HOUR);
}

describe("selectDripStage", () => {
  const trialStartedAt = new Date("2026-01-01T02:00:00Z"); // 09:00 WIB
  const trialEndsAt = atH(trialStartedAt, 24); // trial 1 hari

  it("tidak kirim apa pun sebelum jam ke-6", () => {
    for (const h of [0, 3, 5]) {
      expect(
        selectDripStage({
          now: atH(trialStartedAt, h),
          trialStartedAt,
          trialEndsAt,
          alreadySent: {},
        }),
      ).toBeNull();
    }
  });

  it("kirim h6 di jam ke-6", () => {
    expect(
      selectDripStage({
        now: atH(trialStartedAt, 6),
        trialStartedAt,
        trialEndsAt,
        alreadySent: {},
      }),
    ).toBe("h6");
  });

  it("kirim h14 di jam ke-14 kalau h6 sudah terkirim", () => {
    expect(
      selectDripStage({
        now: atH(trialStartedAt, 14),
        trialStartedAt,
        trialEndsAt,
        alreadySent: { h6: "2026-01-01T08:00:00Z" },
      }),
    ).toBe("h14");
  });

  it("kirim h20 di jam ke-20 kalau h6 & h14 sudah terkirim", () => {
    expect(
      selectDripStage({
        now: atH(trialStartedAt, 20),
        trialStartedAt,
        trialEndsAt,
        alreadySent: { h6: "x", h14: "y" },
      }),
    ).toBe("h20");
  });

  it("idempotent: tidak kirim ulang stage yang sudah terkirim di jam yang sama", () => {
    expect(
      selectDripStage({
        now: atH(trialStartedAt, 6),
        trialStartedAt,
        trialEndsAt,
        alreadySent: { h6: "already" },
      }),
    ).toBeNull();
  });

  it("kalau job skip beberapa jam, kirim stage terbaru yang eligible (bukan menumpuk)", () => {
    // Sampai jam ke-20 belum ada yang terkirim → langsung h20, bukan h6.
    expect(
      selectDripStage({
        now: atH(trialStartedAt, 20),
        trialStartedAt,
        trialEndsAt,
        alreadySent: {},
      }),
    ).toBe("h20");
  });

  it("tidak kirim apa pun setelah trial berakhir", () => {
    expect(
      selectDripStage({
        now: atH(trialStartedAt, 24),
        trialStartedAt,
        trialEndsAt,
        alreadySent: {},
      }),
    ).toBeNull();
    expect(
      selectDripStage({
        now: atH(trialStartedAt, 30),
        trialStartedAt,
        trialEndsAt,
        alreadySent: { h6: "x", h14: "y" },
      }),
    ).toBeNull();
  });

  it("semua stage terkirim → null", () => {
    const alreadySent: DripSentMap = { h6: "a", h14: "b", h20: "c" };
    expect(
      selectDripStage({
        now: atH(trialStartedAt, 20),
        trialStartedAt,
        trialEndsAt,
        alreadySent,
      }),
    ).toBeNull();
  });

  it("now sebelum trial start (clock skew) → null", () => {
    expect(
      selectDripStage({
        now: atH(trialStartedAt, -1),
        trialStartedAt,
        trialEndsAt,
        alreadySent: {},
      }),
    ).toBeNull();
  });

  it("jam ke-8 (gap antara h6 dan h14), h6 sudah terkirim → null sampai h14", () => {
    expect(
      selectDripStage({
        now: atH(trialStartedAt, 8),
        trialStartedAt,
        trialEndsAt,
        alreadySent: { h6: "x" },
      }),
    ).toBeNull();
  });
});

describe("resolveTrialStartedAt", () => {
  const startedAt = new Date("2026-02-01T00:00:00Z");

  it("pakai metadata.trialStartedAt kalau valid ISO string", () => {
    const meta = { trialStartedAt: "2026-02-03T05:00:00Z" };
    expect(resolveTrialStartedAt(meta, startedAt).toISOString()).toBe("2026-02-03T05:00:00.000Z");
  });

  it("fallback ke startedAt kalau metadata kosong / invalid", () => {
    expect(resolveTrialStartedAt(null, startedAt)).toEqual(startedAt);
    expect(resolveTrialStartedAt({}, startedAt)).toEqual(startedAt);
    expect(resolveTrialStartedAt({ trialStartedAt: "not-a-date" }, startedAt)).toEqual(startedAt);
    expect(resolveTrialStartedAt({ trialStartedAt: 123 }, startedAt)).toEqual(startedAt);
  });
});

describe("readDripSent", () => {
  it("baca map dripSent dari metadata", () => {
    expect(readDripSent({ dripSent: { h6: "x" } })).toEqual({ h6: "x" });
  });

  it("default empty map kalau tidak ada / bukan object", () => {
    expect(readDripSent(null)).toEqual({});
    expect(readDripSent({})).toEqual({});
    expect(readDripSent({ dripSent: "nope" })).toEqual({});
  });
});
