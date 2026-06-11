import { ListChecks } from "lucide-react";
import { getConfig } from "@/lib/config";
import { EmptyState } from "@/components/ui/empty-state";
import { PickCard } from "@/components/picks/PickCard";
import { PickDisclaimer } from "@/components/picks/PickDisclaimer";
import { getTodayPicks, getLatestRun } from "@/lib/picks/service";
import { requireSession, resolveDailyVisibleEntitlement } from "@/lib/picks/cross-deps";
// SecuritiesPicksSection sengaja TIDAK ditampilkan ke user di sini.
// Daily picks sekuritas dipindah ke /superadmin/system (System Health) sampai
// kita punya sumber data yang kuat & rutin (update lama → tidak layak dipublik).

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
  const isStaff = session.role === "superadmin" || session.role === "admin";
  const [picks, entVisible, latestRun] = await Promise.all([
    getTodayPicks({ tradeDate: today }),
    resolveDailyVisibleEntitlement(session.userId),
    getLatestRun(),
  ]);
  const dailyVisible = isStaff ? picks.length : entVisible;
  // Urutkan High → Medium → Low (Low tetap ditampilkan, tapi paling bawah).
  // Stable sort menjaga urutan skor desc dari query di dalam tiap tier.
  const confRank: Record<string, number> = { high: 0, medium: 1, low: 2 };
  const pool = [...picks].sort(
    (a, b) => (confRank[a.confidence] ?? 99) - (confRank[b.confidence] ?? 99),
  );
  const visible = pool.slice(0, dailyVisible);
  const hiddenCount = Math.max(0, pool.length - visible.length);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <header className="space-y-2">
        <div className="flex items-baseline justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Daily Picks</h1>
          <span className="text-sm text-muted-foreground">{today}</span>
        </div>
        <PickDisclaimer variant="banner" text={disclaimer} withLink />
        <details className="rounded-lg border border-border bg-card/50 px-3 py-2 text-xs text-muted-foreground">
          <summary className="cursor-pointer font-medium text-foreground">Cara baca: Skor &amp; Confidence</summary>
          <div className="mt-2 space-y-1.5">
            <p><strong>Skor (0–100)</strong> — nilai komposit gabungan beberapa faktor (Teknikal, Bandarmologi, Fundamental, Sentimen, Makro). Makin tinggi, makin kuat setup-nya secara keseluruhan.</p>
            <p><strong>Confidence</strong> — tingkat keyakinan pada kekuatan sinyal teknikal setup (a.l. kekuatan tren/ADX &amp; momentum/RSI):</p>
            <ul className="ml-4 list-disc space-y-0.5">
              <li><strong className="text-bull">High</strong> — sinyal kuat &amp; selaras; setup paling meyakinkan.</li>
              <li><strong>Medium</strong> — sinyal cukup, tetap perlu konfirmasi.</li>
              <li><strong className="text-bear">Low</strong> — sinyal lemah/ragu; ekstra hati-hati.</li>
            </ul>
            <p>Confidence ≠ jaminan hasil. Selalu pakai stop loss &amp; kelola risiko sendiri.</p>
          </div>
        </details>
      </header>

      {visible.length === 0 ? (
        <PicksEmptyState latestRun={latestRun} today={today} />
      ) : (
        <>
          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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

function PicksEmptyState({
  latestRun,
  today,
}: {
  latestRun: Awaited<ReturnType<typeof getLatestRun>>;
  today: string;
}) {
  let title = "Belum ada Daily Picks";
  let body =
    "Picks harian muncul otomatis setelah ingest EOD pertama berhasil. Cek kembali nanti — sementara itu kamu bisa cari saham sendiri lewat Screener.";
  if (latestRun) {
    if (latestRun.status === "failed") {
      title = "Run terakhir gagal";
      body = `Run terakhir (${latestRun.runDate}) statusnya gagal. Tim kami sedang menanganinya — coba lagi nanti.`;
    } else if (latestRun.runDate !== today) {
      title = `Belum ada pick untuk ${today}`;
      body = `Run terakhir: ${latestRun.runDate} dengan ${latestRun.picksGenerated} pick. Picks hari ini belum keluar — cek lagi nanti.`;
    } else if (latestRun.picksGenerated === 0) {
      title = "Tidak ada kandidat hari ini";
      body =
        "Filter universe (likuiditas + saham aktif) belum menghasilkan kandidat untuk hari ini. Coba cari ide sendiri lewat Screener.";
    }
  }
  return (
    <EmptyState
      icon={<ListChecks className="size-5" />}
      title={title}
      description={body}
      action={{ href: "/screener", label: "Cari saham" }}
      secondaryAction={{ href: "/academy", label: "Belajar dulu di Academy" }}
    />
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
