import { asc, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { glossaryTerms, type GlossaryTerm } from "@/db/schema/glossary";
import { ValidationError } from "@/lib/errors";
import { GLOSSARY_CATEGORIES } from "./service";

/**
 * Admin/CMS service untuk Glossary (kamus istilah saham).
 *
 * Berbeda dari `service.ts` (publik, hanya `published = true`), modul ini
 * dipakai oleh area admin untuk CRUD penuh termasuk draft (unpublished).
 * Slug auto di-generate dari `term` bila kosong, dan dijaga unik.
 */

// =================== Zod Inputs ===================

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const aliasesSchema = z.array(z.string().trim().min(1).max(120)).max(50).default([]);
const relatedSchema = z.array(z.string().trim().min(1).max(160)).max(50).default([]);

export const createGlossaryTermSchema = z.object({
  term: z.string().trim().min(1).max(160),
  definition: z.string().trim().min(1).max(20_000),
  category: z.enum(GLOSSARY_CATEGORIES).default("Umum"),
  slug: z
    .string()
    .trim()
    .max(160)
    .regex(slugRegex, "Slug harus huruf kecil/angka dipisah tanda hubung")
    .optional()
    .or(z.literal("")),
  aliases: aliasesSchema,
  relatedSlugs: relatedSchema,
  published: z.boolean().default(true),
});
export type CreateGlossaryTermInput = z.infer<typeof createGlossaryTermSchema>;

export const updateGlossaryTermSchema = z.object({
  term: z.string().trim().min(1).max(160).optional(),
  definition: z.string().trim().min(1).max(20_000).optional(),
  category: z.enum(GLOSSARY_CATEGORIES).optional(),
  slug: z
    .string()
    .trim()
    .max(160)
    .regex(slugRegex, "Slug harus huruf kecil/angka dipisah tanda hubung")
    .optional(),
  aliases: aliasesSchema.optional(),
  relatedSlugs: relatedSchema.optional(),
  published: z.boolean().optional(),
});
export type UpdateGlossaryTermInput = z.infer<typeof updateGlossaryTermSchema>;

export const togglePublishedSchema = z.object({
  published: z.boolean(),
});

// =================== Slug helpers ===================

/** Ubah term jadi slug URL-friendly (huruf kecil, tanda hubung). */
export function slugifyTerm(term: string): string {
  return term
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

/** Pastikan slug unik di tabel; tambah suffix -2, -3, ... bila bentrok. */
export async function ensureUniqueGlossarySlug(
  base: string,
  excludeId?: string,
): Promise<string> {
  const seed = base || "term";
  let candidate = seed;
  for (let i = 0; i < 50; i++) {
    const rows = await db
      .select({ id: glossaryTerms.id })
      .from(glossaryTerms)
      .where(eq(glossaryTerms.slug, candidate))
      .limit(1);
    const conflict = rows[0];
    if (!conflict) return candidate;
    if (excludeId && conflict.id === excludeId) return candidate;
    candidate = `${seed}-${i + 2}`;
  }
  return `${seed}-${Date.now()}`;
}

// =================== Queries ===================

export interface AdminGlossaryListItem {
  id: string;
  slug: string;
  term: string;
  definition: string;
  category: string;
  aliases: string[];
  relatedSlugs: string[];
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

function toAdminItem(row: GlossaryTerm): AdminGlossaryListItem {
  return {
    id: row.id,
    slug: row.slug,
    term: row.term,
    definition: row.definition,
    category: row.category,
    aliases: row.aliases,
    relatedSlugs: row.relatedSlugs,
    published: row.published,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Semua istilah (termasuk draft/unpublished) — untuk tabel admin. */
export async function listAllGlossaryTerms(): Promise<AdminGlossaryListItem[]> {
  const rows = await db
    .select()
    .from(glossaryTerms)
    .orderBy(desc(glossaryTerms.published), asc(sql`lower(${glossaryTerms.term})`));
  return rows.map(toAdminItem);
}

/** Ambil satu istilah (apa pun status published-nya). */
export async function getGlossaryTermByIdAdmin(
  id: string,
): Promise<AdminGlossaryListItem | null> {
  const rows = await db.select().from(glossaryTerms).where(eq(glossaryTerms.id, id)).limit(1);
  return rows[0] ? toAdminItem(rows[0]) : null;
}

// =================== Mutations ===================

/** Buat istilah baru. Slug auto dari term bila kosong, dijaga unik. */
export async function createGlossaryTerm(
  input: CreateGlossaryTermInput,
): Promise<AdminGlossaryListItem> {
  const base = input.slug ? slugifyTerm(input.slug) : slugifyTerm(input.term);
  if (!base) throw new ValidationError("Tidak bisa menghasilkan slug dari term");
  const slug = await ensureUniqueGlossarySlug(base);

  const [inserted] = await db
    .insert(glossaryTerms)
    .values({
      slug,
      term: input.term,
      definition: input.definition,
      category: input.category,
      aliases: input.aliases,
      relatedSlugs: input.relatedSlugs,
      published: input.published,
    })
    .returning();
  return toAdminItem(inserted!);
}

/** Update istilah. Slug hanya berubah bila dikirim eksplisit (dan dijaga unik). */
export async function updateGlossaryTerm(
  id: string,
  input: UpdateGlossaryTermInput,
): Promise<AdminGlossaryListItem | null> {
  const patch: Partial<typeof glossaryTerms.$inferInsert> = { updatedAt: new Date() };

  if (input.term !== undefined) patch.term = input.term;
  if (input.definition !== undefined) patch.definition = input.definition;
  if (input.category !== undefined) patch.category = input.category;
  if (input.aliases !== undefined) patch.aliases = input.aliases;
  if (input.relatedSlugs !== undefined) patch.relatedSlugs = input.relatedSlugs;
  if (input.published !== undefined) patch.published = input.published;

  if (input.slug !== undefined) {
    const base = slugifyTerm(input.slug);
    if (!base) throw new ValidationError("Slug tidak valid");
    patch.slug = await ensureUniqueGlossarySlug(base, id);
  }

  const [updated] = await db
    .update(glossaryTerms)
    .set(patch)
    .where(eq(glossaryTerms.id, id))
    .returning();
  return updated ? toAdminItem(updated) : null;
}

/** Toggle/atur status published. */
export async function setGlossaryTermPublished(
  id: string,
  published: boolean,
): Promise<AdminGlossaryListItem | null> {
  const [updated] = await db
    .update(glossaryTerms)
    .set({ published, updatedAt: new Date() })
    .where(eq(glossaryTerms.id, id))
    .returning();
  return updated ? toAdminItem(updated) : null;
}

/** Hapus istilah. Return slug yang dihapus (untuk revalidate) atau null. */
export async function deleteGlossaryTerm(id: string): Promise<{ slug: string } | null> {
  const [deleted] = await db
    .delete(glossaryTerms)
    .where(eq(glossaryTerms.id, id))
    .returning({ slug: glossaryTerms.slug });
  return deleted ? { slug: deleted.slug } : null;
}

// Re-export agar route admin tidak perlu import dari dua tempat.
export { GLOSSARY_CATEGORIES } from "./service";
