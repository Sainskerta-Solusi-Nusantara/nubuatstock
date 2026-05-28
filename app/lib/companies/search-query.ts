/**
 * Pure helpers untuk typo-tolerant ticker search (IMPROVEMENT_PLAN §8.4 #26).
 *
 * Dipisah dari service (lib/companies/index.ts, lib/market-data/index.ts) supaya
 * normalisasi input & threshold scoring bisa di-unit-test tanpa DB.
 *
 * Tidak ada akses DB / HTTP di sini — murni transformasi string + konstanta.
 */

/**
 * Ambang minimum trigram similarity (pg_trgm) sebelum sebuah baris dianggap
 * "mirip cukup" dengan query. Nilai 0–1.
 *
 * - Default Postgres `pg_trgm.similarity_threshold` = 0.3.
 * - Kita pakai 0.3 untuk nama (cukup permisif: "bank bca" → "Bank Central Asia").
 * - Untuk kode (ticker pendek, 3–4 char) similarity bisa rendah walau typo dekat,
 *   jadi kode dilayani prefix/contains lebih dulu; trigram kode hanya fallback
 *   dengan threshold lebih longgar.
 */
export const TRGM_NAME_THRESHOLD = 0.3;
export const TRGM_KODE_THRESHOLD = 0.2;

/**
 * Normalisasi query search:
 * - collapse semua whitespace (spasi, tab, newline) jadi single space
 * - trim leading/trailing
 *
 * Return string yang sudah bersih (case dipertahankan; caller yang uppercase
 * untuk match kode). Empty string kalau tidak ada konten signifikan.
 */
export function normalizeSearchQuery(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

/**
 * Heuristik: apakah query terlihat seperti KODE ticker (alfanumerik pendek tanpa
 * spasi)? Kalau ya, prioritaskan match pada kolom `kode` + threshold trigram kode.
 *
 * Contoh true: "BBRI", "TLKOM", "BBR", "GOTO". False: "bank bca", "telkom indonesia".
 */
export function looksLikeTicker(normalized: string): boolean {
  return /^[A-Za-z0-9]{1,6}$/.test(normalized);
}

/**
 * Escape wildcard SQL LIKE/ILIKE (`%`, `_`, `\`) supaya input user tidak jadi
 * wildcard liar. Tidak menambah `%` di sini — caller yang menentukan posisi.
 */
export function escapeLikePattern(s: string): string {
  return s.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

/**
 * Rank tier untuk ordering hasil (kecil = lebih relevan). Pure scoring yang
 * mencerminkan ekspresi CASE di SQL — diekspor untuk dokumentasi & test.
 *
 *   0 = exact kode match
 *   1 = prefix kode match
 *   2 = trigram / contains (typo tolerance)
 */
export function rankTier(opts: { kode: string; queryUpper: string }): 0 | 1 | 2 {
  const { kode, queryUpper } = opts;
  if (kode === queryUpper) return 0;
  if (kode.startsWith(queryUpper)) return 1;
  return 2;
}
