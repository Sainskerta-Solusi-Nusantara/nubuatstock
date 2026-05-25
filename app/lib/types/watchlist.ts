import { z } from "zod";
import {
  watchlists,
  watchlistItems,
} from "@/db/schema/user-data";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

/**
 * Public types & Zod schemas untuk domain watchlist.
 *
 * Konvensi:
 * - PASTIKAN tidak ada FE/BE drift dengan re-export DB row types.
 * - Zod schema dipakai BE untuk validasi request & FE untuk RHF.
 */

export type {
  Watchlist,
  NewWatchlist,
  WatchlistItem,
  NewWatchlistItem,
} from "@/db/schema/user-data";

// =================== Zod schemas (request validation) ===================

export const watchlistSelectSchema = createSelectSchema(watchlists);
export const watchlistInsertSchema = createInsertSchema(watchlists);
export const watchlistItemSelectSchema = createSelectSchema(watchlistItems);
export const watchlistItemInsertSchema = createInsertSchema(watchlistItems);

const colorHex = z
  .string()
  .regex(/^#([0-9a-fA-F]{6})$/, "Color harus dalam format hex #RRGGBB");

export const createWatchlistInputSchema = z.object({
  name: z.string().min(1, "Nama watchlist wajib diisi").max(80),
  colorHex: colorHex.optional(),
});
export type CreateWatchlistInput = z.infer<typeof createWatchlistInputSchema>;

export const renameWatchlistInputSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  colorHex: colorHex.nullish(),
});
export type RenameWatchlistInput = z.infer<typeof renameWatchlistInputSchema>;

export const reorderWatchlistsInputSchema = z.object({
  order: z
    .array(z.object({ id: z.string().min(1), sortOrder: z.number().int().min(0) }))
    .min(1),
});
export type ReorderWatchlistsInput = z.infer<typeof reorderWatchlistsInputSchema>;

export const addItemInputSchema = z.object({
  companyKode: z
    .string()
    .min(1, "Kode emiten wajib diisi")
    .max(10)
    .transform((v) => v.toUpperCase()),
  note: z.string().max(500).optional(),
});
export type AddItemInput = z.infer<typeof addItemInputSchema>;

export const updateItemInputSchema = z.object({
  sortOrder: z.number().int().min(0).optional(),
  note: z.string().max(500).nullish(),
  targetWatchlistId: z.string().min(1).optional(),
});
export type UpdateItemInput = z.infer<typeof updateItemInputSchema>;

export const reorderItemsInputSchema = z.object({
  order: z
    .array(z.object({ id: z.string().min(1), sortOrder: z.number().int().min(0) }))
    .min(1),
});
export type ReorderItemsInput = z.infer<typeof reorderItemsInputSchema>;

// =================== Service-level view types ===================

/**
 * Quote shape yang di-expect dari Agent 5 (`lib/market-data`).
 * Lokal-defined supaya tidak crash kalau Agent 5 belum publish type.
 * Agent 5 boleh widen ini di types/market.ts sesuai kebutuhan.
 */
export interface WatchlistQuoteSnapshot {
  companyKode: string;
  last: number | null;
  prevClose: number | null;
  changeAbs: number | null;
  changePct: number | null;
  volume: number | null;
  value: number | null;
  asOf: string | null;
}

export interface WatchlistItemView {
  id: string;
  watchlistId: string;
  companyKode: string;
  namaPerusahaan: string | null;
  sectorKode: string | null;
  sortOrder: number;
  note: string | null;
  quote: WatchlistQuoteSnapshot | null;
}

export interface WatchlistView {
  id: string;
  userId: string;
  name: string;
  sortOrder: number;
  colorHex: string | null;
  isDefault: boolean;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface WatchlistDetail extends WatchlistView {
  items: WatchlistItemView[];
}
