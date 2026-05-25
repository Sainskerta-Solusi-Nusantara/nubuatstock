import { z } from "zod";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import {
  brokers,
  brokerSummaryDaily,
  foreignFlowDaily,
  foreignFlowIntraday,
  quotesEod,
  quotesIntraday,
} from "@/db/schema/market";

/**
 * Re-export DB row types.
 */
export type {
  Broker,
  BrokerSummaryDaily,
  ForeignFlowDaily,
  ForeignFlowIntraday,
  NewBroker,
  NewBrokerSummaryDaily,
  NewForeignFlowDaily,
  NewForeignFlowIntraday,
  NewQuoteEod,
  NewQuoteIntraday,
  QuoteEod,
  QuoteIntraday,
} from "@/db/schema/market";

// =================== Drizzle-derived Zod schemas ===================

export const quoteEodSelectSchema = createSelectSchema(quotesEod);
export const quoteEodInsertSchema = createInsertSchema(quotesEod);

export const quoteIntradaySelectSchema = createSelectSchema(quotesIntraday);
export const quoteIntradayInsertSchema = createInsertSchema(quotesIntraday);

export const brokerSelectSchema = createSelectSchema(brokers);
export const brokerInsertSchema = createInsertSchema(brokers);

export const brokerSummaryDailySelectSchema = createSelectSchema(brokerSummaryDaily);
export const brokerSummaryDailyInsertSchema = createInsertSchema(brokerSummaryDaily);

export const foreignFlowDailySelectSchema = createSelectSchema(foreignFlowDaily);
export const foreignFlowDailyInsertSchema = createInsertSchema(foreignFlowDaily);

export const foreignFlowIntradaySelectSchema = createSelectSchema(foreignFlowIntraday);
export const foreignFlowIntradayInsertSchema = createInsertSchema(foreignFlowIntraday);

// =================== Enums & shared schemas ===================

export const ohlcvIntervalSchema = z.enum(["1d", "1wk", "1mo"]);
export type OhlcvInterval = z.infer<typeof ohlcvIntervalSchema>;

export const ohlcvRangeSchema = z.enum([
  "5d",
  "1mo",
  "3mo",
  "6mo",
  "1y",
  "2y",
  "5y",
  "10y",
  "ytd",
  "max",
]);
export type OhlcvRange = z.infer<typeof ohlcvRangeSchema>;

export const brokerSideSchema = z.enum(["buy", "sell", "both"]);
export type BrokerSide = z.infer<typeof brokerSideSchema>;

export const brokerKategoriSchema = z.enum(["foreign", "domestic", "local"]);
export type BrokerKategori = z.infer<typeof brokerKategoriSchema>;

export const foreignFlowGranularitySchema = z.enum(["5m", "15m", "1h", "1d"]);
export type ForeignFlowGranularity = z.infer<typeof foreignFlowGranularitySchema>;

export const intradayGranularitySchema = z.enum(["5m", "15m", "1h"]);
export type IntradayGranularity = z.infer<typeof intradayGranularitySchema>;

export const vendorNameSchema = z.enum([
  "yahoo_finance",
  "invezgo",
  "ohlc_dev",
  "itick",
  "idx_direct",
]);
export type VendorName = z.infer<typeof vendorNameSchema>;

// =================== Ticker code helpers ===================

/**
 * Ticker IDX: 3-6 char alphanumeric uppercase. Konsisten dengan Agent 2 (`tickerSchema`).
 */
export const tickerCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .min(3)
  .max(6)
  .regex(/^[A-Z0-9]+$/u, "Kode ticker harus huruf kapital/angka");

// =================== API query schemas ===================

export const quoteQuerySchema = z.object({
  refresh: z
    .union([z.literal("true"), z.literal("false")])
    .optional()
    .transform((v) => v === "true"),
});

export const ohlcvQuerySchema = z.object({
  interval: ohlcvIntervalSchema.default("1d"),
  range: ohlcvRangeSchema.default("2y"),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/u, "from must be YYYY-MM-DD")
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/u, "to must be YYYY-MM-DD")
    .optional(),
});
export type OhlcvQuery = z.infer<typeof ohlcvQuerySchema>;

export const searchQuerySchema = z.object({
  q: z.string().trim().min(1).max(64),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type SearchQuery = z.infer<typeof searchQuerySchema>;

export const brokerSummaryQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u, "from must be YYYY-MM-DD"),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u, "to must be YYYY-MM-DD"),
  side: brokerSideSchema.optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});
export type BrokerSummaryQuery = z.infer<typeof brokerSummaryQuerySchema>;

export const foreignFlowQuerySchema = z.object({
  granularity: foreignFlowGranularitySchema.default("1d"),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u).optional(),
});
export type ForeignFlowQuery = z.infer<typeof foreignFlowQuerySchema>;

// =================== DTOs (adapter & service layer) ===================

/**
 * Snapshot harga real-time / latest available untuk satu ticker.
 *
 * Semua numeric di-serialize sebagai string supaya tidak kehilangan presisi
 * di JSON transport (BigDecimal-style).
 */
export interface Quote {
  code: string;
  price: string;
  change: string;
  changePct: string;
  open: string | null;
  high: string | null;
  low: string | null;
  prevClose: string | null;
  volume: string | null;
  valueIdr: string | null;
  marketTime: string;
  marketState: "PRE" | "REGULAR" | "POST" | "CLOSED" | "UNKNOWN";
  currency: string;
  vendor: string;
}

export interface OhlcvBar {
  date: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  valueIdr?: string;
  vwap?: string;
}

export interface IntradayPoint {
  ts: string;
  price: string;
  volume: string;
}

export interface TickerSearchResult {
  code: string;
  name: string;
  exchange: string;
  type: "EQUITY" | "ETF" | "INDEX" | "OTHER";
}

export interface BrokerSummaryRow {
  tradeDate: string;
  brokerCode: string;
  brokerName: string;
  side: BrokerSide;
  volume: string;
  valueIdr: string;
  avgPrice: string | null;
  netValueIdr: string | null;
}

export interface ForeignFlowDailyRow {
  tradeDate: string;
  foreignBuyValue: string;
  foreignSellValue: string;
  netValue: string;
  foreignBuyVolume: string;
  foreignSellVolume: string;
}

export interface ForeignFlowIntradayRow {
  ts: string;
  granularity: IntradayGranularity;
  foreignBuyValue: string;
  foreignSellValue: string;
  netValue: string;
}

// =================== Events ===================

export interface MarketEodIngestedEvent {
  type: "market.eod.ingested";
  tradeDate: string;
  companiesProcessed: number;
  companiesFailed: number;
  vendor: string;
  durationMs: number;
}
