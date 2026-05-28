/**
 * One-off (DEV LOKAL): buat HANYA tabel glossary_terms + index, lalu seed.
 * Surgical — tidak menyentuh schema lain (hindari diff besar drizzle-kit push).
 * Jalankan: npx tsx --env-file=.env db/create-glossary.ts
 */
import { sql } from "drizzle-orm";
import { db } from "../lib/db";
import { seedGlossary } from "./seed/glossary";

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS glossary_terms (
    id text PRIMARY KEY DEFAULT gen_ulid(),
    slug text NOT NULL,
    term text NOT NULL,
    definition text NOT NULL,
    category text NOT NULL DEFAULT 'Umum',
    aliases jsonb NOT NULL DEFAULT '[]'::jsonb,
    related_slugs jsonb NOT NULL DEFAULT '[]'::jsonb,
    published boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS glossary_terms_slug_uq ON glossary_terms (slug)`,
  `CREATE INDEX IF NOT EXISTS glossary_terms_term_idx ON glossary_terms (term)`,
  `CREATE INDEX IF NOT EXISTS glossary_terms_category_idx ON glossary_terms (category)`,
  `CREATE INDEX IF NOT EXISTS glossary_terms_published_idx ON glossary_terms (published)`,
];

async function main() {
  for (const s of STATEMENTS) await db.execute(sql.raw(s));
  console.log("glossary_terms table + indexes ready");
  await seedGlossary();
  const [{ c }] = await db.execute<{ c: number }>(sql`SELECT count(*)::int AS c FROM glossary_terms`);
  console.log(`glossary seeded — total terms: ${c}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
