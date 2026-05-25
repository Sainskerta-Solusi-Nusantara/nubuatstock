import type { ToolDefinition } from "./types";
import { logger } from "@/lib/logger";

interface GetQuoteArgs {
  kode: string;
}

/**
 * `get_quote` — ambil snapshot harga real-time / latest EOD untuk satu ticker IDX.
 *
 * Wrapper di atas Agent 5 (`lib/market-data.getQuote`). Kalau Agent 5 belum ready
 * (modul tidak ditemukan), tool return error yang jelas — JANGAN return data fake.
 */
export const getQuoteTool: ToolDefinition<GetQuoteArgs> = {
  name: "get_quote",
  description:
    "Ambil snapshot harga terkini untuk satu ticker saham Indonesia (IDX). Gunakan ini saat user bertanya tentang harga, perubahan harian, atau volume terkini suatu emiten.",
  parameters: {
    type: "object",
    properties: {
      kode: {
        type: "string",
        description:
          "Kode ticker IDX 3-6 karakter huruf kapital (contoh: BBRI, GOTO, BBCA). Wajib uppercase.",
        pattern: "^[A-Z0-9]{3,6}$",
      },
    },
    required: ["kode"],
    additionalProperties: false,
  },
  async handler(args) {
    const kode = args.kode?.toUpperCase?.();
    if (!kode || !/^[A-Z0-9]{3,6}$/.test(kode)) {
      return {
        ok: false,
        error: { code: "INVALID_TICKER", message: "Format ticker tidak valid." },
      };
    }
    try {
      const mod = (await import("@/lib/market-data").catch(() => null)) as
        | { getQuote?: (k: string) => Promise<unknown> }
        | null;
      if (!mod?.getQuote) {
        return {
          ok: false,
          error: {
            code: "MARKET_DATA_NOT_READY",
            message:
              "Layanan data harga belum tersedia. Admin perlu konfigurasi vendor data di /admin/config.",
          },
        };
      }
      const quote = await mod.getQuote(kode);
      return { ok: true, data: quote };
    } catch (err) {
      logger.warn({ err, kode }, "get_quote tool error");
      return {
        ok: false,
        error: {
          code: "QUOTE_FETCH_FAILED",
          message: err instanceof Error ? err.message : "Gagal mengambil quote",
        },
      };
    }
  },
};
