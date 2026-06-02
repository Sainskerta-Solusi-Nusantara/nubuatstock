import { getAiClient } from "@/lib/ai/client";
import type { WaveAnalysis } from "@/lib/elliott/labeler";
import type { ProjectionTarget } from "@/lib/elliott/projection";

/**
 * Generator narasi Elliott Wave per emiten — P2.
 *
 * Menjelaskan posisi wave saat ini, target proyeksi Fibonacci, dan satu hal yang
 * dipantau. Mengikuti pola lib/ai/narrative.ts (DeepSeek via getAiClient,
 * Bahasa Indonesia, nada "kamu", 2-3 kalimat).
 *
 * Kontrak konten (WAJIB dipatuhi prompt):
 *   - JANGAN menjanjikan profit.
 *   - JANGAN menulis disclaimer (otomatis di UI).
 *   - 2-3 kalimat, langsung narasi tanpa judul.
 *
 * TIDAK auto-jalan. Fungsi ini dipanggil eksplisit oleh caller (mis. worker/cron
 * setelah labeling). Return null bila AI gagal / balas kosong → caller biarkan
 * narrative NULL.
 */

export interface ElliottNarrativeInput {
  companyKode: string;
  timeframe: string;
  /** Hasil labeler (waveType, currentWave, confidence, dst). */
  analysis: Pick<WaveAnalysis, "waveType" | "currentWave" | "confidence">;
  /** Target proyeksi Fibonacci dari projectTargets(). */
  targets: ProjectionTarget[];
  /** Skor kualitas wave count 0-100 (guidelineScore). Opsional. */
  guidelineScore?: number;
  /** Degree wave (Primary/Intermediate/Minor). Opsional. */
  degree?: string;
}

const WAVE_TYPE_LABEL: Record<string, string> = {
  impulse_up: "impulse naik (1-2-3-4-5)",
  impulse_down: "impulse turun (1-2-3-4-5)",
  corrective: "koreksi A-B-C",
  unknown: "pola belum jelas",
};

export async function generateElliottNarrative(
  input: ElliottNarrativeInput,
): Promise<string | null> {
  // Pola tak jelas → tidak ada yang berarti untuk dinarasikan.
  if (input.analysis.waveType === "unknown") return null;

  const { client, config } = await getAiClient();

  const typeLabel = WAVE_TYPE_LABEL[input.analysis.waveType] ?? input.analysis.waveType;
  const targetLines =
    input.targets.length > 0
      ? input.targets.map((t) => `${t.label} ≈ ${t.price}`).join("; ")
      : "(tidak ada target proyeksi)";
  const scoreLine =
    input.guidelineScore != null ? `\n- Skor kualitas wave count: ${input.guidelineScore}/100` : "";
  const degreeLine = input.degree ? `\n- Degree: ${input.degree}` : "";

  const prompt = `Kamu analis teknikal saham Indonesia yang paham Elliott Wave. Tulis narasi SINGKAT (2-3 kalimat, Bahasa Indonesia, nada "kamu") tentang posisi Elliott Wave saham ${input.companyKode} pada timeframe ${input.timeframe}.

Data:
- Tipe pola: ${typeLabel}
- Posisi saat ini: ${input.analysis.currentWave}
- Confidence pola: ${(input.analysis.confidence * 100).toFixed(0)}%${scoreLine}${degreeLine}
- Target proyeksi Fibonacci: ${targetLines}

Jelaskan posisi wave saat ini, sebutkan target proyeksi yang relevan, dan satu hal yang perlu dipantau (mis. invalidasi level kunci). JANGAN menjanjikan keuntungan. JANGAN menulis disclaimer (sudah otomatis). Langsung tulis narasinya, tanpa judul.`;

  const res = await client.chat.completions.create({
    model: config.defaultModel,
    messages: [{ role: "user", content: prompt }],
    max_tokens: 320,
    temperature: 0.4,
  });
  const text = res.choices?.[0]?.message?.content?.trim() ?? "";
  if (!text) return null;
  return text;
}
