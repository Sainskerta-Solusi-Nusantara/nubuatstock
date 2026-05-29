import { describe, expect, it } from "vitest";
import {
  selectDripStage,
  resolveTrialStartedAt,
  readDripSent,
  type DripSentMap,
} from "@/worker/jobs/trial-drip";

/**
 * Unit tests untuk pure logic pemilihan stage drip campaign trial → paid
 * (IMPROVEMENT_PLAN §8.5 #35). Tanpa DB / I/O — mirror perilaku
 * worker trial-drip.
 */

const DAY = 86_400_000;

function at(start: Date, days: number): Date {
  return new Date(start.getTime() + days * DAY);
}

describe("selectDripStage", () => {
  const trialStartedAt = new Date("2026-01-01T02:00:00Z"); // 09:00 WIB
  const trialEndsAt = at(trialStartedAt, 7); // 7 hari trial

  it("tidak kirim apa pun sebelum hari ke-3", () => {
    for (const d of [0, 1, 2]) {
      expect(
        selectDripStage({
          now: at(trialStartedAt, d),
          trialStartedAt,
          trialEndsAt,
          alreadySent: {},
        }),
      ).toBeNull();
    }
  });

  it("kirim d3 di hari ke-3", () => {
    expect(
      selectDripStage({
        now: at(trialStartedAt, 3),
        trialStartedAt,
        trialEndsAt,
        alreadySent: {},
      }),
    ).toBe("d3");
  });

  it("kirim d5 di hari ke-5 kalau d3 sudah terkirim", () => {
    expect(
      selectDripStage({
        now: at(trialStartedAt, 5),
        trialStartedAt,
        trialEndsAt,
        alreadySent: { d3: "2026-01-04T02:00:00Z" },
      }),
    ).toBe("d5");
  });

  it("kirim d6 di hari ke-6 kalau d3 & d5 sudah terkirim", () => {
    expect(
      selectDripStage({
        now: at(trialStartedAt, 6),
        trialStartedAt,
        trialEndsAt,
        alreadySent: { d3: "x", d5: "y" },
      }),
    ).toBe("d6");
  });

  it("idempotent: tidak kirim ulang stage yang sudah terkirim di hari yang sama", () => {
    expect(
      selectDripStage({
        now: at(trialStartedAt, 3),
        trialStartedAt,
        trialEndsAt,
        alreadySent: { d3: "already" },
      }),
    ).toBeNull();
  });

  it("kalau job skip beberapa hari, kirim stage terbaru yang eligible (bukan menumpuk)", () => {
    // Sampai hari ke-6 belum ada yang terkirim → langsung d6, bukan d3.
    expect(
      selectDripStage({
        now: at(trialStartedAt, 6),
        trialStartedAt,
        trialEndsAt,
        alreadySent: {},
      }),
    ).toBe("d6");
  });

  it("tidak kirim apa pun setelah trial berakhir", () => {
    expect(
      selectDripStage({
        now: at(trialStartedAt, 7),
        trialStartedAt,
        trialEndsAt,
        alreadySent: {},
      }),
    ).toBeNull();
    expect(
      selectDripStage({
        now: at(trialStartedAt, 10),
        trialStartedAt,
        trialEndsAt,
        alreadySent: { d3: "x", d5: "y" },
      }),
    ).toBeNull();
  });

  it("semua stage terkirim → null", () => {
    const alreadySent: DripSentMap = { d3: "a", d5: "b", d6: "c" };
    expect(
      selectDripStage({
        now: at(trialStartedAt, 6),
        trialStartedAt,
        trialEndsAt,
        alreadySent,
      }),
    ).toBeNull();
  });

  it("now sebelum trial start (clock skew) → null", () => {
    expect(
      selectDripStage({
        now: at(trialStartedAt, -1),
        trialStartedAt,
        trialEndsAt,
        alreadySent: {},
      }),
    ).toBeNull();
  });

  it("hari ke-4 (gap antara d3 dan d5), d3 sudah terkirim → null sampai d5", () => {
    expect(
      selectDripStage({
        now: at(trialStartedAt, 4),
        trialStartedAt,
        trialEndsAt,
        alreadySent: { d3: "x" },
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
    expect(readDripSent({ dripSent: { d3: "x" } })).toEqual({ d3: "x" });
  });

  it("default empty map kalau tidak ada / bukan object", () => {
    expect(readDripSent(null)).toEqual({});
    expect(readDripSent({})).toEqual({});
    expect(readDripSent({ dripSent: "nope" })).toEqual({});
  });
});
