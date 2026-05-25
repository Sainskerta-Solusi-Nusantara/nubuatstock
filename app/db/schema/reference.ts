import { boolean, index, integer, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";
import { withTimestamps } from "./_base";

/**
 * Reference data Nubuat — semua data klasifikasi & lookup yang dipakai lintas-domain.
 *
 * Konvensi PK:
 * - Reference tables pakai natural string code (e.g. "ENERGY", "UTAMA") sebagai PK,
 *   bukan ULID. Alasannya: data immutable, idempotent seed, FK terbaca di query/log,
 *   dan kompatibel dengan klasifikasi IDX yang sudah punya kode publik.
 *
 * Sumber data: IDX-IC (Indonesia Stock Exchange Industrial Classification),
 * Papan Pencatatan IDX, ISO 4217 (currencies), ISO 3166-1 alpha-2 (countries).
 */

/**
 * `papan_listing` — 5 papan pencatatan resmi IDX per 2024 (UTAMA, PENGEMBANGAN,
 * AKSELERASI, EKONOMI BARU, PEMANTAUAN KHUSUS).
 *
 * Source: idx.co.id Peraturan Pencatatan I-A & I-V.
 */
export const papanListing = pgTable(
  "papan_listing",
  {
    kode: text("kode").primaryKey().notNull(),
    nama: text("nama").notNull(),
    deskripsi: text("deskripsi"),
    minMarketCapIdr: text("min_market_cap_idr"),
    listedCountEstimate: integer("listed_count_estimate").notNull().default(0),
    isHighRisk: boolean("is_high_risk").notNull().default(false),
    orderIndex: integer("order_index").notNull().default(0),
    ...withTimestamps,
  },
  (t) => [uniqueIndex("papan_listing_nama_uq").on(t.nama)],
);

/**
 * `sectors` — 12 sektor IDX-IC (klasifikasi mengganti JASICA sejak 25 Jan 2021).
 *
 * Source: idx.co.id/idx-industrial-classification.
 */
export const sectors = pgTable(
  "sectors",
  {
    kode: text("kode").primaryKey().notNull(),
    namaId: text("nama_id").notNull(),
    namaEn: text("nama_en").notNull(),
    deskripsi: text("deskripsi"),
    orderIndex: integer("order_index").notNull().default(0),
    colorHex: text("color_hex"),
    isActive: boolean("is_active").notNull().default(true),
    ...withTimestamps,
  },
  (t) => [
    uniqueIndex("sectors_nama_en_uq").on(t.namaEn),
    index("sectors_order_idx").on(t.orderIndex),
  ],
);

/**
 * `sub_sectors` — sub-sektor IDX-IC level 2 di bawah `sectors`.
 *
 * FK soft (text → text), enforced di app layer + index DB.
 */
export const subSectors = pgTable(
  "sub_sectors",
  {
    kode: text("kode").primaryKey().notNull(),
    sectorCode: text("sector_code")
      .notNull()
      .references(() => sectors.kode, { onDelete: "restrict", onUpdate: "cascade" }),
    namaId: text("nama_id").notNull(),
    namaEn: text("nama_en").notNull(),
    deskripsi: text("deskripsi"),
    orderIndex: integer("order_index").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    ...withTimestamps,
  },
  (t) => [
    index("sub_sectors_sector_code_idx").on(t.sectorCode),
    uniqueIndex("sub_sectors_nama_en_uq").on(t.namaEn),
  ],
);

/**
 * `industries` — IDX-IC level 3. Tabel schema disiapkan untuk extension nanti,
 * seed minimal di MVP (sub_sector cukup untuk dashboard).
 */
export const industries = pgTable(
  "industries",
  {
    kode: text("kode").primaryKey().notNull(),
    subSectorCode: text("sub_sector_code")
      .notNull()
      .references(() => subSectors.kode, { onDelete: "restrict", onUpdate: "cascade" }),
    namaId: text("nama_id").notNull(),
    namaEn: text("nama_en").notNull(),
    deskripsi: text("deskripsi"),
    orderIndex: integer("order_index").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    ...withTimestamps,
  },
  (t) => [index("industries_sub_sector_code_idx").on(t.subSectorCode)],
);

/**
 * `indices` — indeks IDX (IHSG, IDX30, LQ45, KOMPAS100, IDXBUMN20, JII, dll).
 *
 * Source: idx.co.id/produk-syariah & idx.co.id/data-pasar/data-saham/indeks-saham.
 */
export const indices = pgTable(
  "indices",
  {
    kode: text("kode").primaryKey().notNull(),
    nama: text("nama").notNull(),
    deskripsi: text("deskripsi"),
    methodology: text("methodology"),
    rebalancingPeriod: text("rebalancing_period"),
    memberCountTarget: integer("member_count_target"),
    isActive: boolean("is_active").notNull().default(true),
    isSharia: boolean("is_sharia").notNull().default(false),
    orderIndex: integer("order_index").notNull().default(0),
    ...withTimestamps,
  },
  (t) => [
    uniqueIndex("indices_nama_uq").on(t.nama),
    index("indices_active_idx").on(t.isActive),
  ],
);

/**
 * `currencies` — ISO 4217 currencies relevan untuk dual-listed & komoditas.
 */
export const currencies = pgTable(
  "currencies",
  {
    kode: text("kode").primaryKey().notNull(),
    nama: text("nama").notNull(),
    simbol: text("simbol").notNull(),
    kodeIso4217: text("kode_iso_4217").notNull(),
    isPrimary: boolean("is_primary").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    ...withTimestamps,
  },
  (t) => [uniqueIndex("currencies_iso_uq").on(t.kodeIso4217)],
);

/**
 * `countries` — ISO 3166-1 alpha-2 untuk negara relevan
 * (dual-listed, ekspor komoditas, foreign flow source).
 */
export const countries = pgTable(
  "countries",
  {
    kodeIso: text("kode_iso").primaryKey().notNull(),
    namaId: text("nama_id").notNull(),
    namaEn: text("nama_en").notNull(),
    currencyCode: text("currency_code").references(() => currencies.kode, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    isPrimary: boolean("is_primary").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    ...withTimestamps,
  },
  (t) => [
    uniqueIndex("countries_nama_en_uq").on(t.namaEn),
    index("countries_currency_idx").on(t.currencyCode),
  ],
);

// =================== Drizzle inferred types ===================

export type PapanListing = typeof papanListing.$inferSelect;
export type NewPapanListing = typeof papanListing.$inferInsert;

export type Sector = typeof sectors.$inferSelect;
export type NewSector = typeof sectors.$inferInsert;

export type SubSector = typeof subSectors.$inferSelect;
export type NewSubSector = typeof subSectors.$inferInsert;

export type Industry = typeof industries.$inferSelect;
export type NewIndustry = typeof industries.$inferInsert;

export type Index = typeof indices.$inferSelect;
export type NewIndex = typeof indices.$inferInsert;

export type Currency = typeof currencies.$inferSelect;
export type NewCurrency = typeof currencies.$inferInsert;

export type Country = typeof countries.$inferSelect;
export type NewCountry = typeof countries.$inferInsert;
