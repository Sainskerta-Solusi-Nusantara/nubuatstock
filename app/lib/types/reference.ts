import { z } from "zod";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import {
  countries,
  currencies,
  indices,
  industries,
  papanListing,
  sectors,
  subSectors,
} from "@/db/schema/reference";

/**
 * Re-export DB row types from schema so consumer apps import dari satu tempat.
 */
export type {
  Country,
  Currency,
  Industry,
  Index as IndexRow,
  NewCountry,
  NewCurrency,
  NewIndex,
  NewIndustry,
  NewPapanListing,
  NewSector,
  NewSubSector,
  PapanListing,
  Sector,
  SubSector,
} from "@/db/schema/reference";

// =================== Zod schemas (untuk API validation) ===================

export const papanListingSelectSchema = createSelectSchema(papanListing);
export const papanListingInsertSchema = createInsertSchema(papanListing);

export const sectorSelectSchema = createSelectSchema(sectors);
export const sectorInsertSchema = createInsertSchema(sectors);

export const subSectorSelectSchema = createSelectSchema(subSectors);
export const subSectorInsertSchema = createInsertSchema(subSectors);

export const industrySelectSchema = createSelectSchema(industries);
export const industryInsertSchema = createInsertSchema(industries);

export const indexSelectSchema = createSelectSchema(indices);
export const indexInsertSchema = createInsertSchema(indices);

export const currencySelectSchema = createSelectSchema(currencies);
export const currencyInsertSchema = createInsertSchema(currencies);

export const countrySelectSchema = createSelectSchema(countries);
export const countryInsertSchema = createInsertSchema(countries);

// =================== Helper union / lookup types ===================

export const papanListingKodeSchema = z.enum([
  "UTAMA",
  "PENGEMBANGAN",
  "AKSELERASI",
  "EKONOMI_BARU",
  "PEMANTAUAN_KHUSUS",
]);
export type PapanListingKode = z.infer<typeof papanListingKodeSchema>;

export const sectorKodeSchema = z.enum([
  "ENERGY",
  "BASIC_MATERIALS",
  "INDUSTRIALS",
  "CONSUMER_STAPLES",
  "CONSUMER_CYCLICALS",
  "HEALTHCARE",
  "FINANCIALS",
  "PROPERTIES_REAL_ESTATE",
  "TECHNOLOGY",
  "INFRASTRUCTURES",
  "TRANSPORTATION_LOGISTIC",
  "INVESTMENT_PRODUCTS",
]);
export type SectorKode = z.infer<typeof sectorKodeSchema>;

/**
 * Subset indeks "headline" yang dipakai di UI dashboard utama.
 * Daftar lengkap di tabel `indices`; daftar ini sebagai static enum untuk type-safety
 * di kode UI yang spesifik membutuhkan kode indeks tertentu.
 */
export const headlineIndexKodeSchema = z.enum([
  "IHSG",
  "LQ45",
  "IDX30",
  "IDX80",
  "KOMPAS100",
  "IDXBUMN20",
  "JII",
]);
export type HeadlineIndexKode = z.infer<typeof headlineIndexKodeSchema>;
