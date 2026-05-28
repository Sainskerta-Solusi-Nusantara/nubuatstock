import { getAiClient } from "@/lib/ai/client";
import { PATTERN_META, type PatternType } from "./types";
import { logger } from "@/lib/logger";

/**
 * Generate AI explanation untuk pattern detection per ticker.
 *
 * 2 paragraf bahasa Indonesia:
 *   1. Makna pattern secara umum + apa yang biasanya terjadi setelahnya
 *   2. Konteks spesifik untuk ticker ini — alasan kenapa pattern relevan,
 *      potential price targets, hal yang harus dipantau
 *
 * Caching: store hasil di DB pattern_detections.narrative (sudah ada kolom-nya).
 * Generate on-demand kalau narrative null, cached otherwise.
 */

interface AIExplanationInput {
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

export async function generatePatternExplanation(
  input: AIExplanationInput,
): Promise<string> {
  const meta = PATTERN_META[input.patternType];
  if (!meta) return "";

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

Tulis penjelasan 2 paragraf bahasa Indonesia profesional:
Paragraf 1: Makna pattern ini secara umum + behavior pasar tipikal setelah pattern complete.
Paragraf 2: Konteks spesifik untuk ${input.ticker} — implikasi current level + hal yang perlu dimonitor.

Output HANYA JSON: {"explanation": "..."} dengan paragraph dipisah \\n\\n.
Singkat, padat, tidak bertele-tele. ~150 kata total.`;

    const completion = await client.chat.completions.create({
      model: config.defaultModel,
      messages: [
        {
          role: "system",
          content:
            "Kamu adalah analis teknikal saham Indonesia profesional. Jelaskan pattern dengan netral, informatif, tidak hype. Sapa pembaca dengan 'kamu' (jangan pakai 'Anda'). Ingatkan bahwa pattern bisa gagal.",
        },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: 400,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message.content ?? "{}";
    const parsed = JSON.parse(content);
    return String(parsed.explanation ?? "").trim();
  } catch (err) {
    logger.warn({ err: (err as Error).message, ticker: input.ticker }, "Pattern AI explanation failed");
    return ""; // Fall back ke narrative template yang sudah ada di detector
  }
}
