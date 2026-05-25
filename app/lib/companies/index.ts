import { and, asc, desc, eq, ilike, inArray, isNull, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { companies, indexConstituents } from "@/db/schema/companies";
import { papanListing, sectors, subSectors } from "@/db/schema/reference";
import { NotFoundError } from "@/lib/errors";
import type {
  Company,
  CompanyDetailDTO,
  CompanyListItemDTO,
  CompanySearchHitDTO,
} from "@/lib/types/companies";

/**
 * Service layer untuk domain Companies. Pure data access — no HTTP, no Zod.
 *
 * Pattern:
 * - Soft-delete aware: filter `deletedAt IS NULL` di semua read.
 * - `is_active` boleh dimatikan via delisting; default list filter `isActive=true`
 *   tapi caller bisa opt-in lihat semua.
 */

export interface ListOptions {
  q?: string;
  sectorKode?: string;
  papanKode?: string;
  indexKode?: string;
  isSyariah?: boolean;
  isActive?: boolean;
  limit?: number;
  offset?: number;
}

export interface ListResult<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

function clampLimit(n?: number, max = MAX_LIMIT, dflt = DEFAULT_LIMIT): number {
  if (n === undefined || n === null) return dflt;
  if (Number.isNaN(n)) return dflt;
  return Math.max(1, Math.min(max, Math.trunc(n)));
}

/**
 * Get one company by ticker dengan join sector & papan.
 * Throws NotFoundError kalau tidak ada / soft-deleted.
 */
export async function getCompany(kode: string): Promise<CompanyDetailDTO> {
  const upperKode = kode.trim().toUpperCase();
  const rows = await db
    .select({
      id: companies.id,
      kode: companies.kode,
      namaPerusahaan: companies.namaPerusahaan,
      papanKode: companies.papanKode,
      papanNama: papanListing.nama,
      sectorKode: companies.sectorKode,
      sectorNamaId: sectors.namaId,
      sectorNamaEn: sectors.namaEn,
      subSectorKode: companies.subSectorKode,
      subSectorNamaId: subSectors.namaId,
      tanggalIpo: companies.tanggalIpo,
      sharesOutstanding: companies.sharesOutstanding,
      marketCapIdr: companies.marketCapIdr,
      freeFloatPct: companies.freeFloatPct,
      isActive: companies.isActive,
      isSyariah: companies.isSyariah,
      website: companies.website,
      logoUrl: companies.logoUrl,
      deskripsi: companies.deskripsi,
      createdAt: companies.createdAt,
      updatedAt: companies.updatedAt,
    })
    .from(companies)
    .leftJoin(papanListing, eq(papanListing.kode, companies.papanKode))
    .leftJoin(sectors, eq(sectors.kode, companies.sectorKode))
    .leftJoin(subSectors, eq(subSectors.kode, companies.subSectorKode))
    .where(and(eq(companies.kode, upperKode), isNull(companies.deletedAt)))
    .limit(1);

  if (rows.length === 0) {
    throw new NotFoundError(`Company ${upperKode}`);
  }
  const r = rows[0]!;
  return {
    id: r.id,
    kode: r.kode,
    namaPerusahaan: r.namaPerusahaan,
    papanKode: r.papanKode,
    papanNama: r.papanNama,
    sectorKode: r.sectorKode,
    sectorNamaId: r.sectorNamaId,
    sectorNamaEn: r.sectorNamaEn,
    subSectorKode: r.subSectorKode,
    subSectorNamaId: r.subSectorNamaId,
    tanggalIpo: r.tanggalIpo,
    sharesOutstanding: r.sharesOutstanding === null ? null : r.sharesOutstanding.toString(),
    marketCapIdr: r.marketCapIdr,
    freeFloatPct: r.freeFloatPct,
    isActive: r.isActive,
    isSyariah: r.isSyariah,
    website: r.website,
    logoUrl: r.logoUrl,
    deskripsi: r.deskripsi,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

/**
 * List companies dengan filter + paginasi.
 * Filter `indexKode` = constituents aktif (effective_to IS NULL).
 */
export async function listCompanies(opts: ListOptions = {}): Promise<ListResult<CompanyListItemDTO>> {
  const limit = clampLimit(opts.limit);
  const offset = Math.max(0, opts.offset ?? 0);

  const conds = [isNull(companies.deletedAt)];
  if (opts.isActive !== undefined) conds.push(eq(companies.isActive, opts.isActive));
  if (opts.isSyariah !== undefined) conds.push(eq(companies.isSyariah, opts.isSyariah));
  if (opts.sectorKode) conds.push(eq(companies.sectorKode, opts.sectorKode));
  if (opts.papanKode) conds.push(eq(companies.papanKode, opts.papanKode));
  if (opts.q) {
    const term = `%${opts.q.toUpperCase()}%`;
    const termLower = `%${opts.q.toLowerCase()}%`;
    const cond = or(
      ilike(companies.kode, term),
      ilike(companies.namaPerusahaan, termLower),
    );
    if (cond) conds.push(cond);
  }
  if (opts.indexKode) {
    const constituentKodes = db
      .select({ companyKode: indexConstituents.companyKode })
      .from(indexConstituents)
      .where(
        and(
          eq(indexConstituents.indexKode, opts.indexKode),
          isNull(indexConstituents.effectiveTo),
        ),
      );
    conds.push(inArray(companies.kode, constituentKodes));
  }

  const whereExpr = and(...conds);

  const items = await db
    .select({
      kode: companies.kode,
      namaPerusahaan: companies.namaPerusahaan,
      sectorKode: companies.sectorKode,
      papanKode: companies.papanKode,
      isSyariah: companies.isSyariah,
      isActive: companies.isActive,
      logoUrl: companies.logoUrl,
    })
    .from(companies)
    .where(whereExpr)
    .orderBy(asc(companies.kode))
    .limit(limit)
    .offset(offset);

  const [totalRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(companies)
    .where(whereExpr);

  return {
    items,
    total: totalRow?.count ?? 0,
    limit,
    offset,
  };
}

/**
 * Fuzzy search untuk command palette / autocomplete.
 *
 * Strategi: prefix match di `kode` (skor tertinggi) + contains di nama.
 * Hasil terurut: exact kode first, lalu prefix, lalu name match.
 */
export async function searchCompanies(
  query: string,
  opts: { limit?: number } = {},
): Promise<CompanySearchHitDTO[]> {
  const q = query.trim();
  if (q.length === 0) return [];
  const limit = clampLimit(opts.limit, 50, 20);
  const upper = q.toUpperCase();
  const wildcardUpper = `${upper}%`;
  const wildcardLower = `%${q.toLowerCase()}%`;

  const sortExpr = sql<number>`
    CASE
      WHEN ${companies.kode} = ${upper} THEN 0
      WHEN ${companies.kode} LIKE ${wildcardUpper} THEN 1
      ELSE 2
    END
  `;

  const rows = await db
    .select({
      kode: companies.kode,
      namaPerusahaan: companies.namaPerusahaan,
      sectorKode: companies.sectorKode,
      logoUrl: companies.logoUrl,
    })
    .from(companies)
    .where(
      and(
        isNull(companies.deletedAt),
        eq(companies.isActive, true),
        or(
          ilike(companies.kode, `%${upper}%`),
          ilike(companies.namaPerusahaan, wildcardLower),
        ),
      ),
    )
    .orderBy(sortExpr, asc(companies.kode))
    .limit(limit);

  return rows.map((r) => ({
    kode: r.kode,
    namaPerusahaan: r.namaPerusahaan,
    sectorKode: r.sectorKode,
    logoUrl: r.logoUrl,
  }));
}

/**
 * List constituents indeks aktif (effective_to IS NULL).
 */
export async function listByIndex(indexKode: string): Promise<CompanyListItemDTO[]> {
  const rows = await db
    .select({
      kode: companies.kode,
      namaPerusahaan: companies.namaPerusahaan,
      sectorKode: companies.sectorKode,
      papanKode: companies.papanKode,
      isSyariah: companies.isSyariah,
      isActive: companies.isActive,
      logoUrl: companies.logoUrl,
    })
    .from(indexConstituents)
    .innerJoin(companies, eq(companies.kode, indexConstituents.companyKode))
    .where(
      and(
        eq(indexConstituents.indexKode, indexKode),
        isNull(indexConstituents.effectiveTo),
        isNull(companies.deletedAt),
      ),
    )
    .orderBy(desc(indexConstituents.weightPct), asc(companies.kode));

  return rows;
}

/**
 * List companies per sektor.
 */
export async function listBySector(sectorKode: string): Promise<CompanyListItemDTO[]> {
  const rows = await db
    .select({
      kode: companies.kode,
      namaPerusahaan: companies.namaPerusahaan,
      sectorKode: companies.sectorKode,
      papanKode: companies.papanKode,
      isSyariah: companies.isSyariah,
      isActive: companies.isActive,
      logoUrl: companies.logoUrl,
    })
    .from(companies)
    .where(
      and(
        eq(companies.sectorKode, sectorKode),
        eq(companies.isActive, true),
        isNull(companies.deletedAt),
      ),
    )
    .orderBy(asc(companies.kode));

  return rows;
}

export type { Company };
