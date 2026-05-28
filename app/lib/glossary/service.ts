import { and, asc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { glossaryTerms, type GlossaryTerm } from "@/db/schema/glossary";

/**
 * Service layer untuk Glossary (kamus istilah saham).
 *
 * Semua query hanya mengembalikan term yang `published = true` untuk halaman
 * publik. Pencarian pakai ILIKE (case-insensitive) di kolom term & definition,
 * juga mencari di aliases (jsonb) — tidak butuh ekstensi pg_trgm.
 */

export const GLOSSARY_PAGE_SIZE = 24;

export const GLOSSARY_CATEGORIES = [
  "Teknikal",
  "Fundamental",
  "Bandarmologi",
  "Umum",
] as const;
export type GlossaryCategory = (typeof GLOSSARY_CATEGORIES)[number];

export type GlossaryListItem = Pick<
  GlossaryTerm,
  "slug" | "term" | "definition" | "category" | "aliases"
>;

export interface ListGlossaryParams {
  /** Free-text search (term, definition, aliases). */
  q?: string;
  /** Filter huruf awal A–Z, atau "#" untuk non-alfabet. */
  letter?: string;
  /** Filter kategori. */
  category?: string;
  /** Halaman (1-based). */
  page?: number;
  /** Ukuran halaman. */
  pageSize?: number;
}

export interface ListGlossaryResult {
  items: GlossaryListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

function buildFilters(params: Pick<ListGlossaryParams, "q" | "letter" | "category">): SQL[] {
  const filters: SQL[] = [eq(glossaryTerms.published, true)];

  const q = params.q?.trim();
  if (q) {
    const like = `%${q}%`;
    // Cari di term, definition, dan aliases (jsonb di-cast ke text).
    const cond = or(
      ilike(glossaryTerms.term, like),
      ilike(glossaryTerms.definition, like),
      sql`${glossaryTerms.aliases}::text ILIKE ${like}`,
    );
    if (cond) filters.push(cond);
  }

  const letter = params.letter?.trim().toUpperCase();
  if (letter) {
    if (letter === "#") {
      // Term yang tidak diawali huruf A–Z.
      filters.push(sql`upper(left(${glossaryTerms.term}, 1)) !~ '^[A-Z]$'`);
    } else if (/^[A-Z]$/.test(letter)) {
      filters.push(sql`upper(left(${glossaryTerms.term}, 1)) = ${letter}`);
    }
  }

  const category = params.category?.trim();
  if (category && (GLOSSARY_CATEGORIES as readonly string[]).includes(category)) {
    filters.push(eq(glossaryTerms.category, category));
  }

  return filters;
}

/** Daftar istilah — alfabetis, dengan filter & pagination. */
export async function listGlossaryTerms(
  params: ListGlossaryParams = {},
): Promise<ListGlossaryResult> {
  const pageSize = params.pageSize ?? GLOSSARY_PAGE_SIZE;
  const page = Math.max(1, params.page ?? 1);
  const offset = (page - 1) * pageSize;

  const filters = buildFilters(params);
  const where = and(...filters);

  const [rows, countRows] = await Promise.all([
    db
      .select({
        slug: glossaryTerms.slug,
        term: glossaryTerms.term,
        definition: glossaryTerms.definition,
        category: glossaryTerms.category,
        aliases: glossaryTerms.aliases,
      })
      .from(glossaryTerms)
      .where(where)
      .orderBy(asc(sql`lower(${glossaryTerms.term})`))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(glossaryTerms)
      .where(where),
  ]);

  const total = countRows[0]?.count ?? 0;
  return {
    items: rows,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/** Ambil satu istilah lengkap berdasarkan slug (hanya yang published). */
export async function getGlossaryTermBySlug(slug: string): Promise<GlossaryTerm | null> {
  const rows = await db
    .select()
    .from(glossaryTerms)
    .where(and(eq(glossaryTerms.slug, slug), eq(glossaryTerms.published, true)))
    .limit(1);
  return rows[0] ?? null;
}

/** Ambil beberapa istilah ringkas berdasarkan slug (untuk related terms). */
export async function getGlossaryTermsBySlugs(
  slugs: string[],
): Promise<GlossaryListItem[]> {
  if (slugs.length === 0) return [];
  const rows = await db
    .select({
      slug: glossaryTerms.slug,
      term: glossaryTerms.term,
      definition: glossaryTerms.definition,
      category: glossaryTerms.category,
      aliases: glossaryTerms.aliases,
    })
    .from(glossaryTerms)
    .where(and(inArray(glossaryTerms.slug, slugs), eq(glossaryTerms.published, true)));

  // Pertahankan urutan sesuai input slugs.
  const bySlug = new Map(rows.map((r) => [r.slug, r] as const));
  return slugs.map((s) => bySlug.get(s)).filter((r): r is GlossaryListItem => Boolean(r));
}

/** Semua slug published — untuk generateStaticParams. */
export async function getAllGlossarySlugs(): Promise<string[]> {
  const rows = await db
    .select({ slug: glossaryTerms.slug })
    .from(glossaryTerms)
    .where(eq(glossaryTerms.published, true));
  return rows.map((r) => r.slug);
}

/** Hitung jumlah term per huruf awal (untuk badge di kontrol A–Z). Opsional. */
export async function getGlossaryLetterCounts(): Promise<Record<string, number>> {
  const rows = await db
    .select({
      letter: sql<string>`upper(left(${glossaryTerms.term}, 1))`,
      count: sql<number>`count(*)::int`,
    })
    .from(glossaryTerms)
    .where(eq(glossaryTerms.published, true))
    .groupBy(sql`upper(left(${glossaryTerms.term}, 1))`);

  const out: Record<string, number> = {};
  for (const r of rows) {
    const key = /^[A-Z]$/.test(r.letter) ? r.letter : "#";
    out[key] = (out[key] ?? 0) + r.count;
  }
  return out;
}
