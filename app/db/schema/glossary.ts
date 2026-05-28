import { sql } from "drizzle-orm";
import { boolean, index, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";
import { jsonbT, ulid, withTimestamps } from "./_base";

/**
 * `glossary_terms` — kamus istilah saham (Glossary).
 *
 * DB-driven + ISR di halaman publik /glossary. Superadmin/admin bisa CRUD
 * (CMS) — saat ini seed-only, editor admin = follow-up.
 *
 * - `slug` unik → dipakai untuk URL /glossary/[slug] (SEO-friendly).
 * - `term` istilah yang ditampilkan (mis. "ARA").
 * - `definition` penjelasan lengkap (text, boleh multi-paragraf).
 * - `category` grouping: "Teknikal" | "Fundamental" | "Bandarmologi" | "Umum".
 * - `aliases` sinonim/singkatan untuk membantu pencarian (jsonb array).
 * - `relatedSlugs` istilah terkait untuk cross-link (jsonb array of slug).
 * - `published` false → disembunyikan dari halaman publik (draft).
 */
export const glossaryTerms = pgTable(
  "glossary_terms",
  {
    id: ulid(),
    slug: text("slug").notNull(),
    term: text("term").notNull(),
    definition: text("definition").notNull(),
    category: text("category").notNull().default("Umum"),
    aliases: jsonbT<string[]>("aliases").notNull().default(sql`'[]'::jsonb`),
    relatedSlugs: jsonbT<string[]>("related_slugs").notNull().default(sql`'[]'::jsonb`),
    published: boolean("published").notNull().default(true),
    ...withTimestamps,
  },
  (t) => [
    uniqueIndex("glossary_terms_slug_uq").on(t.slug),
    index("glossary_terms_term_idx").on(t.term),
    index("glossary_terms_category_idx").on(t.category),
    index("glossary_terms_published_idx").on(t.published),
  ],
);

export type GlossaryTerm = typeof glossaryTerms.$inferSelect;
export type NewGlossaryTerm = typeof glossaryTerms.$inferInsert;
