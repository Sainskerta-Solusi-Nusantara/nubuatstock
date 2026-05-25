import type { ToolDefinition } from "./types";
import { logger } from "@/lib/logger";

interface GetWatchlistArgs {
  limit?: number;
}

/**
 * Wrap Agent 6 (`lib/watchlist`). Dynamic import — kalau Agent 6 belum ready, tool
 * return error yang transparan.
 */
export const getUserWatchlistTool: ToolDefinition<GetWatchlistArgs> = {
  name: "get_user_watchlist",
  description:
    "Ambil daftar ticker yang ada di watchlist user yang sedang chat. Berguna saat user bertanya 'analisa saham di watchlist saya' atau 'apa pendapatmu soal portfolio saya'.",
  parameters: {
    type: "object",
    properties: {
      limit: {
        type: "number",
        description: "Maksimum jumlah ticker (1-100). Default 50.",
        minimum: 1,
        maximum: 100,
      },
    },
    additionalProperties: false,
  },
  async handler(args, ctx) {
    if (!ctx.userId) {
      return {
        ok: false,
        error: { code: "NO_USER", message: "Tidak ada konteks user." },
      };
    }
    try {
      const mod = (await import("@/lib/watchlist").catch(() => null)) as
        | { listUserWatchlist?: (userId: string, opts?: unknown) => Promise<unknown> }
        | null;
      if (!mod?.listUserWatchlist) {
        return {
          ok: false,
          error: {
            code: "WATCHLIST_NOT_READY",
            message: "Modul watchlist belum tersedia.",
          },
        };
      }
      const data = await mod.listUserWatchlist(ctx.userId, {
        limit: args.limit ?? 50,
      });
      return { ok: true, data };
    } catch (err) {
      logger.warn({ err }, "get_user_watchlist tool error");
      return {
        ok: false,
        error: {
          code: "WATCHLIST_FETCH_FAILED",
          message: err instanceof Error ? err.message : "Gagal mengambil watchlist",
        },
      };
    }
  },
};
