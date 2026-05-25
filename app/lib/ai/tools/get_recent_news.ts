import type { ToolDefinition } from "./types";
import { logger } from "@/lib/logger";

interface GetRecentNewsArgs {
  ticker?: string;
  sentiment?: "bullish" | "neutral" | "bearish";
  limit?: number;
}

/**
 * `get_recent_news` — ambil berita finansial Indonesia terbaru.
 *
 * Use cases:
 * - "Apa berita terbaru BBRI minggu ini?" → ticker=BBRI
 * - "Berita pasar saham hari ini" → no ticker
 * - "Apa berita bearish hari ini?" → sentiment=bearish
 *
 * Output dirancang untuk konsumsi LLM: array of { title, summary, sentiment, score, published, source, url }.
 */
export const getRecentNewsTool: ToolDefinition<GetRecentNewsArgs> = {
  name: "get_recent_news",
  description:
    "Ambil daftar berita keuangan & saham Indonesia terbaru (sudah di-tag sentimen oleh AI). " +
    "Filter optional: ticker spesifik (BBRI, GOTO, dll), atau sentiment (bullish/neutral/bearish). " +
    "Default mengembalikan 10 berita terbaru lintas sumber (CNBC Indonesia, Detik Finance, Antara, Investing.com).",
  parameters: {
    type: "object",
    properties: {
      ticker: {
        type: "string",
        description:
          "Opsional. Kode ticker IDX 3-6 huruf kapital (BBRI, GOTO). Filter hanya artikel yang menyebut ticker ini.",
        pattern: "^[A-Z0-9]{3,6}$",
      },
      sentiment: {
        type: "string",
        enum: ["bullish", "neutral", "bearish"],
        description: "Opsional. Filter berdasarkan sentimen artikel.",
      },
      limit: {
        type: "number",
        description: "Jumlah artikel yang dikembalikan. Default 10, maksimum 20.",
        minimum: 1,
        maximum: 20,
      },
    },
    additionalProperties: false,
  },
  async handler(args) {
    try {
      const { listNews } = await import("@/lib/news/service");
      const articles = await listNews({
        ticker: args.ticker?.toUpperCase(),
        sentiment: args.sentiment,
        limit: Math.min(Math.max(args.limit ?? 10, 1), 20),
      });

      if (articles.length === 0) {
        return {
          ok: true,
          data: {
            count: 0,
            articles: [],
            note: args.ticker
              ? `Tidak ada berita untuk ticker ${args.ticker} di database. Coba ticker lain atau hilangkan filter.`
              : "Tidak ada berita yang cocok dengan filter.",
          },
        };
      }

      return {
        ok: true,
        data: {
          count: articles.length,
          articles: articles.map((a) => ({
            title: a.title,
            summary: a.summary,
            url: a.url,
            published: a.publishedAt.toISOString(),
            source: a.sourceName,
            sentiment: a.sentiment,
            sentimentScore: a.sentimentScore,
            sentimentReason: a.sentimentReason,
            tickers: a.tickers.map((t) => t.kode),
          })),
        },
      };
    } catch (err) {
      logger.warn({ err, args }, "get_recent_news tool error");
      return {
        ok: false,
        error: {
          code: "NEWS_FETCH_FAILED",
          message: err instanceof Error ? err.message : "Gagal mengambil berita",
        },
      };
    }
  },
};
