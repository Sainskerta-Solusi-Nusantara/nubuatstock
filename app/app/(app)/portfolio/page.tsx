import Image from "next/image";
import Link from "next/link";
import { Wallet, TrendingUp, TrendingDown, Trophy, History } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/lib/auth/server";
import {
  ensureDefaultPortfolio,
  getPortfolioPositions,
  getPortfolioSummary,
  getPortfolioTrades,
  getLeaderboard,
} from "@/lib/paper-trading/service";
import { formatCompactIDR, formatNumber } from "@/lib/utils/format";
import { TradeButton } from "@/components/paper-trading/TradeButton";
import { cn } from "@/lib/utils/cn";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Paper Trading — Nubuat",
  description: "Portfolio virtual untuk simulasi trading sebelum risk uang sungguhan. Rp 100jt starting capital.",
};

export default async function PortfolioPage() {
  const session = await requireSession();
  const portfolioId = await ensureDefaultPortfolio(session.userId);
  const [summary, positions, trades, leaderboard] = await Promise.all([
    getPortfolioSummary(portfolioId, session.userId),
    getPortfolioPositions(portfolioId),
    getPortfolioTrades(portfolioId, 30),
    getLeaderboard("all-time", 10),
  ]);

  if (!summary) {
    return <div>Portfolio tidak ditemukan</div>;
  }

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-2">
          <Wallet className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Paper Trading</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Virtual portfolio Rp 100 juta untuk simulasi trading. Eksekusi pakai harga last close + fee
          realistis (0.15% buy + 0.25% sell). Test strategy sebelum risk uang sungguhan.
        </p>
      </header>

      {/* Portfolio summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-base">
            <span>{summary.name}</span>
            <span
              className={cn(
                "rounded-full px-3 py-1 text-sm font-bold",
                summary.totalReturnPct >= 0 ? "bg-bull-soft text-bull" : "bg-bear-soft text-bear",
              )}
            >
              {summary.totalReturnPct >= 0 ? "+" : ""}
              {summary.totalReturnPct.toFixed(2)}% Return
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat
              label="Total Value"
              value={formatCompactIDR(summary.totalValueIdr)}
              detail={`Rp ${Math.round(summary.totalValueIdr).toLocaleString("id-ID")}`}
            />
            <Stat
              label="Cash"
              value={formatCompactIDR(summary.cashBalanceIdr)}
              detail={`${((summary.cashBalanceIdr / summary.totalValueIdr) * 100).toFixed(0)}% of portfolio`}
            />
            <Stat
              label="Positions"
              value={formatCompactIDR(summary.positionsValueIdr)}
              detail={`${summary.positionCount} emiten`}
            />
            <Stat
              label="Unrealized P/L"
              value={`${summary.unrealizedPnlIdr >= 0 ? "+" : ""}${formatCompactIDR(summary.unrealizedPnlIdr)}`}
              tone={summary.unrealizedPnlIdr >= 0 ? "bull" : "bear"}
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>Initial Capital: {formatCompactIDR(summary.initialCapitalIdr)}</span>
            <span>•</span>
            <span>Realized P/L: <strong className={cn("font-mono", summary.realizedPnlIdr >= 0 ? "text-bull" : "text-bear")}>{summary.realizedPnlIdr >= 0 ? "+" : ""}{formatCompactIDR(summary.realizedPnlIdr)}</strong></span>
          </div>
        </CardContent>
      </Card>

      {/* Positions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Open Positions ({positions.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {positions.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Belum ada posisi. Mulai dari halaman ticker → klik &quot;Paper Buy&quot;, atau buka <Link href="/picks" className="text-primary underline">Daily Picks</Link>.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="px-3 py-2 text-left">Ticker</th>
                    <th className="px-3 py-2 text-right">Qty</th>
                    <th className="px-3 py-2 text-right">Avg Buy</th>
                    <th className="px-3 py-2 text-right">Last Price</th>
                    <th className="px-3 py-2 text-right">Value</th>
                    <th className="px-3 py-2 text-right">Unrealized P/L</th>
                    <th className="px-3 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {positions.map((p) => {
                    const pnlTone = (p.unrealizedPnl ?? 0) >= 0 ? "text-bull" : "text-bear";
                    return (
                      <tr key={p.kode} className="transition hover:bg-accent/40">
                        <td className="px-3 py-2">
                          <Link href={`/ticker/${p.kode}`} className="flex items-center gap-2">
                            {p.logoUrl ? (
                              <Image src={p.logoUrl} alt="" width={20} height={20} className="h-5 w-5 rounded-sm object-contain" unoptimized />
                            ) : (
                              <div className="h-5 w-5 rounded-sm bg-primary/10 text-center font-mono text-[9px] font-bold leading-5 text-primary">{p.kode.slice(0, 1)}</div>
                            )}
                            <div>
                              <div className="font-mono font-bold">{p.kode}</div>
                              <div className="text-[10px] text-muted-foreground line-clamp-1">{p.namaPerusahaan}</div>
                            </div>
                          </Link>
                        </td>
                        <td className="px-3 py-2 text-right font-mono">{p.quantity.toLocaleString("id-ID")}</td>
                        <td className="px-3 py-2 text-right font-mono">{formatNumber(p.avgBuyPrice, 0)}</td>
                        <td className="px-3 py-2 text-right font-mono">
                          {p.currentPrice != null ? formatNumber(p.currentPrice, 0) : "—"}
                        </td>
                        <td className="px-3 py-2 text-right font-mono">
                          {p.currentValue != null ? formatCompactIDR(p.currentValue) : "—"}
                        </td>
                        <td className={cn("px-3 py-2 text-right font-mono", pnlTone)}>
                          {p.unrealizedPnl != null ? (
                            <div>
                              <div className="font-bold">{p.unrealizedPnl >= 0 ? "+" : ""}{formatCompactIDR(p.unrealizedPnl)}</div>
                              <div className="text-[10px]">{p.unrealizedPnlPct != null ? `${p.unrealizedPnlPct >= 0 ? "+" : ""}${p.unrealizedPnlPct.toFixed(2)}%` : "—"}</div>
                            </div>
                          ) : "—"}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <TradeButton kode={p.kode} defaultSide="sell" variant="compact" label="Sell" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trade History */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4 text-primary" />
            Trade History (last 30)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {trades.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Belum ada trade.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 text-[10px] uppercase tracking-wider">
                  <tr>
                    <th className="px-3 py-2 text-left">Date</th>
                    <th className="px-3 py-2 text-left">Ticker</th>
                    <th className="px-3 py-2 text-center">Side</th>
                    <th className="px-3 py-2 text-right">Qty</th>
                    <th className="px-3 py-2 text-right">Price</th>
                    <th className="px-3 py-2 text-right">Total</th>
                    <th className="px-3 py-2 text-right">Fee</th>
                    <th className="px-3 py-2 text-right">Realized P/L</th>
                    <th className="px-3 py-2 text-left">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {trades.map((t) => (
                    <tr key={t.id}>
                      <td className="px-3 py-2 text-muted-foreground">
                        {new Date(t.executedAt).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-3 py-2 font-mono font-bold">{t.kode}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={cn("rounded px-1.5 py-0.5 text-[9px] font-bold uppercase", t.side === "buy" ? "bg-bull-soft text-bull" : "bg-bear-soft text-bear")}>
                          {t.side}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-mono">{t.quantity.toLocaleString("id-ID")}</td>
                      <td className="px-3 py-2 text-right font-mono">{formatNumber(t.priceIdr, 0)}</td>
                      <td className="px-3 py-2 text-right font-mono">{formatCompactIDR(t.totalValueIdr)}</td>
                      <td className="px-3 py-2 text-right font-mono text-muted-foreground">{formatNumber(t.feeIdr, 0)}</td>
                      <td className={cn("px-3 py-2 text-right font-mono", (t.realizedPnlIdr ?? 0) >= 0 ? "text-bull" : "text-bear")}>
                        {t.realizedPnlIdr != null ? `${t.realizedPnlIdr >= 0 ? "+" : ""}${formatCompactIDR(t.realizedPnlIdr)}` : "—"}
                      </td>
                      <td className="px-3 py-2 text-[10px] text-muted-foreground">{t.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Leaderboard */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="h-4 w-4 text-primary" />
            Leaderboard (All-Time)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {leaderboard.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Leaderboard belum ada — perlu beberapa hari setelah snapshot job pertama jalan.
            </div>
          ) : (
            <ol className="divide-y divide-border">
              {leaderboard.map((entry, i) => (
                <li key={entry.portfolioId} className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    <span className={cn("flex h-7 w-7 items-center justify-center rounded-full font-mono text-xs font-bold", i === 0 ? "bg-yellow-500 text-white" : i === 1 ? "bg-zinc-400 text-white" : i === 2 ? "bg-orange-400 text-white" : "bg-muted text-muted-foreground")}>
                      {i + 1}
                    </span>
                    <span className="text-sm font-semibold">{entry.portfolioName}</span>
                  </div>
                  <div className="text-right">
                    <div className={cn("font-mono font-bold", entry.returnPct >= 0 ? "text-bull" : "text-bear")}>
                      {entry.returnPct >= 0 ? "+" : ""}{entry.returnPct.toFixed(2)}%
                    </div>
                    <div className="text-[10px] text-muted-foreground">{formatCompactIDR(entry.totalValue)}</div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      <p className="rounded-md border border-border bg-card/40 p-3 text-xs leading-relaxed text-muted-foreground">
        <strong>Disclaimer:</strong> Paper trading menggunakan harga last close EOD — bukan harga real-time intraday.
        Slippage, fill rate, dan likuiditas tidak disimulasikan. Performance di paper TIDAK menjamin hasil yang sama
        di trading sungguhan. Gunakan sebagai latihan strategi, bukan validation absolut.
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: "bull" | "bear";
}) {
  const toneClass = tone === "bull" ? "text-bull" : tone === "bear" ? "text-bear" : "";
  return (
    <div className="rounded-md border border-border bg-card/40 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("mt-1 font-mono text-xl font-bold", toneClass)}>{value}</div>
      {detail && <div className="mt-0.5 text-[10px] text-muted-foreground">{detail}</div>}
    </div>
  );
}
