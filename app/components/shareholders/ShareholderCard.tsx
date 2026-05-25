import { Users, TrendingUp, TrendingDown, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCompactIDR, formatNumber } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { InsiderTxRow, ShareholderRow } from "@/lib/shareholders/service";

interface Props {
  shareholders: ShareholderRow[];
  insiderTransactions: InsiderTxRow[];
  insiderSummary: {
    buy: { count: number; shares: number; value: number };
    sell: { count: number; shares: number; value: number };
    netSentiment: "bullish" | "bearish" | "neutral";
  };
}

const HOLDER_TYPE_LABEL: Record<ShareholderRow["holderType"], string> = {
  individual: "Perorangan",
  institution: "Institusi",
  government: "Pemerintah",
  mutual_fund: "Reksa Dana",
  foreign: "Asing",
  related_party: "Pihak Terkait",
};

const HOLDER_TYPE_COLOR: Record<ShareholderRow["holderType"], string> = {
  individual: "bg-muted text-muted-foreground",
  institution: "bg-primary/10 text-primary",
  government: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300",
  mutual_fund: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  foreign: "bg-purple-500/15 text-purple-700 dark:text-purple-300",
  related_party: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
};

const SENTIMENT_META = {
  bullish: { label: "Insider Buying", color: "text-bull", bg: "bg-bull-soft" },
  bearish: { label: "Insider Selling", color: "text-bear", bg: "bg-bear-soft" },
  neutral: { label: "Neutral", color: "text-muted-foreground", bg: "bg-muted" },
} as const;

export function ShareholderCard({ shareholders, insiderTransactions, insiderSummary }: Props) {
  if (shareholders.length === 0 && insiderTransactions.length === 0) {
    return null;
  }

  const sentMeta = SENTIMENT_META[insiderSummary.netSentiment];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4 text-primary" />
          Major Shareholders &amp; Insider Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Major Shareholders ≥5% */}
        {shareholders.length > 0 && (
          <div>
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Major Shareholders (≥5%)
            </div>
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 text-[10px] uppercase tracking-wider">
                  <tr>
                    <th className="px-2 py-1.5 text-left">Pemilik</th>
                    <th className="px-2 py-1.5 text-left">Tipe</th>
                    <th className="px-2 py-1.5 text-right">Saham</th>
                    <th className="px-2 py-1.5 text-right">% Ownership</th>
                    <th className="px-2 py-1.5 text-right">Per Tanggal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {shareholders.map((s) => (
                    <tr key={s.id}>
                      <td className="px-2 py-1.5 font-medium">{s.holderName}</td>
                      <td className="px-2 py-1.5">
                        <span className={cn("rounded px-1.5 py-0.5 text-[9px] font-bold uppercase", HOLDER_TYPE_COLOR[s.holderType])}>
                          {HOLDER_TYPE_LABEL[s.holderType]}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono">{formatNumber(s.sharesOwned, 0)}</td>
                      <td className="px-2 py-1.5 text-right font-mono font-bold">
                        {s.ownershipPct.toFixed(2)}%
                      </td>
                      <td className="px-2 py-1.5 text-right text-[10px] text-muted-foreground">
                        {s.recordDate}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Insider Activity Summary (last 90d) */}
        {(insiderSummary.buy.count > 0 || insiderSummary.sell.count > 0) && (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Insider Activity 90 Hari Terakhir
              </div>
              <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase", sentMeta.bg, sentMeta.color)}>
                {sentMeta.label}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-md border border-bull/30 bg-bull-soft p-3">
                <div className="flex items-center gap-1.5 text-bull">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-bold uppercase">BUY</span>
                </div>
                <div className="mt-1 font-mono text-lg font-bold text-bull">
                  {formatCompactIDR(insiderSummary.buy.value)}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {insiderSummary.buy.count} transaksi · {formatNumber(insiderSummary.buy.shares, 0)} lembar
                </div>
              </div>
              <div className="rounded-md border border-bear/30 bg-bear-soft p-3">
                <div className="flex items-center gap-1.5 text-bear">
                  <TrendingDown className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-bold uppercase">SELL</span>
                </div>
                <div className="mt-1 font-mono text-lg font-bold text-bear">
                  {formatCompactIDR(insiderSummary.sell.value)}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {insiderSummary.sell.count} transaksi · {formatNumber(insiderSummary.sell.shares, 0)} lembar
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Insider Transactions Table */}
        {insiderTransactions.length > 0 && (
          <div>
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Recent Transactions (180 hari)
            </div>
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 text-[10px] uppercase tracking-wider">
                  <tr>
                    <th className="px-2 py-1.5 text-left">Date</th>
                    <th className="px-2 py-1.5 text-left">Insider</th>
                    <th className="px-2 py-1.5 text-center">Side</th>
                    <th className="px-2 py-1.5 text-right">Shares</th>
                    <th className="px-2 py-1.5 text-right">Value</th>
                    <th className="px-2 py-1.5 text-right">% After</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {insiderTransactions.slice(0, 10).map((tx) => (
                    <tr key={tx.id}>
                      <td className="px-2 py-1.5 font-mono text-[10px]">{tx.transactionDate}</td>
                      <td className="px-2 py-1.5">
                        <div className="font-medium">{tx.insiderName}</div>
                        <div className="text-[9px] text-muted-foreground italic">{tx.insiderRole}</div>
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <span className={cn(
                          "rounded px-1.5 py-0.5 text-[9px] font-bold uppercase",
                          tx.side === "buy" ? "bg-bull-soft text-bull" : "bg-bear-soft text-bear",
                        )}>
                          {tx.side}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono">{formatNumber(tx.sharesTransacted, 0)}</td>
                      <td className="px-2 py-1.5 text-right font-mono">
                        {tx.totalValueIdr != null ? formatCompactIDR(tx.totalValueIdr) : "—"}
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono text-[10px]">
                        {tx.ownershipPctAfter != null ? `${tx.ownershipPctAfter.toFixed(2)}%` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {insiderTransactions.length > 10 && (
              <p className="mt-1 text-[10px] text-muted-foreground italic">
                Menampilkan 10 dari {insiderTransactions.length} transaksi.
              </p>
            )}
          </div>
        )}

        <p className="rounded-md bg-muted/40 p-2 text-[10px] leading-relaxed text-muted-foreground">
          <strong>Catatan:</strong> Data shareholders ≥5% dari laporan KSEI/IDX e-Reporting (di-entry manual oleh superadmin).
          Insider transactions = transaksi direksi/komisaris/pengendali yang dilaporkan ke IDX.
          Tinggi <strong>insider buying</strong> sering signal positive (insider info).
          Tinggi <strong>insider selling</strong> bisa warning sign (kecuali untuk liquidity/diversification routine).
        </p>
      </CardContent>
    </Card>
  );
}
