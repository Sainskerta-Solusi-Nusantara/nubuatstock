import { sql } from "drizzle-orm";
import { customType, index, integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { ulid, withTimestamps } from "./_base";
import { researchReports } from "./research";

/**
 * pgvector embedding tables untuk semantic search.
 *
 * - `research_embeddings`: 1 row per chunk per report (paragraph-level chunking).
 * - Embedding dimensionality: 1024 (Voyage voyage-3-lite default) atau 1536 (OpenAI text-embedding-3-small).
 *   Default schema pakai 1024 — kalau pakai OpenAI 1536-dim, butuh migrate kolom.
 *
 * Index: HNSW (Hierarchical Navigable Small World) — fast ANN search dengan
 * recall tinggi. pgvector v0.5+ support.
 *
 * Distance metric: cosine (best untuk semantic text similarity).
 */

const VECTOR_DIM = 1024;

// Drizzle belum punya built-in vector type — pakai customType
export const vector = customType<{ data: number[]; driverData: string }>({
  dataType: () => `vector(${VECTOR_DIM})`,
  toDriver: (value: number[]) => `[${value.join(",")}]`,
  fromDriver: (value: string) => {
    if (!value) return [];
    return value.replace(/[[\]]/g, "").split(",").map(Number);
  },
});

export const researchEmbeddings = pgTable(
  "research_embeddings",
  {
    id: ulid(),
    reportId: text("report_id")
      .notNull()
      .references(() => researchReports.id, { onDelete: "cascade" }),
    chunkIndex: integer("chunk_index").notNull(),
    chunkText: text("chunk_text").notNull(),
    chunkType: text("chunk_type").notNull().default("body"), // title | summary | section | catalyst | risk
    sectionKey: text("section_key"),
    embedding: vector("embedding").notNull(),
    model: text("model").notNull(),
    tokensUsed: integer("tokens_used"),
    ...withTimestamps,
  },
  (t) => [
    uniqueIndex("research_emb_uq").on(t.reportId, t.chunkIndex),
    index("research_emb_report_idx").on(t.reportId),
    // HNSW index on embedding for fast cosine similarity search.
    // Drizzle doesn't natively support HNSW yet — create via raw SQL in migrate.
  ],
);

export const EMBEDDING_DIM = VECTOR_DIM;

/**
 * Raw SQL untuk create HNSW index — jalankan post-migrate.
 */
export const EMBEDDINGS_INDEX_SQL = `
CREATE INDEX IF NOT EXISTS research_embeddings_hnsw_idx
ON research_embeddings
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
`;

export type ResearchEmbedding = typeof researchEmbeddings.$inferSelect;
