import type { NextRequest } from "next/server";
import { getConfig } from "@/lib/config";
import { handleError, ok } from "@/lib/utils/api";
import { getTodayPicks, getLatestRun } from "@/lib/picks/service";
import { requireSession, resolveDailyVisibleEntitlement } from "@/lib/picks/cross-deps";

/**
 * GET /api/picks/today
 *
 * Mengembalikan daily picks dengan trade_date = hari ini (server timezone dari config),
 * dipotong sesuai entitlement tier user (`picks.daily_visible`).
 *
 * Empty state: kalau worker belum pernah jalan / belum ada data EOD, `items` array
 * kosong + `meta.empty_reason` di-set. Klien render UI explanatory.
 */
export async function GET(_req: NextRequest) {
  try {
    const session = await requireSession();
    const tz = await getConfig<string>("runtime.timezone", { defaultValue: "Asia/Jakarta" });
    const today = formatDateInTz(new Date(), tz);
    const [picks, dailyVisible, latestRun] = await Promise.all([
      getTodayPicks({ tradeDate: today }),
      resolveDailyVisibleEntitlement(session.userId),
      getLatestRun(),
    ]);
    const visible = picks.slice(0, dailyVisible);

    let emptyReason: string | null = null;
    if (picks.length === 0) {
      if (!latestRun) {
        emptyReason =
          "Belum ada Daily Picks. Worker akan generate setelah ingest EOD pertama.";
      } else if (latestRun.status === "failed") {
        emptyReason = "Run terakhir gagal — admin perlu cek log.";
      } else if (latestRun.runDate !== today) {
        emptyReason = `Belum ada pick untuk ${today}. Run terakhir: ${latestRun.runDate}.`;
      } else {
        emptyReason = "Universe filter menghasilkan nol kandidat untuk hari ini.";
      }
    }

    return ok({
      tradeDate: today,
      items: visible,
      total: picks.length,
      visibleLimit: dailyVisible,
      hiddenCount: Math.max(0, picks.length - visible.length),
      latestRun: latestRun
        ? {
            id: latestRun.id,
            runDate: latestRun.runDate,
            status: latestRun.status,
            startedAt: latestRun.startedAt.toISOString(),
            finishedAt: latestRun.finishedAt?.toISOString() ?? null,
            picksGenerated: latestRun.picksGenerated,
          }
        : null,
      emptyReason,
    });
  } catch (err) {
    return handleError(err);
  }
}

function formatDateInTz(date: Date, tz: string): string {
  try {
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return fmt.format(date); // en-CA → YYYY-MM-DD
  } catch {
    return date.toISOString().slice(0, 10);
  }
}
