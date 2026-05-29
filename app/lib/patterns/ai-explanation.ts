import { getAiClient } from "@/lib/ai/client";
import { PATTERN_META, type PatternType } from "./types";
import { logger } from "@/lib/logger";

/**
 * AI Pattern Explanation — "Jelaskan pola ini".
 *
 * generatePatternExplanation() menghasilkan penjelasan markdown bahasa Indonesia
 * awam untuk satu pattern yang terdeteksi:
 *   - Apa pola ini & cara membacanya
 *   - Implikasi bullish/bearish + behavior pasar tipikal
 *   - Konteks spesifik ticker (level penting + yang perlu dipantau)
 *   - Disclaimer ("bukan ajakan jual/beli")
 *
 * Kalau LLM gagal / belum dikonfigurasi → fallback ke deskripsi statis dari
 * PATTERN_META (lewat buildFallbackExplanation) supaya panel TIDAK pernah kosong.
 *
 * Caller (route) yang memutuskan caching: hasil `source === "ai"` boleh disimpan
 * ke pattern_detections.narrative dengan prefix "AI:"; fallback JANGAN di-cache.
 */

const DISCLAIMER =
  "_Penjelasan ini bersifat edukatif untuk membantu kamu membaca chart — **bukan ajakan untuk membeli atau menjual**. Pola teknikal bisa gagal (false breakout); selalu validasi sendiri dan kelola risiko sebelum mengambil keputusan._";

export interface AIExplanationInput {
  ticker: string;
  patternType: PatternType;
  direction: "bullish" | "bearish";
  status: "forming" | "completed" | "invalidated";
  confidence: number;
  keyLevels: {
    breakout: number;
    target: number;
    stop: number;
    [k: string]: number | undefined;
  };
  volumeConfirmation: boolean;
  currentPrice?: number | null;
  companyName?: string | null;
}

export interface PatternExplanationResult {
  /** Markdown siap-render (sudah termasuk disclaimer). */
  explanation: string;
  /** "ai" = dari LLM (boleh di-cache); "fallback" = statis (jangan di-cache). */
  source: "ai" | "fallback";
}

/**
 * Generate penjelasan AI. Selalu mengembalikan explanation non-empty:
 * jatuh ke fallback statis kalau LLM gagal / belum terkonfigurasi.
 */
export async function generatePatternExplanation(
  input: AIExplanationInput,
): Promise<PatternExplanationResult> {
  const meta = PATTERN_META[input.patternType];
  if (!meta) {
    return { explanation: buildFallbackExplanation(input), source: "fallback" };
  }

  try {
    const { client, config } = await getAiClient();

    const userPrompt = `Pattern: ${meta.label}
Ticker: ${input.ticker}${input.companyName ? ` (${input.companyName})` : ""}
Status: ${input.status} (${input.direction})
Confidence: ${(input.confidence * 100).toFixed(0)}%
Key Levels: Breakout ${input.keyLevels.breakout.toFixed(0)} | Target ${input.keyLevels.target.toFixed(0)} | Stop ${input.keyLevels.stop.toFixed(0)}
${input.currentPrice ? `Harga sekarang: ${input.currentPrice.toFixed(0)}` : ""}
${input.volumeConfirmation ? "Volume konfirmasi: YA" : ""}

Pattern definition: ${meta.description}

Tulis penjelasan markdown bahasa Indonesia awam (santai tapi tetap kredibel) untuk pemula:
1. Apa pola "${meta.label}" ini & cara membacanya di chart (1-2 kalimat).
2. Implikasi ${input.direction === "bullish" ? "bullish" : "bearish"} + apa yang biasanya terjadi pasar setelah pola ini.
3. Konteks ${input.ticker} sekarang — kaitkan dengan level Breakout/Target/Stop di atas + apa yang perlu kamu pantau.

Aturan:
- Sapa pembaca dengan "kamu" (jangan "Anda"). Hindari jargon berat; kalau pakai istilah, jelaskan singkat.
- Boleh pakai bullet point. Ringkas, ~150 kata. JANGAN tambahkan disclaimer (sistem yang menambahkan).
Output HANYA JSON: {"explanation": "...markdown..."}`;

    const completion = await client.chat.completions.create({
      model: config.defaultModel,
      messages: [
        {
          role: "system",
          content:
            "Kamu adalah analis teknikal saham Indonesia yang menjelaskan pola chart ke pemula dengan bahasa awam, netral, dan tidak hype. Sapa pembaca dengan 'kamu'. Selalu ingatkan implisit bahwa pola bisa gagal.",
        },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: 500,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message.content ?? "{}";
    const parsed = JSON.parse(content);
    const text = String(parsed.explanation ?? "").trim();
    if (!text) {
      return { explanation: buildFallbackExplanation(input), source: "fallback" };
    }
    return { explanation: `${text}\n\n${DISCLAIMER}`, source: "ai" };
  } catch (err) {
    logger.warn(
      { err: (err as Error).message, ticker: input.ticker },
      "Pattern AI explanation failed — using static fallback",
    );
    return { explanation: buildFallbackExplanation(input), source: "fallback" };
  }
}

/**
 * Fallback statis dari PATTERN_META — dipakai kalau LLM gagal / belum dikonfigurasi.
 * Tetap informatif & ber-disclaimer supaya panel tidak pernah kosong.
 */
export function buildFallbackExplanation(input: AIExplanationInput): string {
  const meta = PATTERN_META[input.patternType];
  const label = meta?.label ?? input.patternType;
  const desc = meta?.description ?? "Pola chart teknikal.";
  const bias =
    input.direction === "bullish"
      ? "Polanya cenderung **bullish** — biasanya jadi sinyal harga berpotensi naik kalau breakout-nya terkonfirmasi."
      : "Polanya cenderung **bearish** — biasanya jadi sinyal harga berpotensi turun kalau breakdown-nya terkonfirmasi.";

  const statusNote =
    input.status === "forming"
      ? "Saat ini pola masih **forming** (terbentuk tapi belum breakout), jadi belum tervalidasi."
      : input.status === "completed"
        ? "Pola sudah **completed** (breakout terkonfirmasi)."
        : "Pola sudah **invalidated** (gagal).";

  const k = input.keyLevels;
  const fmt = (n: number) => n.toLocaleString("id-ID", { maximumFractionDigits: 0 });

  return [
    `### ${label}`,
    "",
    desc,
    "",
    bias,
    "",
    `**Cara membacanya untuk ${input.ticker}:** ${statusNote}`,
    "",
    "Level yang bisa kamu pantau:",
    "",
    `- **Breakout:** ${fmt(k.breakout)} — level yang perlu ditembus agar pola valid.`,
    `- **Target:** ${fmt(k.target)} — proyeksi harga jika pola berjalan.`,
    `- **Stop:** ${fmt(k.stop)} — level untuk membatasi risiko jika pola gagal.`,
    ...(input.volumeConfirmation
      ? ["", "Volume sudah mengkonfirmasi pergerakan ini, yang menambah keyakinan pada pola."]
      : []),
    "",
    DISCLAIMER,
    "",
    "_(Penjelasan otomatis dari basis data pola — AI tidak tersedia saat ini.)_",
  ].join("\n");
}
