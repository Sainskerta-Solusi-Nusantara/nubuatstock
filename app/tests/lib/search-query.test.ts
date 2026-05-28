import { describe, expect, it } from "vitest";

import {
  TRGM_KODE_THRESHOLD,
  TRGM_NAME_THRESHOLD,
  escapeLikePattern,
  looksLikeTicker,
  normalizeSearchQuery,
  rankTier,
} from "@/lib/companies/search-query";

/**
 * Unit tests untuk bagian PURE dari typo-tolerant search (IMPROVEMENT_PLAN §8.4 #26).
 * SQL trigram (similarity/index) di-skip (butuh Postgres + pg_trgm) — dites manual /
 * integration. Di sini fokus normalisasi input, heuristik, escaping, & scoring.
 */
describe("normalizeSearchQuery", () => {
  it("trims dan collapse whitespace internal", () => {
    expect(normalizeSearchQuery("  bank   bca  ")).toBe("bank bca");
    expect(normalizeSearchQuery("BBRI")).toBe("BBRI");
  });

  it("mengubah tab/newline jadi single space", () => {
    expect(normalizeSearchQuery("bank\t\nbca")).toBe("bank bca");
  });

  it("return empty string untuk input kosong / whitespace only", () => {
    expect(normalizeSearchQuery("")).toBe("");
    expect(normalizeSearchQuery("    ")).toBe("");
  });

  it("mempertahankan case (caller yang uppercase)", () => {
    expect(normalizeSearchQuery("Tlkom")).toBe("Tlkom");
  });
});

describe("looksLikeTicker", () => {
  it("true untuk kode alfanumerik pendek tanpa spasi", () => {
    expect(looksLikeTicker("BBRI")).toBe(true);
    expect(looksLikeTicker("BBR")).toBe(true);
    expect(looksLikeTicker("TLKOM")).toBe(true);
    expect(looksLikeTicker("GOTO")).toBe(true);
    expect(looksLikeTicker("a")).toBe(true);
  });

  it("false untuk frasa nama / panjang > 6 / ada spasi", () => {
    expect(looksLikeTicker("bank bca")).toBe(false);
    expect(looksLikeTicker("telkom indonesia")).toBe(false);
    expect(looksLikeTicker("ABCDEFG")).toBe(false);
    expect(looksLikeTicker("")).toBe(false);
  });
});

describe("escapeLikePattern", () => {
  it("escape wildcard pg supaya input bukan wildcard liar", () => {
    expect(escapeLikePattern("50%")).toBe("50\\%");
    expect(escapeLikePattern("a_b")).toBe("a\\_b");
    expect(escapeLikePattern("c\\d")).toBe("c\\\\d");
  });

  it("biarkan teks normal apa adanya", () => {
    expect(escapeLikePattern("BBRI")).toBe("BBRI");
    expect(escapeLikePattern("bank bca")).toBe("bank bca");
  });
});

describe("rankTier", () => {
  it("0 = exact, 1 = prefix, 2 = lainnya (typo/contains)", () => {
    expect(rankTier({ kode: "BBRI", queryUpper: "BBRI" })).toBe(0);
    expect(rankTier({ kode: "BBRI", queryUpper: "BBR" })).toBe(1);
    expect(rankTier({ kode: "BBRI", queryUpper: "BRI" })).toBe(2);
  });
});

describe("thresholds", () => {
  it("kode threshold lebih longgar dari nama (ticker pendek)", () => {
    expect(TRGM_KODE_THRESHOLD).toBeLessThanOrEqual(TRGM_NAME_THRESHOLD);
    expect(TRGM_KODE_THRESHOLD).toBeGreaterThan(0);
    expect(TRGM_NAME_THRESHOLD).toBeLessThanOrEqual(1);
  });
});
