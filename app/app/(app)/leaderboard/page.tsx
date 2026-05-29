import Link from "next/link";
import { Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/lib/auth/server";
import { getPublicLeaderboard } from "@/lib/paper-trading/engine";
import { formatCompactIDR } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Hall of Fame — Paper Trading | Nubuat",
  description: "Ranking trader paper trading terbaik berdasarkan return. Buktikan strategimu.",
};

export default async function LeaderboardPage() {
  // Member-accessible (perlu login), TAPI tidak gated entitlement — semua tier
  // boleh lihat untuk drive engagement & upgrade ke Elite.
  await requireSession();
  const entries = await getPublicLeaderboard("all-time", 50);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <header>
        <div className="flex items-center gap-2">
          <Trophy className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Hall of Fame</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Trader paper trading terbaik berdasarkan total return %. Mulai bangun track record-mu
          lewat{" "}
          <Link href="/paper-trading" className="text-primary underline">
            Paper Trading
          </Link>
          .
        </p>
      </header>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Top Performers (All-Time)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {entries.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Leaderboard belum terisi — perlu beberapa hari setelah snapshot harian pertama jalan.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-2 text-left">Rank</th>
                    <th className="px-4 py-2 text-left">Trader</th>
                    <th className="px-4 py-2 text-right">Return %</th>
                    <th className="px-4 py-2 text-right">Equity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {entries.map((e) => (
                    <tr key={e.portfolioId} className="transition hover:bg-accent/40">
                      <td className="px-4 py-2.5">
                        <span
                          className={cn(
                            "inline-flex h-7 w-7 items-center justify-center rounded-full font-mono text-xs font-bold",
                            e.rank === 1
                              ? "bg-yellow-500 text-white"
                              : e.rank === 2
                                ? "bg-zinc-400 text-white"
                                : e.rank === 3
                                  ? "bg-orange-400 text-white"
                                  : "bg-muted text-muted-foreground",
                          )}
                        >
                          {e.rank}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-semibold">{e.displayName}</td>
                      <td
                        className={cn(
                          "px-4 py-2.5 text-right font-mono font-bold",
                          e.returnPct >= 0 ? "text-bull" : "text-bear",
                        )}
                      >
                        {e.returnPct >= 0 ? "+" : ""}
                        {e.returnPct.toFixed(2)}%
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">
                        {formatCompactIDR(e.totalValue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="rounded-md border border-border bg-card/40 p-3 text-xs leading-relaxed text-muted-foreground">
        Ranking dihitung dari snapshot harian total value tiap portfolio. Nama trader di-mask demi
        privasi. Paper trading bukan jaminan performa trading sungguhan.
      </p>
    </div>
  );
}
