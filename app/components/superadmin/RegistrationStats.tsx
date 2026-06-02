import { getGrowthSnapshot, getDailyGrowth, getTierBreakdown } from "@/lib/superadmin/stats";

/* Statistik registrasi user untuk halaman Users & Roles. Server component. */
export async function RegistrationStats() {
  const [snap, daily, tiers] = await Promise.all([
    getGrowthSnapshot(),
    getDailyGrowth(14),
    getTierBreakdown(),
  ]);

  const maxSignups = Math.max(1, ...daily.map((d) => d.signups));
  const totalTierUsers = tiers.reduce((a, t) => a + t.userCount, 0);

  const cards = [
    { label: "Total user", value: snap.totalUsers },
    { label: "Daftar hari ini", value: snap.signupsToday },
    { label: "7 hari", value: snap.signupsLast7d },
    { label: "30 hari", value: snap.signupsLast30d },
    {
      label: "Tren 7h",
      value: `${snap.growthRate7d >= 0 ? "+" : ""}${snap.growthRate7d.toFixed(0)}%`,
      tone: snap.growthRate7d >= 0 ? "text-bull" : "text-bear",
    },
    { label: "Aktif hari ini", value: snap.activeToday },
  ];

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 text-sm font-semibold">Statistik Registrasi</div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map((c) => (
          <div key={c.label} className="rounded-md border border-border bg-background p-2.5">
            <div className="text-[11px] text-muted-foreground">{c.label}</div>
            <div className={`mt-0.5 text-lg font-bold tabular-nums ${("tone" in c && c.tone) || ""}`}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Bar chart pendaftaran per hari (14 hari terakhir) */}
      <div className="mt-4">
        <div className="mb-1.5 text-[11px] font-medium text-muted-foreground">Pendaftaran per hari (14 hari terakhir)</div>
        <div className="flex items-end gap-1" style={{ height: 80 }}>
          {daily.map((d) => {
            const h = Math.round((d.signups / maxSignups) * 100);
            const [, mm, dd] = d.date.split("-");
            return (
              <div key={d.date} className="group relative flex flex-1 flex-col items-center justify-end">
                <div className="absolute -top-5 hidden whitespace-nowrap rounded bg-foreground px-1.5 py-0.5 text-[10px] text-background group-hover:block">
                  {dd}/{mm}: {d.signups} daftar · {d.activated} aktif
                </div>
                <div
                  className="w-full rounded-t bg-primary/70 transition-all group-hover:bg-primary"
                  style={{ height: `${Math.max(d.signups > 0 ? 6 : 1, h)}%` }}
                />
                <div className="mt-1 text-[9px] text-muted-foreground">{dd}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Breakdown per tier */}
      {totalTierUsers > 0 && (
        <div className="mt-4">
          <div className="mb-1.5 text-[11px] font-medium text-muted-foreground">Distribusi per tier</div>
          <div className="flex flex-wrap gap-1.5">
            {tiers.map((t) => (
              <span key={t.tierKode} className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs">
                <span className="font-semibold uppercase">{t.tierKode || "free"}</span>
                <span className="tabular-nums text-muted-foreground">{t.userCount}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
