#!/usr/bin/env tsx
/**
 * scripts/embed-research.ts
 *
 * Generate embeddings untuk seluruh published research reports.
 * Idempotent — skip kalau (report_id, chunk_index) sudah ada.
 *
 * Usage:
 *   npm run db:embed-research           # incremental — skip existing
 *   FORCE=1 npm run db:embed-research   # re-embed all
 *
 * Prereq: secret `embeddings.voyage.api_key` (atau openai/anthropic) di /admin/secrets.
 */

import { and, eq, isNull, notExists, sql } from "drizzle-orm";
import { db } from "../lib/db";
import { researchReports } from "../db/schema/research";
import { researchEmbeddings, EMBEDDINGS_INDEX_SQL } from "../db/schema/embeddings";
import { embed, chunkResearchReport, isEmbeddingsAvailable } from "../lib/ai/embeddings";
import { logger } from "../lib/logger";

const FORCE = process.env.FORCE === "1";

async function main() {
  if (!(await isEmbeddingsAvailable())) {
    console.error(
      "❌ Embedding provider belum di-set. Tambah `embeddings.voyage.api_key` (atau openai) di /admin/secrets.",
    );
    process.exit(1);
  }

  // Ensure HNSW index ada
  try {
    await db.execute(sql.raw(EMBEDDINGS_INDEX_SQL));
    logger.info("HNSW index ensured");
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "HNSW index creation skipped (mungkin sudah ada atau pgvector version <0.5)");
  }

  const reports = await db
    .select()
    .from(researchReports)
    .where(and(eq(researchReports.status, "published"), isNull(researchReports.deletedAt)));

  logger.info({ count: reports.length, force: FORCE }, "Embedding research reports...");

  let totalChunks = 0;
  let totalReports = 0;
  let totalTokens = 0;

  for (const report of reports) {
    if (!FORCE) {
      const existing = await db
        .select({ cnt: sql<number>`count(*)::int` })
        .from(researchEmbeddings)
        .where(eq(researchEmbeddings.reportId, report.id));
      if (Number(existing[0]?.cnt ?? 0) > 0) {
        logger.info({ reportId: report.id, slug: report.slug }, "Skip (already embedded)");
        continue;
      }
    } else {
      await db.delete(researchEmbeddings).where(eq(researchEmbeddings.reportId, report.id));
    }

    const chunks = chunkResearchReport({
      title: report.title,
      summary: report.summary,
      keyHighlights: report.keyHighlights ?? [],
      catalysts: report.catalysts ?? [],
      riskFactors: report.riskFactors ?? [],
      sections: report.sections ?? [],
    });

    if (chunks.length === 0) continue;

    // Batch embed (Voyage supports batch — kirim semua sekaligus)
    const texts = chunks.map((c) => c.text);
    const result = await embed(texts, { inputType: "document" });

    if (result.embeddings.length !== chunks.length) {
      logger.warn(
        { reportId: report.id, expected: chunks.length, got: result.embeddings.length },
        "Embedding count mismatch — skip",
      );
      continue;
    }

    // Insert in batch
    const rows = chunks.map((chunk, i) => ({
      reportId: report.id,
      chunkIndex: chunk.index,
      chunkText: chunk.text,
      chunkType: chunk.type,
      sectionKey: chunk.sectionKey ?? null,
      embedding: result.embeddings[i]!,
      model: result.model,
      tokensUsed: Math.round((result.tokensUsed * texts[i]!.length) / texts.reduce((s, t) => s + t.length, 1)),
    }));

    await db.insert(researchEmbeddings).values(rows).onConflictDoNothing();

    totalReports++;
    totalChunks += chunks.length;
    totalTokens += result.tokensUsed;
    logger.info({ reportId: report.id, slug: report.slug, chunks: chunks.length, tokens: result.tokensUsed }, "Embedded");
  }

  console.log(`\n✓ ${totalReports} reports embedded, ${totalChunks} chunks, ${totalTokens} tokens used.\n`);
  process.exit(0);
}

main().catch((err) => {
  logger.error({ err }, "Embed research failed");
  process.exit(1);
});
