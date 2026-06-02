/**
 * Auto-fetch rekomendasi sekuritas dari sumber publik (channel Telegram), lalu
 * ekstrak jadi pick terstruktur (kode/aksi/entry/target/SL) memakai AI.
 *
 * Alur:
 *  1. Ambil pesan terbaru tiap channel (preview web Telegram, tanpa token).
 *  2. Prefilter heuristik — buang pesan yang jelas bukan rekomendasi (hemat AI).
 *  3. Ekstraksi AI (JSON) → daftar pick. Pesan tanpa rekomendasi → array kosong.
 *  4. Caller (service) upsert ke `securities_picks` (idempotent per tgl+sumber+kode).
 *
 * Catatan: kualitas hasil tergantung sumber. Channel yang hanya berisi
 * market-update/berita akan menghasilkan sedikit/0 pick — itu wajar.
 */

import { z } from "zod";

import { getAiClient } from "@/lib/ai/client";
import { logger } from "@/lib/logger";
import { fetchTelegramMessages, type TelegramMessage } from "@/lib/securities/telegram";

export interface PickRow {
  pickDate: string; // YYYY-MM-DD (WIB)
  securities: string;
  kode: string;
  action: string | null;
  entryLow: number | null;
  entryHigh: number | null;
  support: number | null;
  resistance: number | null;
  target: number | null;
  stopLoss: number | null;
  rationale: string | null;
  sourceUrl: string | null;
}

export interface PickSource {
  key: string;
  securities: string; // nama sumber yang ditampilkan
  username: string; // username channel telegram
}

/** Channel publik yang sering memuat rekomendasi/technical call saham IDX. */
export const PICK_SOURCES: PickSource[] = [
  { key: "samuelsekuritas", securities: "Samuel Sekuritas", username: "samuelsekuritas" },
  { key: "creativetrader", securities: "Creative Trader", username: "creativetrader" },
  { key: "sahampemenang", securities: "Saham Pemenang", username: "sahampemenang" },
  { key: "dapursaham", securities: "Dapur Saham", username: "dapursaham" },
];

/* ---------------- Prefilter heuristik ---------------- */
const ACTION_HINTS = [
  "trading buy", "spec buy", "buy on weakness", "buy if", "akumulasi", "buy ",
  "sell ", "take profit", "target", "tp ", "tp:", "entry", "stop loss", "stoploss",
  "support", "resisten", "resistance", "rekomendasi", "cut loss", "bow ",
];
const TICKER_RE = /\b[A-Z]{3,4}\b/; // kode saham IDX (3-4 huruf kapital)
// Token kapital yang bukan kode saham (sering muncul di market update).
const TICKER_STOPWORDS = new Set([
  "IHSG", "JCI", "LQ45", "IDX", "USD", "IDR", "WIB", "EOD", "ATH", "ARA", "ARB",
  "PER", "PBV", "ROE", "EPS", "YOY", "QOQ", "MOM", "YTD", "GDP", "BBM", "PPN",
  "MSCI", "FTSE", "STI", "WSJ", "CNBC", "USA", "AS", "RI", "BI", "OJK", "RUPS",
]);

/** True bila pesan kemungkinan memuat rekomendasi (punya hint aksi + kode saham). */
export function looksLikeRecommendation(text: string): boolean {
  const lower = text.toLowerCase();
  if (!ACTION_HINTS.some((h) => lower.includes(h))) return false;
  const tickers = (text.match(/\b[A-Z]{3,4}\b/g) ?? []).filter((t) => !TICKER_STOPWORDS.has(t));
  return tickers.length > 0 && TICKER_RE.test(text);
}

/* ---------------- Ekstraksi AI ---------------- */
const aiPickSchema = z.object({
  kode: z.string().min(2).max(10),
  action: z.string().nullish(),
  entryLow: z.number().nullish(),
  entryHigh: z.number().nullish(),
  support: z.number().nullish(),
  resistance: z.number().nullish(),
  target: z.number().nullish(),
  stopLoss: z.number().nullish(),
  rationale: z.string().nullish(),
});
const aiResultSchema = z.object({ picks: z.array(aiPickSchema).default([]) });

const SYSTEM_PROMPT =
  "Kamu ekstraktor rekomendasi saham Indonesia. Dari teks yang diberikan, " +
  "keluarkan HANYA rekomendasi/technical call yang EKSPLISIT untuk saham IDX " +
  "(punya kode emiten + aksi seperti Buy/Trading Buy/Spec Buy/Buy on Weakness/Hold/Sell). " +
  "ABAIKAN: market update, daftar top gainers/losers/foreign flow, berita, edukasi, promosi. " +
  "Jangan mengarang angka — isi null kalau tidak disebut. Output JSON: " +
  '{"picks":[{"kode","action","entryLow","entryHigh","support","resistance","target","stopLoss","rationale"}]}. ' +
  "kode = kode emiten huruf kapital. rationale = ringkas (<140 char) Bahasa Indonesia. " +
  "Kalau tidak ada rekomendasi eksplisit, kembalikan {\"picks\":[]}.";

/** Ekstrak pick dari satu teks pesan. Mengembalikan [] bila tak ada rekomendasi. */
export async function extractPicksFromText(
  text: string,
  meta: { securities: string; pickDate: string; sourceUrl: string | null },
): Promise<PickRow[]> {
  const { client, config } = await getAiClient();
  const res = await client.chat.completions.create({
    model: config.defaultModel,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: text.slice(0, 4000) },
    ],
    max_tokens: 800,
    temperature: 0.1,
    response_format: { type: "json_object" },
  });
  const raw = res.choices?.[0]?.message?.content?.trim();
  if (!raw) return [];

  let parsed: z.infer<typeof aiResultSchema>;
  try {
    parsed = aiResultSchema.parse(JSON.parse(raw));
  } catch (err) {
    logger.warn({ err, securities: meta.securities }, "securities-picks: AI output tidak valid JSON");
    return [];
  }

  const rows: PickRow[] = [];
  for (const p of parsed.picks) {
    const kode = p.kode.trim().toUpperCase();
    if (!/^[A-Z]{2,10}$/.test(kode) || TICKER_STOPWORDS.has(kode)) continue;
    rows.push({
      pickDate: meta.pickDate,
      securities: meta.securities,
      kode,
      action: p.action?.trim() || null,
      entryLow: numOrNull(p.entryLow),
      entryHigh: numOrNull(p.entryHigh),
      support: numOrNull(p.support),
      resistance: numOrNull(p.resistance),
      target: numOrNull(p.target),
      stopLoss: numOrNull(p.stopLoss),
      rationale: p.rationale?.trim().slice(0, 280) || null,
      sourceUrl: meta.sourceUrl,
    });
  }
  return rows;
}

function numOrNull(v: number | null | undefined): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/* ---------------- Orkestrasi ---------------- */
function pickDateWIB(d: Date | null): string {
  const date = d ?? new Date();
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

export interface FetchPicksResult {
  rows: PickRow[];
  errors: string[];
  candidates: number; // jumlah pesan yang lolos prefilter (dikirim ke AI)
}

/**
 * Ambil + ekstrak pick dari semua sumber. Sumber yang error tidak menggagalkan
 * yang lain. Hasil ter-dedup per (sumber, kode, tanggal) — ambil yang pertama.
 */
export async function fetchSecuritiesPicks(opts?: {
  limitPerSource?: number;
  maxAiPerSource?: number;
}): Promise<FetchPicksResult> {
  const limitPerSource = opts?.limitPerSource ?? 20;
  const maxAiPerSource = opts?.maxAiPerSource ?? 8;

  const rows: PickRow[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();
  let candidates = 0;

  for (const src of PICK_SOURCES) {
    let messages: TelegramMessage[];
    try {
      messages = await fetchTelegramMessages(src.username, limitPerSource);
    } catch (err) {
      errors.push(`${src.key}: ${(err as Error).message}`);
      continue;
    }

    // Pesan terbaru dulu, lalu prefilter & cap jumlah call AI per sumber.
    const recent = [...messages].reverse().filter((m) => looksLikeRecommendation(m.text)).slice(0, maxAiPerSource);
    candidates += recent.length;

    for (const m of recent) {
      try {
        const extracted = await extractPicksFromText(m.text, {
          securities: src.securities,
          pickDate: pickDateWIB(m.publishedAt),
          sourceUrl: m.link,
        });
        for (const row of extracted) {
          const dedupKey = `${row.securities}|${row.kode}|${row.pickDate}`;
          if (seen.has(dedupKey)) continue;
          seen.add(dedupKey);
          rows.push(row);
        }
      } catch (err) {
        errors.push(`${src.key} msg ${m.messageId}: ${(err as Error).message}`);
      }
    }
  }

  return { rows, errors, candidates };
}
