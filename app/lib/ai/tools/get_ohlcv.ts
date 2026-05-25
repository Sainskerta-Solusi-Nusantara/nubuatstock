import type { ToolDefinition } from "./types";
import { logger } from "@/lib/logger";

interface GetOhlcvArgs {
  kode: string;
  from?: string;
  to?: string;
  interval?: "1d" | "1w" | "1mo";
  limit?: number;
}

export const getOhlcvTool: ToolDefinition<GetOhlcvArgs> = {
  name: "get_ohlcv",
  description:
    "Ambil data historis OHLCV (open/high/low/close/volume) untuk satu ticker IDX. Gunakan saat user minta analisis tren, indikator teknikal, atau perbandingan periode.",
  parameters: {
    type: "object",
    properties: {
      kode: {
        type: "string",
        description: "Kode ticker IDX uppercase (mis. BBRI).",
        pattern: "^[A-Z0-9]{3,6}$",
      },
      from: {
        type: "string",
        description: "Tanggal mulai ISO (YYYY-MM-DD). Opsional, default 90 hari ke belakang.",
      },
      to: {
        type: "string",
        description: "Tanggal akhir ISO (YYYY-MM-DD). Opsional, default hari ini.",
      },
      interval: {
        type: "string",
        enum: ["1d", "1w", "1mo"],
        description: "Granularitas data. Default 1d (daily).",
      },
      limit: {
        type: "number",
        description: "Maksimum jumlah bar (1-500). Default 90.",
        minimum: 1,
        maximum: 500,
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
        | { getOhlcv?: (k: string, opts: unknown) => Promise<unknown> }
        | null;
      if (!mod?.getOhlcv) {
        return {
          ok: false,
          error: {
            code: "MARKET_DATA_NOT_READY",
            message: "Layanan OHLCV belum tersedia. Admin perlu konfigurasi vendor data feed.",
          },
        };
      }
      const data = await mod.getOhlcv(kode, {
        from: args.from,
        to: args.to,
        interval: args.interval ?? "1d",
        limit: args.limit ?? 90,
      });
      return { ok: true, data };
    } catch (err) {
      logger.warn({ err, args }, "get_ohlcv tool error");
      return {
        ok: false,
        error: {
          code: "OHLCV_FETCH_FAILED",
          message: err instanceof Error ? err.message : "Gagal mengambil OHLCV",
        },
      };
    }
  },
};
