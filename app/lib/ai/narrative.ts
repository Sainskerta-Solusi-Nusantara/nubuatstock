import { getAiClient } from "./client";

/**
 * Generator narasi Daily Pick — menjelaskan KENAPA sebuah saham jadi pick
 * berdasarkan setup, skor komposit, dan breakdown faktor. Dipanggil oleh
 * pipeline picks via cross-deps (`@/lib/picks/cross-deps`).
 *
 * Return null kalau AI gagal/balas kosong → caller biarkan narrative_text NULL.
 */

export interface PickNarrativeInput {
  companyKode: string;
  setupType: string;
  score: number;
  entryZoneLow: number;
  entryZoneHigh: number;
  stopLoss: number;
  tp1: number;
  tp2: number | null;
  tp3: number | null;
  rewardRiskRatio: number;
  factorBreakdown: Record<string, number>;
}
export interface PickNarrativeResult {
  text: string;
  generatedBy: string;
}

const FACTOR_LABEL: Record<string, string> = {
  technical: "Teknikal",
  bandarmology: "Bandarmologi",
  fundamental: "Fundamental",
  sentiment: "Sentimen",
  macro: "Makro",
  risk_penalty: "Penalti Risiko",
};

export async function generatePickNarrative(
  input: PickNarrativeInput,
): Promise<PickNarrativeResult | null> {
  const { client, config } = await getAiClient();

  const factors = Object.entries(input.factorBreakdown)
    .filter(([k]) => k !== "risk_penalty")
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${FACTOR_LABEL[k] ?? k} ${v}`)
    .join(", ");

  const tp = [input.tp1, input.tp2, input.tp3].filter((x): x is number => x != null).join(" / ");

  const prompt = `Kamu analis saham Indonesia. Tulis narasi SINGKAT (2-3 kalimat, Bahasa Indonesia, nada "kamu") yang menjelaskan kenapa saham ${input.companyKode} masuk Daily Pick hari ini.

Data:
- Setup: ${input.setupType}
- Skor komposit: ${Math.round(input.score)}/100
- Skor per faktor (0-100): ${factors}
- Entry: ${input.entryZoneLow}–${input.entryZoneHigh}; Stop Loss: ${input.stopLoss}; Target: ${tp}; Risk/Reward: ${input.rewardRiskRatio}x

Tekankan faktor yang paling kuat dan satu hal yang perlu dipantau. JANGAN menjanjikan keuntungan. JANGAN menulis disclaimer (sudah otomatis). Langsung tulis narasinya, tanpa judul.`;

  const res = await client.chat.completions.create({
    model: config.defaultModel,
    messages: [{ role: "user", content: prompt }],
    max_tokens: 320,
    temperature: 0.4,
  });
  const text = res.choices?.[0]?.message?.content?.trim() ?? "";
  if (!text) return null;
  return { text, generatedBy: `${config.provider}:${config.defaultModel}` };
}
