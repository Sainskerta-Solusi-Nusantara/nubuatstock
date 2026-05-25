import {
  date,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { bigint } from "drizzle-orm/pg-core";
import { ulid, withTimestamps } from "./_base";

/**
 * Insider / Major Shareholder tracker.
 *
 * Sumber data:
 *   - KSEI: laporan kepemilikan ≥5% (per regulator)
 *   - IDX e-Reporting: keterbukaan informasi insider trading
 *   - Manual entry oleh superadmin (research data)
 *
 * Schema:
 *   - major_shareholders: snapshot kepemilikan ≥5% per emiten (latest by record_date)
 *   - insider_transactions: log transaksi direksi/komisaris (buy/sell)
 */

export const majorShareholders = pgTable(
  "major_shareholders",
  {
    id: ulid(),
    companyKode: text("company_kode").notNull(),
    /** Nama pemilik (perorangan atau institusi) */
    holderName: text("holder_name").notNull(),
    /** Klasifikasi: 'individual' | 'institution' | 'government' | 'mutual_fund' | 'foreign' | 'related_party' */
    holderType: text("holder_type", { enum: ["individual", "institution", "government", "mutual_fund", "foreign", "related_party"] })
      .notNull()
      .default("individual"),
    sharesOwned: bigint("shares_owned", { mode: "bigint" }).notNull(),
    ownershipPct: numeric("ownership_pct", { precision: 8, scale: 4 }).notNull(),
    /** Tanggal record (per filing terakhir) */
    recordDate: date("record_date", { mode: "string" }).notNull(),
    /** Source: 'ksei' | 'idx_filing' | 'manual' */
    source: text("source").notNull().default("manual"),
    sourceUrl: text("source_url"),
    notes: text("notes"),
    ...withTimestamps,
  },
  (t) => [
    uniqueIndex("major_shareholders_uq").on(t.companyKode, t.holderName, t.recordDate),
    index("major_shareholders_kode_idx").on(t.companyKode),
    index("major_shareholders_holder_idx").on(t.holderName),
    index("major_shareholders_pct_idx").on(t.ownershipPct),
  ],
);

export const insiderTransactions = pgTable(
  "insider_transactions",
  {
    id: ulid(),
    companyKode: text("company_kode").notNull(),
    insiderName: text("insider_name").notNull(),
    /** Jabatan: 'direktur', 'komisaris', 'pemegang_saham_pengendali', 'related_party' */
    insiderRole: text("insider_role").notNull(),
    side: text("side", { enum: ["buy", "sell"] }).notNull(),
    sharesTransacted: bigint("shares_transacted", { mode: "bigint" }).notNull(),
    pricePerShareIdr: numeric("price_per_share_idr", { precision: 18, scale: 4 }),
    totalValueIdr: numeric("total_value_idr", { precision: 24, scale: 2 }),
    transactionDate: date("transaction_date", { mode: "string" }).notNull(),
    /** Ownership setelah transaksi (kalau available) */
    ownershipPctAfter: numeric("ownership_pct_after", { precision: 8, scale: 4 }),
    /** Filing date (kapan dilaporkan ke IDX) */
    filingDate: date("filing_date", { mode: "string" }),
    source: text("source").notNull().default("manual"),
    sourceUrl: text("source_url"),
    notes: text("notes"),
    ...withTimestamps,
  },
  (t) => [
    index("insider_tx_kode_idx").on(t.companyKode, t.transactionDate),
    index("insider_tx_name_idx").on(t.insiderName),
    index("insider_tx_side_idx").on(t.side),
  ],
);
