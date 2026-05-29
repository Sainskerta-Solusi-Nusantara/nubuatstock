import { getConfig } from "@/lib/config";
import { PickCard } from "@/components/picks/PickCard";
import { PickDisclaimer } from "@/components/picks/PickDisclaimer";
import { getTodayPicks, getLatestRun } from "@/lib/picks/service";
import { requireSession, resolveDailyVisibleEntitlement } from "@/lib/picks/cross-deps";

export const dynamic = "force-dynamic";

/**
 * /picks — list today's daily picks (card grid).
 *
 * Disclaimer wajib di header & footer (sumber: app_config `app.disclaimer_text`).
 * Empty state explanatory kalau belum ada data.
 */
export default async function PicksPage() {
  const session = await requireSession();
  const [tz, disclaimer] = await Promise.all([
    getConfig<string>("runtime.timezone", { defaultValue: "Asia/Jakarta" }),
    getConfig<string>("app.disclaimer_text", { defaultValue: "" }),
  ]);
  const today = formatDateInTz(new Date(), tz);
  const [picks, dailyVisible, latestRun] = await Promise.all([
    getTodayPicks({ tradeDate: today }),
    resolveDailyVisibleEntitlement(session.userId),
    getLatestRun(),
  ]);
  const visible = picks.slice(0, dailyVisible);
  const hiddenCount = Math.max(0, picks.length - visible.length);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <header className="space-y-2">
        <div className="flex items-baseline justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Daily Picks</h1>
          <span className="text-sm text-muted-foreground">{today}</span>
        </div>
        <PickDisclaimer variant="banner" text={disclaimer} withLink />
      </header>

      {visible.length === 0 ? (
        <EmptyState latestRun={latestRun} today={today} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visible.map((p) => (
              <PickCard key={p.id} pick={p} />
            ))}
          </div>
          {hiddenCount > 0 ? (
            <div className="rounded-md border border-dashed bg-muted/40 p-4 text-sm text-muted-foreground">
              <strong>{hiddenCount}</strong> pick lainnya tersedia di paket lebih
              tinggi.{" "}
              <a className="text-primary underline" href="/subscription">
                Upgrade
              </a>{" "}
              untuk membuka semua picks hari ini.
            </div>
          ) : null}
        </>
      )}

      <footer className="border-t pt-4">
        <PickDisclaimer variant="footer" text={disclaimer} withLink />
      </footer>
    </div>
  );
}

function EmptyState({
  latestRun,
  today,
}: {
  latestRun: Awaited<ReturnType<typeof getLatestRun>>;
  today: string;
}) {
  let title = "Belum ada Daily Picks";
  let body =
    "Worker akan generate Daily Picks setelah ingest EOD pertama berhasil. Cek kembali nanti.";
  if (latestRun) {
    if (latestRun.status === "failed") {
      title = "Run terakhir gagal";
      body = `Run terakhir (${latestRun.runDate}) status: failed. Admin perlu cek log worker.`;
    } else if (latestRun.runDate !== today) {
      title = `Belum ada pick untuk ${today}`;
      body = `Run terakhir: ${latestRun.runDate} dengan ${latestRun.picksGenerated} pick. Worker hari ini belum berjalan.`;
    } else if (latestRun.picksGenerated === 0) {
      title = "Universe kosong";
      body =
        "Universe filter (likuiditas + active) tidak menghasilkan kandidat untuk hari ini. Pastikan data EOD sudah ter-ingest.";
    }
  }
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/30 p-12 text-center">
      <p className="text-base font-semibold">{title}</p>
      <p className="max-w-md text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function formatDateInTz(date: Date, tz: string): string {
  try {
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return fmt.format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}
