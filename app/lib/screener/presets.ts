import type { ScreenerFilters } from "./service";

/**
 * Strategy presets — classic equity screens yang sering dipakai retail Indonesia.
 *
 * Numerik bersumber dari rule-of-thumb literatur (Graham, Lynch, Buffett-style).
 * Bukan rekomendasi investasi — preset cuma starting point, user harus tune sendiri.
 */

export interface ScreenerPreset {
  id: string;
  name: string;
  description: string;
  philosophy: string; // Quote / mentor reference
  filters: ScreenerFilters;
}

export const SCREENER_PRESETS: ScreenerPreset[] = [
  // ===================== TECHNICAL / MODE-BASED =====================
  {
    id: "swing-santai",
    name: "🧘 Mode Swing Santai",
    description:
      "Stochastic 10,5,5 oversold mulai reversal + RSI recovering + price > SMA50 + MACD histogram balik positif + volume konfirmasi + ROE sehat. Sinyal swing klasik low-stress untuk hold beberapa hari ke minggu, diurut dari paling oversold.",
    philosophy: "Swing trader Indonesia favorite — entry saat oversold mulai reversal, exit di overbought atau target Fibonacci.",
    filters: {
      maxStochK_10_5_5: 35,            // Oversold zone (< 35, prefer < 20)
      stochBullishCross_10_5_5: true,  // %K > %D (reversal: momentum turning up)
      minRsi14: 30,                    // RSI 14 recovering from oversold
      maxRsi14: 55,                    // ...but not yet overbought
      isAboveSma50: true,              // Medium-term uptrend intact
      macdHistogramTurningUp: true,    // MACD histogram baru cross ke positif
      minVolumeRatio: 1.0,             // Volume ≥ rata-rata (konfirmasi)
      minRoe: 0.08,                    // Fundamental sanity check (ROE > 8%)
      sort: "stoch_k",                 // Most oversold first (spec: Stoch %K asc)
      sortDir: "asc",
    },
  },
  {
    id: "day-trader",
    name: "⚡ Mode Day Trader",
    description:
      "RSI 40-60 mid-range + volume spike + ATR moderate. Setup untuk intraday momentum dengan room to move.",
    philosophy: "Cari momentum yang masih punya runway, bukan extreme overbought/oversold.",
    filters: {
      minRsi14: 40,
      maxRsi14: 60,
      minVolumeRatio: 1.5,        // Volume 1.5× avg
      macdAboveZero: true,
      sort: "kode",
      sortDir: "asc",
    },
  },
  {
    id: "breakout-hunter",
    name: "🚀 Mode Breakout Hunter",
    description:
      "Bollinger squeeze + volume spike + ADX rising + price near upper band. Setup pre-breakout dengan compression release.",
    philosophy: "Setelah konsolidasi panjang, ada potensi explosive move — siapkan posisi di squeeze.",
    filters: {
      isBbSqueeze: true,
      minVolumeRatio: 1.3,
      minAdx: 20,
      isAboveSma50: true,
      sort: "kode",
      sortDir: "asc",
    },
  },
  {
    id: "reversal-catcher",
    name: "🔄 Mode Reversal Catcher",
    description:
      "RSI extreme (< 30 oversold ATAU > 70 overbought) + Stochastic confirming. Contrarian play.",
    philosophy: "High risk-reward — masuk saat extreme dengan tight stop loss. Bukan untuk pemula.",
    filters: {
      maxStochK_14_3_3: 20,       // Stoch 14,3,3 oversold
      maxRsi14: 35,
      sort: "kode",
      sortDir: "asc",
    },
  },
  {
    id: "trend-rider",
    name: "📈 Mode Trend Rider",
    description:
      "Bullish MA stack (SMA20 > SMA50 > SMA200) + ADX strong + price near 52w high. Ride existing trend.",
    philosophy: "Trend is your friend — jangan fight, ride sampai exhausted.",
    filters: {
      isBullishMaStack: true,
      minAdx: 25,
      maxDistFrom52wHighPct: 10,  // Within 10% of 52w high
      sort: "kode",
      sortDir: "asc",
    },
  },
  {
    id: "golden-cross-fresh",
    name: "✨ Mode Golden Cross Fresh",
    description:
      "Baru saja terjadi golden cross (SMA50 crossed SMA200) dalam 10 bar terakhir. Long-term trend reversal signal.",
    philosophy: "Klasik long-term trend change indicator — biasanya followed by extended uptrend.",
    filters: {
      isGoldenCrossRecent: true,
      sort: "kode",
      sortDir: "asc",
    },
  },

  // ===================== FUNDAMENTAL (existing) =====================
  {
    id: "value-hunter",
    name: "Value Hunter",
    description:
      "Cari saham yang diperdagangkan di bawah valuasi wajar — PE rendah, PBV murah, ROE tetap sehat.",
    philosophy: "Inspired by Benjamin Graham (margin of safety).",
    filters: {
      maxPe: 15,
      maxPbv: 2,
      minRoe: 0.10,
      maxDebtToEquity: 1.5,
      sort: "pe",
      sortDir: "asc",
    },
  },
  {
    id: "growth-story",
    name: "Growth Story",
    description:
      "Emiten dengan pertumbuhan pendapatan & laba tinggi — terima valuasi premium kalau growth konsisten.",
    philosophy: "Peter Lynch — find tenbaggers via earnings growth.",
    filters: {
      minRevenueGrowth: 0.20,
      minProfitMargin: 0.10,
      minRoe: 0.15,
      sort: "revenue_growth",
      sortDir: "desc",
    },
  },
  {
    id: "dividend-aristocrat",
    name: "Dividend Aristocrat",
    description:
      "Yield tinggi dengan payout sehat — cocok untuk income investing dan portfolio defensif.",
    philosophy: "Income-focused — cash returns matter more than capital gains.",
    filters: {
      minDividendYield: 0.04,
      minRoe: 0.10,
      maxDebtToEquity: 1.5,
      sort: "dividend_yield",
      sortDir: "desc",
    },
  },
  {
    id: "quality",
    name: "Quality Wide-Moat",
    description:
      "Emiten dengan profitabilitas konsisten tinggi & balance sheet kuat — moat indicator.",
    philosophy: "Warren Buffett — wonderful business at fair price.",
    filters: {
      minRoe: 0.15,
      minProfitMargin: 0.15,
      maxDebtToEquity: 1.0,
      minCurrentRatio: 1.5,
      sort: "roe",
      sortDir: "desc",
    },
  },
  {
    id: "small-cap-rocket",
    name: "Small-Cap Rocket",
    description:
      "Emiten mid/small cap (< Rp10T) dengan growth tinggi — risiko tinggi, potensi return juga tinggi.",
    philosophy: "Reward higher with size discount — but liquidity & volatility risk.",
    filters: {
      maxMarketCap: 10_000_000_000_000, // Rp10T
      minRevenueGrowth: 0.15,
      minRoe: 0.10,
      minAvgVolume3Mo: 100_000, // liquidity floor
      sort: "revenue_growth",
      sortDir: "desc",
    },
  },
  {
    id: "blue-chip",
    name: "Blue Chip IDX",
    description:
      "Large cap (> Rp50T), profitabel, leverage rendah — untuk portfolio core defensive.",
    philosophy: "Stability & dividend reliability over upside chase.",
    filters: {
      minMarketCap: 50_000_000_000_000, // Rp50T
      minRoe: 0.10,
      maxDebtToEquity: 1.5,
      sort: "market_cap",
      sortDir: "desc",
    },
  },
];

export function getPreset(id: string): ScreenerPreset | undefined {
  return SCREENER_PRESETS.find((p) => p.id === id);
}
