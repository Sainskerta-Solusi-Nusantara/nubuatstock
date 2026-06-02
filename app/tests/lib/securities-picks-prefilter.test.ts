import { describe, expect, it } from "vitest";

import { looksLikeRecommendation } from "@/lib/securities-picks/fetch";

/**
 * Unit tests untuk prefilter heuristik `looksLikeRecommendation()` di
 * lib/securities-picks/fetch.ts. Fungsi PURE (tanpa AI/network): butuh hint aksi
 * + minimal satu ticker kapital 3-4 huruf yang BUKAN stopword.
 */
describe("looksLikeRecommendation", () => {
  it("true untuk rekomendasi eksplisit (action hint + ticker)", () => {
    expect(looksLikeRecommendation("BBRI Trading Buy, entry 4200, target 4500")).toBe(true);
    expect(looksLikeRecommendation("Spec Buy ANTM, support 1500 resisten 1700")).toBe(true);
    expect(looksLikeRecommendation("Buy on Weakness TLKM di area 3000")).toBe(true);
    expect(looksLikeRecommendation("Rekomendasi: Akumulasi ASII bertahap")).toBe(true);
    expect(looksLikeRecommendation("GOTO take profit di 80, stop loss 65")).toBe(true);
  });

  it("false untuk market update / berita tanpa action hint", () => {
    expect(looksLikeRecommendation("IHSG ditutup menguat 0.5% ke 7200 hari ini")).toBe(false);
    expect(looksLikeRecommendation("Top gainers hari ini BBRI ANTM TLKM")).toBe(false);
    expect(looksLikeRecommendation("Berita: laba bersih ASII naik YoY")).toBe(false);
  });

  it("false bila ada action hint tapi tidak ada ticker non-stopword", () => {
    // "target" adalah action hint, tapi IHSG/USD/IDR adalah stopword → bukan ticker
    expect(looksLikeRecommendation("IHSG target 7300, USD/IDR stabil")).toBe(false);
    expect(looksLikeRecommendation("target resisten IHSG di 7250")).toBe(false);
  });

  it("false bila ada ticker tapi tidak ada action hint", () => {
    expect(looksLikeRecommendation("BBRI dan ANTM termasuk konstituen LQ45")).toBe(false);
  });

  it("stopword (IHSG/USD/IDR/LQ45) tidak dihitung sebagai ticker", () => {
    // Hanya stopword + action hint → false
    expect(looksLikeRecommendation("Buy IHSG via LQ45 dengan target jangka panjang")).toBe(false);
    // Stopword + ticker valid → true (BMRI bukan stopword)
    expect(looksLikeRecommendation("Buy BMRI, IHSG sedang konsolidasi")).toBe(true);
  });

  it("case-insensitive untuk action hint, tapi ticker harus kapital", () => {
    // action hint lowercase, ticker kapital → true
    expect(looksLikeRecommendation("trading buy BBCA sekarang")).toBe(true);
    // ticker huruf kecil tidak match \b[A-Z]{3,4}\b → false
    expect(looksLikeRecommendation("trading buy bbca sekarang")).toBe(false);
  });

  it("string kosong → false", () => {
    expect(looksLikeRecommendation("")).toBe(false);
  });
});
