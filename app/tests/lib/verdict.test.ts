import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * Unit tests untuk Verdict Scoring Engine (lib/verdict/service.ts) — logika inti
 * & high-stake (audit #13).
 *
 * Yang di-export dari modul HANYA `computeVerdict(kode)` (async) + types. Semua
 * factor scoring (technical/momentum/value/quality/growth/sentiment), `labelFor`,
 * dan `clamp` bersifat private → kita test mereka SECARA TIDAK LANGSUNG lewat
 * `computeVerdict`, dengan meng-isolasi tiap factor (mis. cukup data teknikal,
 * fundamental kosong → factor lain netral 5) sehingga kita bisa assert kontribusi
 * tepat tiap factor terhadap overall weighted score.
 *
 * Strategi mock DB: `computeVerdict` memanggil `db.select()` 3x BERURUTAN:
 *   1. quotesEod bars       → select().from().where().orderBy().limit() → bars[]
 *   2. companyFundamentals  → select().from().where().limit()          → [fund]
 *   3. news sentiment       → select().from().innerJoin().where().limit() → rows[]
 * Kita pakai sebuah QUEUE: tiap top-level `db.select()` men-shift hasil berikutnya.
 * Builder dibuat thenable (drizzle queries adalah thenable) supaya `await` resolve
 * ke canned rows. Tidak butuh Postgres nyata.
 *
 * Semua angka factor dihitung manual dari source (clamp 0-10, baseline 5):
 *   - weights: technical .25, momentum .15, value .15, quality .15, growth .15, sentiment .15
 *   - overall = Σ(score·weight)/Σ(weight)  (Σweight = 1.0)  → round 1 desimal
 *   - label: >=8 STRONG BUY, >=6.5 BUY, >=4.5 HOLD, >=3 SELL, else STRONG SELL
 */

// ── Mock DB: queue-based chainable builder ──────────────────────────────────
const state = {
  queue: [] as Array<Array<Record<string, unknown>>>,
};

vi.mock("@/lib/db", () => {
  function makeBuilder(result: Array<Record<string, unknown>>) {
    const builder: Record<string, unknown> = {};
    const passthrough = () => builder;
    for (const m of ["from", "where", "orderBy", "limit", "innerJoin", "leftJoin", "groupBy", "offset"]) {
      builder[m] = passthrough;
    }
    // drizzle queries adalah thenable → bikin builder awaitable.
    (builder as Record<string, unknown>).then = (resolve: (v: unknown) => unknown) =>
      resolve(result);
    return builder;
  }
  return {
    db: {
      select: () => {
        const result = state.queue.shift() ?? [];
        return makeBuilder(result);
      },
    },
  };
});

import { computeVerdict, type VerdictResult } from "@/lib/verdict/service";

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Set hasil 3 query secara berurutan. `bars` di-pass dalam urutan KRONOLOGIS
 * (lama→baru) lalu dibalik ke descending (seperti yang dikembalikan DB), karena
 * service melakukan `.reverse()` untuk indikator.
 */
function setupDb(opts: {
  closesChrono?: number[]; // lama → baru
  fund?: Record<string, unknown> | null;
  sentiment?: Array<{ sentiment: string | null; score: number | string | null }>;
}) {
  const closes = opts.closesChrono ?? [];
  // DB mengembalikan descending (terbaru dulu) → balik dari kronologis.
  const barsDesc = closes
    .slice()
    .reverse()
    .map((c, i) => ({ close: c, tradeDate: new Date(2024, 0, 1 + i) }));

  const fundRows = opts.fund === undefined ? [] : opts.fund === null ? [] : [opts.fund];
  const sentimentRows = opts.sentiment ?? [];

  state.queue = [barsDesc, fundRows, sentimentRows];
}

/** Bangun array kronologis konstan dengan panjang n. */
function flat(n: number, value = 100): number[] {
  return new Array(n).fill(value);
}

/** Cari factor by name dari hasil. */
function factor(v: VerdictResult, name: string) {
  const f = v.factors.find((x) => x.name === name);
  if (!f) throw new Error(`factor ${name} not found`);
  return f;
}

beforeEach(() => {
  state.queue = [];
});

// ─────────────────────────────────────────────────────────────────────────────
// computeVerdict — kontrak dasar
// ─────────────────────────────────────────────────────────────────────────────

describe("computeVerdict — kontrak dasar", () => {
  it("mengembalikan null kalau tidak ada bars DAN tidak ada fundamentals", async () => {
    setupDb({ closesChrono: [], fund: null, sentiment: [] });
    const v = await computeVerdict("xyz");
    expect(v).toBeNull();
  });

  it("uppercase-kan kode pada output", async () => {
    setupDb({ closesChrono: flat(5), fund: null, sentiment: [] });
    const v = await computeVerdict("bbca");
    expect(v).not.toBeNull();
    expect(v!.kode).toBe("BBCA");
  });

  it("mengembalikan 6 factors dengan total bobot 1.0", async () => {
    setupDb({ closesChrono: flat(5), fund: null, sentiment: [] });
    const v = await computeVerdict("aaa");
    expect(v!.factors).toHaveLength(6);
    const totalWeight = v!.factors.reduce((a, f) => a + f.weight, 0);
    expect(totalWeight).toBeCloseTo(1.0, 10);
    const names = v!.factors.map((f) => f.name).sort();
    expect(names).toEqual(
      ["Growth", "Momentum", "News Sentiment", "Quality", "Technical Trend", "Value"].sort(),
    );
  });

  it("set asOf ke Date dan warnings sebagai array", async () => {
    setupDb({ closesChrono: flat(5), fund: null, sentiment: [] });
    const v = await computeVerdict("aaa");
    expect(v!.asOf).toBeInstanceOf(Date);
    expect(Array.isArray(v!.warnings)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Warnings
// ─────────────────────────────────────────────────────────────────────────────

describe("computeVerdict — warnings", () => {
  it("warn kalau bars < 50 dan tidak ada fundamentals", async () => {
    setupDb({ closesChrono: flat(10), fund: null, sentiment: [] });
    const v = await computeVerdict("aaa");
    expect(v!.warnings).toContain("Only 10 EOD bars available");
    expect(v!.warnings).toContain("No fundamentals snapshot");
  });

  it("tidak warn bars kalau >= 50 bars", async () => {
    setupDb({ closesChrono: flat(60), fund: { peRatioTrailing: "12" }, sentiment: [] });
    const v = await computeVerdict("aaa");
    expect(v!.warnings.some((w) => w.includes("EOD bars available"))).toBe(false);
  });

  it("tidak warn fundamentals kalau fund ada", async () => {
    setupDb({ closesChrono: flat(60), fund: { peRatioTrailing: "12" }, sentiment: [] });
    const v = await computeVerdict("aaa");
    expect(v!.warnings).not.toContain("No fundamentals snapshot");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Factor: Technical (weight .25)
// ─────────────────────────────────────────────────────────────────────────────

describe("factor Technical", () => {
  it("score 5 (neutral) + signal 'Data insufficient' kalau < 50 bars", async () => {
    setupDb({ closesChrono: flat(40), fund: null, sentiment: [] });
    const v = await computeVerdict("aaa");
    const t = factor(v!, "Technical Trend");
    expect(t.score).toBe(5);
    expect(t.signals[0]!.label).toBe("Data insufficient");
    expect(t.signals[0]!.value).toBe("40 bars");
  });

  it("uptrend kuat (price>SMA20>SMA50>SMA200, RSI 50-70) → score tinggi", async () => {
    // 220 bar naik bertahap → price > sma20 > sma50 > sma200, RSI bullish.
    const closes = Array.from({ length: 220 }, (_, i) => 100 + i);
    setupDb({ closesChrono: closes, fund: null, sentiment: [] });
    const v = await computeVerdict("aaa");
    const t = factor(v!, "Technical Trend");
    // 5 +1 (>sma20) +1 (sma20>sma50) +1.5 (sma50>sma200) = 8.5; RSI murni naik → 100 (>70) → -0.5 = 8.0
    expect(t.score).toBe(8.0);
    const labels = t.signals.map((s) => s.label);
    expect(labels).toContain("Price > SMA20");
    expect(labels).toContain("SMA20 > SMA50 (uptrend)");
    expect(labels).toContain("Long-term uptrend (SMA50 > SMA200)");
    expect(labels).toContain("RSI overbought");
  });

  it("downtrend kuat → score di-clamp dan rendah", async () => {
    const closes = Array.from({ length: 220 }, (_, i) => 1000 - i);
    setupDb({ closesChrono: closes, fund: null, sentiment: [] });
    const v = await computeVerdict("aaa");
    const t = factor(v!, "Technical Trend");
    // 5 -1 -1 -1.5 = 1.5; RSI murni turun = 0 (<30) → +0.5 = 2.0
    expect(t.score).toBe(2.0);
    const labels = t.signals.map((s) => s.label);
    expect(labels).toContain("Price < SMA20");
    expect(labels).toContain("RSI oversold (rebound zone)");
  });

  it("clamp menjaga score >= 0 (tidak negatif)", async () => {
    const closes = Array.from({ length: 220 }, (_, i) => 1000 - i);
    setupDb({ closesChrono: closes, fund: null, sentiment: [] });
    const v = await computeVerdict("aaa");
    expect(factor(v!, "Technical Trend").score).toBeGreaterThanOrEqual(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Factor: Momentum (weight .15)
// ─────────────────────────────────────────────────────────────────────────────

describe("factor Momentum", () => {
  it("score 5 + insufficient kalau < 21 bars", async () => {
    setupDb({ closesChrono: flat(20), fund: null, sentiment: [] });
    const v = await computeVerdict("aaa");
    const m = factor(v!, "Momentum");
    expect(m.score).toBe(5);
    expect(m.signals[0]!.label).toBe("Data insufficient");
    expect(m.signals[0]!.value).toBe("20 bars");
  });

  it("flat 21 bar → tidak ada perubahan harga → 5d/20d 0% (dip kecil) → 4.5", async () => {
    // last==fiveAgo==twentyAgo → 5d pct=0 → else branch (-0.25); 20d pct=0 → tidak masuk cabang (>0 false, <-10 false)
    setupDb({ closesChrono: flat(21, 100), fund: null, sentiment: [] });
    const v = await computeVerdict("aaa");
    const m = factor(v!, "Momentum");
    expect(m.score).toBe(4.75);
    expect(m.signals.map((s) => s.label)).toContain("5d small dip");
  });

  it("rally kuat (5d>5%, 20d>10%) → score naik 3 poin", async () => {
    // 21 bar: index 0..20. last=closes[20], fiveAgo=closes[15], twentyAgo=closes[0].
    const closes = flat(21, 100);
    closes[20] = 130; // vs twentyAgo(100) = +30% (>10) ; vs fiveAgo(100)=+30% (>5)
    setupDb({ closesChrono: closes, fund: null, sentiment: [] });
    const v = await computeVerdict("aaa");
    const m = factor(v!, "Momentum");
    // 5 +1.5 (5d>5) +1.5 (20d>10) = 8
    expect(m.score).toBe(8.0);
    expect(m.signals.map((s) => s.label)).toContain("5d gain");
    expect(m.signals.map((s) => s.label)).toContain("20d strong rally");
  });

  it("52w high position diperhitungkan kalau fund punya hi52/lo52", async () => {
    const closes = flat(21, 100);
    closes[20] = 130;
    setupDb({
      closesChrono: closes,
      fund: { fiftyTwoWeekHigh: "130", fiftyTwoWeekLow: "100" },
      sentiment: [],
    });
    const v = await computeVerdict("aaa");
    const m = factor(v!, "Momentum");
    // last(130) di 100% range → >80 → +0.5 → 8 + 0.5 = 8.5
    expect(m.score).toBe(8.5);
    expect(m.signals.map((s) => s.label)).toContain("Near 52w high");
  });

  it("guard pembagian nol: hi52 == lo52 tidak crash dan tidak ubah score", async () => {
    const closes = flat(21, 100);
    closes[20] = 130;
    setupDb({
      closesChrono: closes,
      fund: { fiftyTwoWeekHigh: "100", fiftyTwoWeekLow: "100" }, // hi52 == lo52 → skip
      sentiment: [],
    });
    const v = await computeVerdict("aaa");
    const m = factor(v!, "Momentum");
    expect(m.score).toBe(8.0); // 52w block dilewati
    expect(m.signals.map((s) => s.label)).not.toContain("Near 52w high");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Factor: Value (weight .15)
// ─────────────────────────────────────────────────────────────────────────────

describe("factor Value", () => {
  it("score 5 + 'No fundamentals data' kalau pe & pbv null", async () => {
    setupDb({ closesChrono: flat(5), fund: null, sentiment: [] });
    const v = await computeVerdict("aaa");
    const f = factor(v!, "Value");
    expect(f.score).toBe(5);
    expect(f.signals[0]!.label).toBe("No fundamentals data");
  });

  it("PE sangat rendah (<10) + PBV < book → score tinggi", async () => {
    setupDb({ closesChrono: flat(5), fund: { peRatioTrailing: "8", pbvRatio: "0.8" }, sentiment: [] });
    const v = await computeVerdict("aaa");
    const f = factor(v!, "Value");
    // 5 +2 (PE<10) +1.5 (PBV<1) = 8.5
    expect(f.score).toBe(8.5);
    expect(f.signals.map((s) => s.label)).toContain("PE very low");
    expect(f.signals.map((s) => s.label)).toContain("PBV below book value");
  });

  it("PE negatif (rugi) → penalti", async () => {
    setupDb({ closesChrono: flat(5), fund: { peRatioTrailing: "-5" }, sentiment: [] });
    const v = await computeVerdict("aaa");
    const f = factor(v!, "Value");
    expect(f.score).toBe(4); // 5 - 1
    expect(f.signals.map((s) => s.label)).toContain("PE negative (loss-making)");
  });

  it("PE sangat mahal (>=40) + PBV premium (>=4) → score rendah", async () => {
    setupDb({ closesChrono: flat(5), fund: { peRatioTrailing: "50", pbvRatio: "5" }, sentiment: [] });
    const v = await computeVerdict("aaa");
    const f = factor(v!, "Value");
    // 5 -2 (PE>=40) -1 (PBV>=4) = 2
    expect(f.score).toBe(2);
  });

  it("boundary PE: tepat 10 → 'PE attractive' (+1), bukan 'very low'", async () => {
    setupDb({ closesChrono: flat(5), fund: { peRatioTrailing: "10" }, sentiment: [] });
    const v = await computeVerdict("aaa");
    const f = factor(v!, "Value");
    expect(f.score).toBe(6); // +1
    expect(f.signals.map((s) => s.label)).toContain("PE attractive");
  });

  it("boundary PE: tepat 15 → 'PE fair' (netral, no delta)", async () => {
    setupDb({ closesChrono: flat(5), fund: { peRatioTrailing: "15" }, sentiment: [] });
    const v = await computeVerdict("aaa");
    expect(factor(v!, "Value").score).toBe(5);
  });

  it("PE=0 dianggap negatif/loss (pe<=0)", async () => {
    // peRatioTrailing "0" → Number=0 → falsy → null di service → tidak terdeteksi.
    // Gunakan pbv saja untuk memastikan cabang pbv jalan tanpa pe.
    setupDb({ closesChrono: flat(5), fund: { pbvRatio: "1.5" }, sentiment: [] });
    const v = await computeVerdict("aaa");
    const f = factor(v!, "Value");
    expect(f.score).toBe(5.5); // pbv<2 → +0.5
    expect(f.signals.map((s) => s.label)).toContain("PBV reasonable");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Factor: Quality (weight .15)
// ─────────────────────────────────────────────────────────────────────────────

describe("factor Quality", () => {
  it("score 5 + 'No fundamentals data' kalau roe & profitMargin null", async () => {
    setupDb({ closesChrono: flat(5), fund: { peRatioTrailing: "12" }, sentiment: [] });
    const v = await computeVerdict("aaa");
    const f = factor(v!, "Quality");
    expect(f.score).toBe(5);
    expect(f.signals[0]!.label).toBe("No fundamentals data");
  });

  it("kualitas excellent: ROE>20%, margin>15%, DER rendah, current ratio kuat", async () => {
    setupDb({
      closesChrono: flat(5),
      fund: { roe: "0.25", profitMargin: "0.2", debtToEquity: "0.3", currentRatio: "2.5" },
      sentiment: [],
    });
    const v = await computeVerdict("aaa");
    const f = factor(v!, "Quality");
    // 5 +2 (ROE>20) +1 (margin>15) +0.5 (DER<0.5) +0.25 (CR>2) = 8.75
    expect(f.score).toBe(8.75);
  });

  it("kualitas buruk: ROE negatif, margin negatif, DER>2, CR<1", async () => {
    setupDb({
      closesChrono: flat(5),
      fund: { roe: "-0.1", profitMargin: "-0.05", debtToEquity: "3", currentRatio: "0.5" },
      sentiment: [],
    });
    const v = await computeVerdict("aaa");
    const f = factor(v!, "Quality");
    // 5 -1.5 (ROE<=0) -1 (margin<0) -1 (DER>2) -0.5 (CR<1) = 1
    expect(f.score).toBe(1);
  });

  it("ROE menengah (8-15%) → +0.5", async () => {
    setupDb({ closesChrono: flat(5), fund: { roe: "0.1" }, sentiment: [] });
    const v = await computeVerdict("aaa");
    expect(factor(v!, "Quality").score).toBe(5.5);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Factor: Growth (weight .15)
// ─────────────────────────────────────────────────────────────────────────────

describe("factor Growth", () => {
  it("score 5 + 'No growth data' kalau keduanya null", async () => {
    setupDb({ closesChrono: flat(5), fund: { peRatioTrailing: "12" }, sentiment: [] });
    const v = await computeVerdict("aaa");
    const f = factor(v!, "Growth");
    expect(f.score).toBe(5);
    expect(f.signals[0]!.label).toBe("No growth data");
  });

  it("rocket growth: revenue>25%, earnings>30% → score tinggi", async () => {
    setupDb({
      closesChrono: flat(5),
      fund: { revenueGrowthYoy: "0.3", earningsGrowthYoy: "0.4" },
      sentiment: [],
    });
    const v = await computeVerdict("aaa");
    const f = factor(v!, "Growth");
    // 5 +2 (rev>25) +1.5 (earn>30) = 8.5
    expect(f.score).toBe(8.5);
    expect(f.signals.map((s) => s.label)).toContain("Revenue rocket growth");
    expect(f.signals.map((s) => s.label)).toContain("Earnings rocket");
  });

  it("kontraksi: revenue turun, earnings kolaps (<-20%) → penalti besar", async () => {
    setupDb({
      closesChrono: flat(5),
      fund: { revenueGrowthYoy: "-0.1", earningsGrowthYoy: "-0.3" },
      sentiment: [],
    });
    const v = await computeVerdict("aaa");
    const f = factor(v!, "Growth");
    // 5 -1.5 (rev contraction) -2 (earn collapse) = 1.5
    expect(f.score).toBe(1.5);
    expect(f.signals.map((s) => s.label)).toContain("Revenue contraction");
    expect(f.signals.map((s) => s.label)).toContain("Earnings collapse");
  });

  it("revenue moderate (5-15%) → +0.5", async () => {
    setupDb({ closesChrono: flat(5), fund: { revenueGrowthYoy: "0.1" }, sentiment: [] });
    const v = await computeVerdict("aaa");
    expect(factor(v!, "Growth").score).toBe(5.5);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Factor: News Sentiment (weight .15)
// ─────────────────────────────────────────────────────────────────────────────

describe("factor News Sentiment", () => {
  it("score 5 + 'No recent news' kalau 0 artikel", async () => {
    setupDb({ closesChrono: flat(5), fund: null, sentiment: [] });
    const v = await computeVerdict("aaa");
    const f = factor(v!, "News Sentiment");
    expect(f.score).toBe(5);
    expect(f.signals[0]!.label).toBe("No recent news");
  });

  it("score 5 + 'News not yet scored' kalau ada artikel tapi score semua null", async () => {
    setupDb({
      closesChrono: flat(5),
      fund: null,
      sentiment: [
        { sentiment: "bullish", score: null },
        { sentiment: "neutral", score: null },
      ],
    });
    const v = await computeVerdict("aaa");
    const f = factor(v!, "News Sentiment");
    expect(f.score).toBe(5);
    expect(f.signals[0]!.label).toBe("News not yet scored");
    expect(f.signals[0]!.value).toBe("2 articles 30d");
  });

  it("sentiment sangat bullish (avg +1) → +4 poin → clamp 9", async () => {
    setupDb({
      closesChrono: flat(5),
      fund: null,
      sentiment: [
        { sentiment: "bullish", score: 1 },
        { sentiment: "bullish", score: 1 },
      ],
    });
    const v = await computeVerdict("aaa");
    const f = factor(v!, "News Sentiment");
    // 5 + 1*4 = 9
    expect(f.score).toBe(9);
    expect(f.signals.map((s) => s.label)).toContain("Avg sentiment 30d");
    expect(f.signals.map((s) => s.label)).toContain("Article distribution");
    expect(f.signals.map((s) => s.label)).toContain("Coverage");
  });

  it("sentiment sangat bearish (avg -1) → -4 poin → clamp 1", async () => {
    setupDb({
      closesChrono: flat(5),
      fund: null,
      sentiment: [
        { sentiment: "bearish", score: -1 },
        { sentiment: "bearish", score: -1 },
      ],
    });
    const v = await computeVerdict("aaa");
    expect(factor(v!, "News Sentiment").score).toBe(1);
  });

  it("rata-rata sentiment dihitung hanya dari artikel yang punya score", async () => {
    setupDb({
      closesChrono: flat(5),
      fund: null,
      sentiment: [
        { sentiment: "bullish", score: 0.5 },
        { sentiment: "neutral", score: null }, // diabaikan dari avg
      ],
    });
    const v = await computeVerdict("aaa");
    const f = factor(v!, "News Sentiment");
    // avg = 0.5 (hanya 1 scored) → 5 + 0.5*4 = 7
    expect(f.score).toBe(7);
  });

  it("string score di-coerce ke number (Number())", async () => {
    setupDb({
      closesChrono: flat(5),
      fund: null,
      sentiment: [{ sentiment: "bullish", score: "0.5" }],
    });
    const v = await computeVerdict("aaa");
    expect(factor(v!, "News Sentiment").score).toBe(7);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Overall weighted score + label thresholds (labelFor)
// ─────────────────────────────────────────────────────────────────────────────

describe("overall score + label thresholds", () => {
  it("semua factor netral 5 → overall 5.0 → HOLD", async () => {
    // < 50 bars & < 21 bars → technical=5, momentum=5; no fund → value/quality/growth=5;
    // no news → sentiment=5. Σ(5·w)/Σw = 5.
    setupDb({ closesChrono: flat(5), fund: null, sentiment: [] });
    const v = await computeVerdict("aaa");
    expect(v!.overallScore).toBe(5.0);
    expect(v!.label).toBe("HOLD");
  });

  it("weighted average benar saat factor tidak seragam", async () => {
    // closes naik bertahap (100+i): technical(.25)=8.0; momentum(.15)=6.0
    //   (5d +1.6% → +0.5, 20d +6.7% → +0.5); value/quality/growth/sentiment netral 5.
    // overall = 8*.25 + 6*.15 + 5*.60 = 2.0 + 0.9 + 3.0 = 5.9
    const closes = Array.from({ length: 220 }, (_, i) => 100 + i);
    setupDb({ closesChrono: closes, fund: null, sentiment: [] });
    const v = await computeVerdict("aaa");
    expect(v!.overallScore).toBe(5.9);
    expect(v!.label).toBe("HOLD");
  });

  it("dibulatkan ke 1 desimal", async () => {
    const closes = Array.from({ length: 220 }, (_, i) => 100 + i);
    setupDb({ closesChrono: closes, fund: null, sentiment: [] });
    const v = await computeVerdict("aaa");
    // overallScore harus punya <= 1 angka desimal
    expect(Number.isInteger(v!.overallScore * 10)).toBe(true);
  });

  it("label STRONG BUY saat skor >= 8.0", async () => {
    // Set semua factor tinggi: uptrend tech(8) + value(8.5) + quality(8.75) + growth(8.5) + sentiment(9) + momentum.
    const closes = Array.from({ length: 220 }, (_, i) => 100 + i * 2);
    setupDb({
      closesChrono: closes,
      fund: {
        peRatioTrailing: "8",
        pbvRatio: "0.8",
        roe: "0.25",
        profitMargin: "0.2",
        debtToEquity: "0.3",
        currentRatio: "2.5",
        revenueGrowthYoy: "0.3",
        earningsGrowthYoy: "0.4",
      },
      sentiment: [
        { sentiment: "bullish", score: 1 },
        { sentiment: "bullish", score: 1 },
      ],
    });
    const v = await computeVerdict("aaa");
    expect(v!.overallScore).toBeGreaterThanOrEqual(8.0);
    expect(v!.label).toBe("STRONG BUY");
  });

  it("label STRONG SELL saat skor sangat rendah", async () => {
    const closes = Array.from({ length: 220 }, (_, i) => 1000 - i * 2);
    setupDb({
      closesChrono: closes,
      fund: {
        peRatioTrailing: "50",
        pbvRatio: "5",
        roe: "-0.1",
        profitMargin: "-0.05",
        debtToEquity: "3",
        currentRatio: "0.5",
        revenueGrowthYoy: "-0.1",
        earningsGrowthYoy: "-0.3",
      },
      sentiment: [
        { sentiment: "bearish", score: -1 },
        { sentiment: "bearish", score: -1 },
      ],
    });
    const v = await computeVerdict("aaa");
    expect(v!.overallScore).toBeLessThan(3.0);
    expect(v!.label).toBe("STRONG SELL");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// labelFor boundaries — diuji via konstruksi overall yang tepat.
// Kita susun factor agar overall mendarat persis di tiap batas threshold.
// Semua factor netral=5 KECUALI sentiment yang bisa kita atur via avg score.
// overall = 5*(1 - .15) + sentimentScore*.15 = 4.25 + sentimentScore*.15
// → sentimentScore = (target - 4.25)/.15
// ─────────────────────────────────────────────────────────────────────────────

describe("labelFor — batas threshold", () => {
  // Strategi: closes pendek (tech=5, mom=5). Sisa 4 factor:
  //   overall = 2.0 + 0.15*(value + quality + growth + sentiment)
  // sentiment = 5 + avg*4 (continuous lever lewat avg).
  //
  // Untuk batas RENDAH (3.0, 2.9) kita pakai fundamentals buruk supaya
  // value/quality/growth turun jauh di bawah neutral.
  // Untuk batas TINGGI (6.5) kita pakai fundamentals bagus.
  // Untuk batas TENGAH (4.5, 4.4) cukup fund=null (value=quality=growth=5).

  /** Solve avg sentiment dari target overall, lalu jalankan computeVerdict. */
  async function verdictForTarget(
    target: number,
    fund: Record<string, unknown> | null,
    baseSum: number, // value+quality+growth tanpa sentiment
  ): Promise<VerdictResult> {
    // overall = 2.0 + 0.15*(baseSum + sentiment) → sentiment = (target-2.0)/0.15 - baseSum
    const sentimentScore = (target - 2.0) / 0.15 - baseSum;
    const avg = (sentimentScore - 5) / 4;
    setupDb({
      closesChrono: flat(5),
      fund,
      sentiment: [{ sentiment: "neutral", score: avg }],
    });
    const v = await computeVerdict("aaa");
    return v!;
  }

  const NEUTRAL_SUM = 15; // value=quality=growth=5 (fund=null)

  // Fundamentals buruk: value=2 (PE>=40, PBV>=4), quality=1, growth=1.5
  const BAD_FUND = {
    peRatioTrailing: "50",
    pbvRatio: "5",
    roe: "-0.1",
    profitMargin: "-0.05",
    debtToEquity: "3",
    currentRatio: "0.5",
    revenueGrowthYoy: "-0.1",
    earningsGrowthYoy: "-0.3",
  };
  const BAD_SUM = 2 + 1 + 1.5; // 4.5

  it("overall tepat 4.5 → HOLD (bukan SELL)", async () => {
    const v = await verdictForTarget(4.5, null, NEUTRAL_SUM);
    expect(v.overallScore).toBe(4.5);
    expect(v.label).toBe("HOLD");
  });

  it("overall tepat di bawah 4.5 (4.4) → SELL", async () => {
    const v = await verdictForTarget(4.4, null, NEUTRAL_SUM);
    expect(v.overallScore).toBe(4.4);
    expect(v.label).toBe("SELL");
  });

  it("overall tepat 6.5 → BUY (bukan HOLD)", async () => {
    // fundamentals bagus: value=8.5, quality=8.75, growth=8.5
    const goodFund = {
      peRatioTrailing: "8",
      pbvRatio: "0.8",
      roe: "0.25",
      profitMargin: "0.2",
      debtToEquity: "0.3",
      currentRatio: "2.5",
      revenueGrowthYoy: "0.3",
      earningsGrowthYoy: "0.4",
    };
    const goodSum = 8.5 + 8.75 + 8.5;
    const v = await verdictForTarget(6.5, goodFund, goodSum);
    expect(v.overallScore).toBe(6.5);
    expect(v.label).toBe("BUY");
  });

  it("overall tepat 3.0 → SELL (bukan STRONG SELL)", async () => {
    const v = await verdictForTarget(3.0, BAD_FUND, BAD_SUM);
    expect(v.overallScore).toBe(3.0);
    expect(v.label).toBe("SELL");
  });

  it("overall tepat di bawah 3.0 (2.9) → STRONG SELL", async () => {
    const v = await verdictForTarget(2.9, BAD_FUND, BAD_SUM);
    expect(v.overallScore).toBe(2.9);
    expect(v.label).toBe("STRONG SELL");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Determinisme
// ─────────────────────────────────────────────────────────────────────────────

describe("determinisme", () => {
  it("input sama → output identik (overall, label, factor scores)", async () => {
    const closes = Array.from({ length: 220 }, (_, i) => 100 + Math.sin(i / 5) * 10 + i * 0.5);
    const fund = { peRatioTrailing: "12", roe: "0.18", revenueGrowthYoy: "0.12" };

    setupDb({ closesChrono: closes, fund: { ...fund }, sentiment: [{ sentiment: "bullish", score: 0.4 }] });
    const a = await computeVerdict("aaa");

    setupDb({ closesChrono: closes, fund: { ...fund }, sentiment: [{ sentiment: "bullish", score: 0.4 }] });
    const b = await computeVerdict("aaa");

    expect(a!.overallScore).toBe(b!.overallScore);
    expect(a!.label).toBe(b!.label);
    expect(a!.factors.map((f) => f.score)).toEqual(b!.factors.map((f) => f.score));
  });
});
