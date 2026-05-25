import { z } from "zod";
import { semanticSearchResearch } from "../rag";

/**
 * AI tool: `search_research` — semantic search across published research reports.
 * Schema compatible dengan OpenAI function calling.
 */

export const searchResearchTool = {
  name: "search_research",
  description:
    "Cari laporan riset emiten yang relevan dengan query. Berguna untuk: " +
    "(a) ringkas riset dari analyst tentang ticker tertentu, (b) bandingkan view " +
    "antar laporan, (c) cari laporan dengan tema tertentu (mis. 'banking outlook 2026'). " +
    "Returns top 5 laporan dengan excerpt yang paling match + URL.",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Query semantic. Bisa pertanyaan natural language, ticker, atau tema.",
      },
      limit: {
        type: "number",
        description: "Maksimal jumlah hasil (default 5, max 10)",
        default: 5,
      },
    },
    required: ["query"],
  },
} as const;

export const searchResearchInputSchema = z.object({
  query: z.string().min(2).max(500),
  limit: z.number().int().min(1).max(10).optional(),
});

export async function executeSearchResearch(input: unknown) {
  const args = searchResearchInputSchema.parse(input);
  const results = await semanticSearchResearch(args.query, { limit: args.limit ?? 5 });

  if (results.length === 0) {
    return {
      found: 0,
      message:
        "Tidak ada laporan riset yang match. Mungkin: (a) belum ada riset terbit, (b) embeddings belum di-generate (run `npm run db:embed-research`), atau (c) embeddings API key belum di-set.",
      reports: [],
    };
  }

  return {
    found: results.length,
    reports: results.map((r) => ({
      slug: r.reportSlug,
      title: r.reportTitle,
      ticker: r.companyKode,
      company_name: r.companyName,
      rating: r.rating,
      target_price: r.targetPrice ? `Rp ${new Intl.NumberFormat("id-ID").format(Number(r.targetPrice))}` : null,
      published: r.publishedAt ? r.publishedAt.toISOString().slice(0, 10) : null,
      excerpt: r.excerpt,
      relevance: `${(r.similarity * 100).toFixed(0)}%`,
      url: `/research/${r.reportSlug}`,
    })),
  };
}
