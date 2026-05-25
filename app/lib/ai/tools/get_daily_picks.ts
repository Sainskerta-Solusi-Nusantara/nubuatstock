import type { ToolDefinition } from "./types";
import { logger } from "@/lib/logger";

interface GetDailyPicksArgs {
  date?: string;
  limit?: number;
}

/**
 * Wrap Agent 8 (`lib/picks`). Dynamic import — kalau Agent 8 belum ready, return error.
 */
export const getDailyPicksTool: ToolDefinition<GetDailyPicksArgs> = {
  name: "get_daily_picks",
  description:
    "Ambil daftar Daily Picks (rekomendasi saham harian dari engine multi-factor scoring). Gunakan saat user bertanya 'apa rekomendasi hari ini?' atau 'pick apa saja yang dipublish?'.",
  parameters: {
    type: "object",
    properties: {
      date: {
        type: "string",
        description: "Tanggal ISO (YYYY-MM-DD). Default: hari trading terakhir.",
      },
      limit: {
        type: "number",
        description: "Maksimum jumlah picks (1-20). Default 10.",
        minimum: 1,
        maximum: 20,
      },
    },
    additionalProperties: false,
  },
  async handler(args) {
    try {
      const mod = (await import("@/lib/picks").catch(() => null)) as
        | { listDailyPicks?: (opts?: unknown) => Promise<unknown> }
        | null;
      if (!mod?.listDailyPicks) {
        return {
          ok: false,
          error: {
            code: "PICKS_NOT_READY",
            message: "Modul Daily Picks belum tersedia.",
          },
        };
      }
      const data = await mod.listDailyPicks({
        date: args.date,
        limit: args.limit ?? 10,
      });
      return { ok: true, data };
    } catch (err) {
      logger.warn({ err }, "get_daily_picks tool error");
      return {
        ok: false,
        error: {
          code: "PICKS_FETCH_FAILED",
          message: err instanceof Error ? err.message : "Gagal mengambil daily picks",
        },
      };
    }
  },
};
