/**
 * RAG retriever — semantic search di pgvector index `research_embeddings`.
 * Dipakai oleh AI Copilot tool `search_research` dan internal context retrieval.
 */

import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { embedSingle } from "./embeddings";

export interface SemanticSearchResult {
  reportId: string;
  reportSlug: string;
  reportTitle: string;
  companyKode: string | null;
  companyName: string | null;
  rating: string;
  targetPrice: string | null;
  publishedAt: Date | null;
  excerpt: string;
  excerptType: string;
  similarity: number;
}

export async function semanticSearchResearch(
  query: string,
  opts: { limit?: number; minSimilarity?: number } = {},
): Promise<SemanticSearchResult[]> {
  const limit = opts.limit ?? 5;
  const minSim = opts.minSimilarity ?? 0.3;

  const qVec = await embedSingle(query, { inputType: "query" });
  if (!qVec || qVec.length === 0) return [];

  const vecLiteral = `[${qVec.join(",")}]`;
  const maxDistance = 2 - minSim * 2;

  try {
    const rows = (await db.execute(sql`
      WITH ranked AS (
        SELECT
          e.report_id,
          e.chunk_text AS excerpt,
          e.chunk_type AS excerpt_type,
          (e.embedding <=> ${vecLiteral}::vector) AS distance,
          ROW_NUMBER() OVER (PARTITION BY e.report_id ORDER BY e.embedding <=> ${vecLiteral}::vector) AS rn
        FROM research_embeddings e
      )
      SELECT
        ranked.report_id,
        r.slug AS report_slug,
        r.title AS report_title,
        r.company_kode,
        c.nama_perusahaan AS company_name,
        r.rating,
        r.target_price,
        r.published_at,
        ranked.excerpt,
        ranked.excerpt_type,
        ranked.distance
      FROM ranked
      JOIN research_reports r ON r.id = ranked.report_id
      LEFT JOIN companies c ON c.kode = r.company_kode
      WHERE ranked.rn = 1
        AND r.status = 'published'
        AND r.deleted_at IS NULL
        AND ranked.distance < ${maxDistance}
      ORDER BY ranked.distance ASC
      LIMIT ${limit}
    `)) as unknown as Array<{
      report_id: string;
      report_slug: string;
      report_title: string;
      company_kode: string | null;
      company_name: string | null;
      rating: string;
      target_price: string | null;
      published_at: Date | null;
      excerpt: string;
      excerpt_type: string;
      distance: number;
    }>;

    return rows.map((r) => ({
      reportId: r.report_id,
      reportSlug: r.report_slug,
      reportTitle: r.report_title,
      companyKode: r.company_kode,
      companyName: r.company_name,
      rating: r.rating,
      targetPrice: r.target_price,
      publishedAt: r.published_at ? new Date(r.published_at) : null,
      excerpt: r.excerpt,
      excerptType: r.excerpt_type,
      similarity: 1 - r.distance / 2,
    }));
  } catch {
    return [];
  }
}

// Backward-compat interface untuk chat.ts kalau pakai pattern lama
export interface RagChunk {
  content: string;
  source: string;
  score: number;
  metadata?: Record<string, unknown>;
}

export interface RagQueryOptions {
  query: string;
  limit?: number;
  minScore?: number;
}

/**
 * Backward-compat alias for old `retrieveContext` interface used by Agent 7's
 * lib/ai/index.ts barrel. Same behavior as `retrieveChunks`.
 */
export const retrieveContext = retrieveChunks;

export async function retrieveChunks(opts: RagQueryOptions): Promise<RagChunk[]> {
  const results = await semanticSearchResearch(opts.query, {
    limit: opts.limit ?? 5,
    minSimilarity: opts.minScore ?? 0.3,
  });
  return results.map((r) => ({
    content: r.excerpt,
    source: `research:${r.reportSlug}`,
    score: r.similarity,
    metadata: {
      reportTitle: r.reportTitle,
      ticker: r.companyKode,
      companyName: r.companyName,
      rating: r.rating,
      targetPrice: r.targetPrice,
      url: `/research/${r.reportSlug}`,
      publishedAt: r.publishedAt,
    },
  }));
}
