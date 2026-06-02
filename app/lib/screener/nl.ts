import { z } from "zod";
import { getAiClient } from "@/lib/ai/client";
import { listSectors } from "./service";
import type { ScreenerFilters, SortField } from "./service";

/**
 * Natural-Language Screener (NL → structured filter).
 *
 * User mengetik query Bahasa Indonesia bebas (mis. "saham bank RSI di bawah 30
 * dan volume naik"), DeepSeek menerjemahkannya ke objek `ScreenerFilters` yang
 * sama persis dipakai screener inti (`runScreener`). Output AI divalidasi ketat
 * dengan zod: field yang tidak dikenal DIBUANG (zod default strip), nilai out of
 * range di-clamp/diabaikan. JANGAN ubah logic screener — ini cuma lapisan parse.
 *
 * Catatan: `sectorKode` harus kode sektor IDX yang valid (mis. "FINANCIALS").
 * Kita inject daftar sektor live ke prompt supaya AI tidak mengarang kode.
 */

const sortFieldValues = [
  "market_cap",
  "pe",
  "pbv",
  "roe",
  "dividend_yield",
  "revenue_growth",
  "stoch_k",
  "rsi",
  "kode",
] as const satisfies readonly SortField[];

/**
 * Zod schema yang MENCERMINKAN `ScreenerFilters` (subset yang aman diisi AI).
 * Semua optional; `.strip()` (default) membuang field asing dari output LLM.
 */
const nlFilterSchema = z
  .object({
    // Reference
    sectorKode: z.string().min(1).max(40).optional(),
    subSectorKode: z.string().min(1).max(40).optional(),
    papanKode: z.string().min(1).max(40).optional(),
    isSyariah: z.boolean().optional(),
    search: z.string().min(1).max(80).optional(),

    // Valuation
    minMarketCap: z.number().nonnegative().optional(),
    maxMarketCap: z.number().nonnegative().optional(),
    minPe: z.number().optional(),
    maxPe: z.number().optional(),
    minPbv: z.number().optional(),
    maxPbv: z.number().optional(),

    // Profitability (ratio 0-1)
    minRoe: z.number().optional(),
    minProfitMargin: z.number().optional(),

    // Growth (ratio 0-1)
    minRevenueGrowth: z.number().optional(),

    // Financial health
    maxDebtToEquity: z.number().optional(),
    minCurrentRatio: z.number().optional(),

    // Income (ratio 0-1)
    minDividendYield: z.number().optional(),

    // Trading
    minAvgVolume3Mo: z.number().nonnegative().optional(),

    // ===== Technical =====
    minStochK_10_5_5: z.number().min(0).max(100).optional(),
    maxStochK_10_5_5: z.number().min(0).max(100).optional(),
    stochBullishCross_10_5_5: z.boolean().optional(),
    minStochK_14_3_3: z.number().min(0).max(100).optional(),
    maxStochK_14_3_3: z.number().min(0).max(100).optional(),
    minStochK_5_3_3: z.number().min(0).max(100).optional(),
    maxStochK_5_3_3: z.number().min(0).max(100).optional(),
    minRsi14: z.number().min(0).max(100).optional(),
    maxRsi14: z.number().min(0).max(100).optional(),
    macdAboveZero: z.boolean().optional(),
    macdHistogramTurningUp: z.boolean().optional(),
    macdHistogramTurningDown: z.boolean().optional(),
    minMfi14: z.number().min(0).max(100).optional(),
    maxMfi14: z.number().min(0).max(100).optional(),
    isAboveSma20: z.boolean().optional(),
    isAboveSma50: z.boolean().optional(),
    isAboveSma200: z.boolean().optional(),
    isBullishMaStack: z.boolean().optional(),
    isBearishMaStack: z.boolean().optional(),
    isGoldenCrossRecent: z.boolean().optional(),
    isDeathCrossRecent: z.boolean().optional(),
    isBbSqueeze: z.boolean().optional(),
    minAtr14: z.number().nonnegative().optional(),
    maxAtr14: z.number().nonnegative().optional(),
    minVolumeRatio: z.number().nonnegative().optional(),
    minAdx: z.number().min(0).max(100).optional(),
    maxDistFrom52wHighPct: z.number().optional(),
    maxDistFrom52wLowPct: z.number().optional(),

    // Sort / paginate
    sort: z.enum(sortFieldValues).optional(),
    sortDir: z.enum(["asc", "desc"]).optional(),
    limit: z.number().int().min(1).max(500).optional(),
    offset: z.number().int().min(0).optional(),
  })
  .strip();

export type NlScreenerFilters = z.infer<typeof nlFilterSchema>;

const FIELD_DOC = `
REFERENCE / KATEGORI:
- sectorKode: kode sektor IDX (lihat daftar valid di bawah). Pakai HANYA kalau user menyebut sektor/industri.
- subSectorKode: kode sub-sektor (jarang; kosongkan jika ragu).
- papanKode: papan listing ("UTAMA", "PENGEMBANGAN", "AKSELERASI").
- isSyariah (boolean): true kalau user minta saham syariah.
- search (string): kalau user menyebut kode emiten / nama perusahaan spesifik.

VALUASI:
- minMarketCap / maxMarketCap: market cap dalam RUPIAH penuh (Rp10 triliun = 10000000000000).
- minPe / maxPe: Price/Earnings ratio (angka, mis. 15).
- minPbv / maxPbv: Price/Book ratio (mis. 2).

PROFITABILITAS & GROWTH (RASIO desimal, 15% = 0.15):
- minRoe, minProfitMargin, minRevenueGrowth, minDividendYield.

KESEHATAN KEUANGAN:
- maxDebtToEquity (mis. 1.5), minCurrentRatio (mis. 1.5).

LIKUIDITAS:
- minAvgVolume3Mo: rata-rata volume 3 bulan (jumlah lembar saham).

TECHNICAL (butuh snapshot):
- minRsi14 / maxRsi14: RSI 14 (0-100). "RSI oversold / di bawah 30" => maxRsi14: 30. "overbought" => minRsi14: 70.
- minStochK_10_5_5 / maxStochK_10_5_5: Stochastic Slow %K (0-100). stochBullishCross_10_5_5: %K cross di atas %D.
- minStochK_14_3_3 / maxStochK_14_3_3, minStochK_5_3_3 / maxStochK_5_3_3: varian Stochastic lain.
- minMfi14 / maxMfi14: Money Flow Index (0-100).
- minAdx: kekuatan tren (>=20 tren mulai kuat, >=25 kuat).
- macdAboveZero, macdHistogramTurningUp, macdHistogramTurningDown (boolean).
- isAboveSma20 / isAboveSma50 / isAboveSma200 (boolean): harga di atas MA.
- isBullishMaStack / isBearishMaStack (boolean): susunan MA bullish/bearish.
- isGoldenCrossRecent / isDeathCrossRecent (boolean).
- isBbSqueeze (boolean): Bollinger Band squeeze.
- minAtr14 / maxAtr14: volatilitas (ATR).
- minVolumeRatio: rasio volume 5d vs 60d. "volume naik / spike / di atas rata-rata" => minVolumeRatio: 1.5.
- maxDistFrom52wHighPct: dekat 52w high (mis. 10 = dalam 10% dari high). maxDistFrom52wLowPct: dekat 52w low.

SORT:
- sort: salah satu dari ${sortFieldValues.join(", ")}. sortDir: "asc" | "desc".
`.trim();

function buildSystemPrompt(sectorList: Array<{ kode: string; nama: string }>): string {
  const sectors = sectorList.map((s) => `${s.kode} = ${s.nama}`).join("\n");
  return `Kamu adalah parser screener saham IDX. Tugasmu: mengubah query Bahasa Indonesia dari user menjadi JSON FILTER terstruktur untuk screener.

ATURAN OUTPUT:
- Balas HANYA JSON object valid, tanpa teks lain, tanpa markdown.
- Gunakan HANYA field yang ada di daftar di bawah. Field yang tidak relevan JANGAN disertakan (jangan isi null).
- Kalau query tidak menyebut kriteria apa pun yang dikenali, balas {}.
- "di bawah X" / "kurang dari X" => max...; "di atas X" / "lebih dari X" / "minimal X" => min...
- "murah" valuasi => maxPe/maxPbv rendah. "growth tinggi" => minRevenueGrowth. "dividen tinggi" => minDividendYield.
- Volume "naik / besar / ramai / spike" => minVolumeRatio (default 1.5 kalau tak ada angka).
- Untuk sektor, WAJIB pakai kode dari daftar valid berikut (jangan mengarang):
${sectors}

DAFTAR FIELD VALID:
${FIELD_DOC}

CONTOH:
Query: "saham bank RSI di bawah 30 dan volume naik"
JSON: {"sectorKode":"FINANCIALS","maxRsi14":30,"minVolumeRatio":1.5}

Query: "emiten murah PE di bawah 10 PBV di bawah 1 ROE minimal 15%"
JSON: {"maxPe":10,"maxPbv":1,"minRoe":0.15}

Query: "saham syariah dividen di atas 5 persen market cap di atas 10 triliun"
JSON: {"isSyariah":true,"minDividendYield":0.05,"minMarketCap":10000000000000}

Query: "golden cross baru, harga di atas SMA200, ADX kuat"
JSON: {"isGoldenCrossRecent":true,"isAboveSma200":true,"minAdx":25}`;
}

export interface ParseNlResult {
  filter: ScreenerFilters;
  raw: Record<string, unknown>;
}

/**
 * Terjemahkan query NL Bahasa Indonesia ke `ScreenerFilters` tervalidasi.
 * Throw kalau AI gagal / balas kosong / output bukan JSON valid.
 */
export async function parseNlQuery(text: string): Promise<ParseNlResult> {
  const query = text.trim();
  if (!query) {
    return { filter: { limit: 50 }, raw: {} };
  }

  const { client, config } = await getAiClient();
  const sectorList = await listSectors().catch(() => []);
  const systemPrompt = buildSystemPrompt(sectorList);

  const res = await client.chat.completions.create({
    model: config.defaultModel,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: query },
    ],
    response_format: { type: "json_object" },
    max_tokens: 512,
    temperature: 0,
  });

  const content = res.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("AI mengembalikan respons kosong");
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(content);
  } catch {
    throw new Error("AI tidak mengembalikan JSON valid");
  }

  // Validasi + strip field asing. Kalau seluruh objek invalid, throw.
  const validated = nlFilterSchema.safeParse(parsedJson);
  const raw = (typeof parsedJson === "object" && parsedJson !== null
    ? (parsedJson as Record<string, unknown>)
    : {});
  if (!validated.success) {
    // Best-effort: pertahankan hanya field yang lolos per-key (defensif).
    const partial = sanitizePartial(raw);
    return { filter: { ...partial, limit: 50 }, raw };
  }

  const filter: ScreenerFilters = { ...validated.data, limit: 50 };
  return { filter, raw };
}

/**
 * Fallback per-field: validasi tiap key sendiri-sendiri, buang yang gagal.
 * Dipakai kalau objek penuh gagal validasi (mis. satu field out of range).
 */
function sanitizePartial(obj: Record<string, unknown>): ScreenerFilters {
  const out: Record<string, unknown> = {};
  const shape = nlFilterSchema.shape;
  for (const [key, value] of Object.entries(obj)) {
    const fieldSchema = (shape as Record<string, z.ZodTypeAny | undefined>)[key];
    if (!fieldSchema) continue;
    const r = fieldSchema.safeParse(value);
    if (r.success && r.data !== undefined) out[key] = r.data;
  }
  return out as ScreenerFilters;
}
