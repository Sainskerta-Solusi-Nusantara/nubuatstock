import { z } from "zod";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import {
  companies,
  corporateActions,
  dividends,
  financialStatementsMeta,
  indexConstituents,
  shareholders5pct,
} from "@/db/schema/companies";

/**
 * Re-export DB row types dari schema (single source of truth).
 */
export type {
  Company,
  CorporateAction,
  Dividend,
  FinancialStatementMeta,
  IndexConstituent,
  NewCompany,
  NewCorporateAction,
  NewDividend,
  NewFinancialStatementMeta,
  NewIndexConstituent,
  NewShareholder5pct,
  Shareholder5pct,
} from "@/db/schema/companies";

// =================== Drizzle-derived Zod schemas ===================

export const companySelectSchema = createSelectSchema(companies);
export const companyInsertSchema = createInsertSchema(companies);

export const indexConstituentSelectSchema = createSelectSchema(indexConstituents);
export const indexConstituentInsertSchema = createInsertSchema(indexConstituents);

export const corporateActionSelectSchema = createSelectSchema(corporateActions);
export const corporateActionInsertSchema = createInsertSchema(corporateActions);

export const dividendSelectSchema = createSelectSchema(dividends);
export const dividendInsertSchema = createInsertSchema(dividends);

export const shareholder5pctSelectSchema = createSelectSchema(shareholders5pct);
export const shareholder5pctInsertSchema = createInsertSchema(shareholders5pct);

export const financialStatementMetaSelectSchema = createSelectSchema(financialStatementsMeta);
export const financialStatementMetaInsertSchema = createInsertSchema(financialStatementsMeta);

// =================== Enums ===================

export const corporateActionTypeSchema = z.enum([
  "dividend",
  "stock_split",
  "reverse_split",
  "rights_issue",
  "bonus_issue",
  "merger",
  "spinoff",
  "name_change",
  "delisting",
  "relisting",
]);
export type CorporateActionType = z.infer<typeof corporateActionTypeSchema>;

export const shareholderTypeSchema = z.enum([
  "institutional",
  "individual",
  "government",
  "foreign",
  "domestic",
]);
export type ShareholderType = z.infer<typeof shareholderTypeSchema>;

export const financialPeriodTypeSchema = z.enum(["annual", "quarterly"]);
export type FinancialPeriodType = z.infer<typeof financialPeriodTypeSchema>;

// =================== API query param schemas ===================

/**
 * Ticker IDX selalu 4 huruf uppercase A-Z (dengan W untuk warrant, R untuk rights).
 * Kita validasi range 3-6 char alphanumeric uppercase untuk extensibility.
 */
export const tickerSchema = z
  .string()
  .trim()
  .min(3)
  .max(6)
  .regex(/^[A-Z0-9]+$/u, "Kode ticker harus huruf kapital/angka");

export const companyListQuerySchema = z.object({
  q: z.string().trim().min(1).max(64).optional(),
  sector: z.string().trim().min(1).max(64).optional(),
  index: z.string().trim().min(1).max(32).optional(),
  papan: z.string().trim().min(1).max(32).optional(),
  syariah: z
    .union([z.literal("true"), z.literal("false")])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  active: z
    .union([z.literal("true"), z.literal("false")])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
export type CompanyListQuery = z.infer<typeof companyListQuerySchema>;

export const companySearchQuerySchema = z.object({
  q: z.string().trim().min(1).max(64),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type CompanySearchQuery = z.infer<typeof companySearchQuerySchema>;

// =================== Composite DTO (untuk API response detail) ===================

export interface CompanyDetailDTO {
  id: string;
  kode: string;
  namaPerusahaan: string;
  papanKode: string;
  papanNama: string | null;
  sectorKode: string;
  sectorNamaId: string | null;
  sectorNamaEn: string | null;
  subSectorKode: string | null;
  subSectorNamaId: string | null;
  tanggalIpo: string | null;
  sharesOutstanding: string | null;
  marketCapIdr: string | null;
  freeFloatPct: string | null;
  isActive: boolean;
  isSyariah: boolean;
  website: string | null;
  logoUrl: string | null;
  deskripsi: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CompanyListItemDTO {
  kode: string;
  namaPerusahaan: string;
  sectorKode: string;
  papanKode: string;
  isSyariah: boolean;
  isActive: boolean;
  logoUrl: string | null;
}

export interface CompanySearchHitDTO {
  kode: string;
  namaPerusahaan: string;
  sectorKode: string;
  logoUrl: string | null;
}
