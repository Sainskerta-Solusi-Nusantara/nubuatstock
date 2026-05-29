import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Minus,
  RefreshCcw,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCompactIDR } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import {
  SHIFT_LABEL_TEXT,
  type FlowDirection,
  type FlowSource,
  type MarketSummaryResult,
  type MomentumShift,
  type WindowValue,
} from "@/lib/bandarmology/market-summary";

/**
 * MarketSummaryCard — visualisasi Market Summary time-window
 * (W4/W3/W2 + D3/D2/D1, IMPROVEMENT_PLAN §2, NeoBDM signature).
 *
 * Pemakaian:
 *   const data = await computeMarketSummary(ticker); // market-summary-service
 *   return <MarketSummaryCard data={data} />;
 *
 * Bila `data` null (belum ada data flow apa pun — blokir vendor), tampilkan
 * empty-state tanpa dummy data. Engine sudah siap pakai begitu data masuk.
 *
 * Catatan wiring: belum dipasang ke tab manapun untuk hindari bentrok dengan
 * agent paralel (components/ticker/* di luar scope).
 */

interface Props {
  /** Hasil dari computeMarketSummary(); null bila data belum tersedia. */
  data: { result: MarketSummaryResult; latestTradeDate: string } | null;
}

const SHIFT_TONE: Record<
  MomentumShift,
  { class: string; Icon: typeof TrendingUp }
> = {
  akumulasi_menguat: { class: "bg-bull text-white", Icon: TrendingUp },
  akumulasi_melemah: { class: "bg-bull-soft text-bull", Icon: TrendingUp },
  distribusi_menguat: { class: "bg-bear text-white", Icon: TrendingDown },
  distribusi_melemah: { class: "bg-bear-soft text-bear", Icon: TrendingDown },
  berbalik_ke_inflow: { class: "bg-bull text-white", Icon: RefreshCcw },
  berbalik_ke_outflow: { class: "bg-bear text-white", Icon: RefreshCcw },
  netral: { class: "bg-muted text-muted-foreground", Icon: Minus },
  tidak_ada_data: { class: "bg-muted text-muted-foreground", Icon: Minus },
};

const SOURCE_LABEL: Record<FlowSource, string> = {
  foreign: "Foreign net flow (IDR)",
  broker: "Broker net (IDR)",
  proxy: "Proxy volume × arah harga",
};

export function MarketSummaryCard({ data }: Props) {
  if (!data || data.result.shift === "tidak_ada_data") {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-primary" />
            Market Summary — Pergeseran Momentum
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="Data flow segera hadir"
            description="Perbandingan flow lintas jendela waktu (4/3/2 minggu lalu + 3/2/1 hari lalu) akan aktif setelah data foreign/broker IDX di-ingest. Engine sudah siap pakai begitu data masuk."
            action={null}
          />
        </CardContent>
      </Card>
    );
  }

  const { result, latestTradeDate } = data;
  const tone = SHIFT_TONE[result.shift];
  const ToneIcon = tone.Icon;

  // Skala bar relatif terhadap |net| jendela terbesar.
  const maxAbs = Math.max(1, ...result.windows.map((w) => Math.abs(w.net)));

  return (
    <div className="space-y-4">
      {/* Verdict header */}
      <Card className="overflow-hidden">
        <div className={cn("flex items-center gap-4 p-5", tone.class)}>
          <ToneIcon className="h-8 w-8 shrink-0" />
          <div className="flex-1">
            <div className="text-[10px] font-semibold uppercase tracking-wider opacity-80">
              Market Summary · Time-Window (W4→D1)
            </div>
            <div className="mt-0.5 text-2xl font-bold tracking-tight">
              {SHIFT_LABEL_TEXT[result.shift]}
            </div>
            <div className="mt-1 text-[11px] opacity-90">{result.summary}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider opacity-80">Net periode</div>
            <div className="font-mono text-xl font-bold">{formatCompactIDR(result.totalNet)}</div>
            <div className="mt-1 font-mono text-[10px] opacity-80">{latestTradeDate}</div>
          </div>
        </div>
      </Card>

      {/* Window bars */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Flow per Jendela Waktu
            </span>
            <span className="text-[10px] font-normal uppercase tracking-wider text-muted-foreground">
              W4 (jauh) → D1 (terbaru)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {result.windows.map((w) => (
            <WindowRow key={w.key} window={w} maxAbs={maxAbs} />
          ))}

          <p className="pt-2 text-[11px] text-muted-foreground">
            Tiap baris = total net flow dalam jendela. <span className="text-bull">Hijau</span> =
            inflow / akumulasi, <span className="text-bear">merah</span> = outflow / distribusi.
            Bandingkan blok mingguan (W4–W2) dengan 3 hari terakhir (D3–D1) untuk melihat{" "}
            <strong>pergeseran momentum</strong>. Sumber: {SOURCE_LABEL[result.source]}.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function WindowRow({ window: w, maxAbs }: { window: WindowValue; maxAbs: number }) {
  const pct = (Math.abs(w.net) / maxAbs) * 100;
  const isInflow = w.direction === "inflow";
  const isOutflow = w.direction === "outflow";
  const barClass = isInflow ? "bg-bull" : isOutflow ? "bg-bear" : "bg-muted-foreground/40";
  const DirIcon = isInflow ? ArrowUpRight : isOutflow ? ArrowDownRight : Minus;
  const valueTone = isInflow ? "text-bull" : isOutflow ? "text-bear" : "text-muted-foreground";

  return (
    <div className="flex items-center gap-3">
      <div className="w-24 shrink-0">
        <div className="font-mono text-xs font-bold">{w.key}</div>
        <div className="text-[10px] text-muted-foreground">{w.label}</div>
      </div>

      <div className="flex flex-1 items-center gap-2">
        {/* center-anchored diverging bar */}
        <div className="relative h-4 flex-1 overflow-hidden rounded bg-muted/50">
          <div className="absolute inset-y-0 left-1/2 w-px bg-border" />
          {w.days > 0 && (
            <div
              className={cn(
                "absolute inset-y-0",
                barClass,
                isOutflow ? "right-1/2 rounded-l" : "left-1/2 rounded-r",
              )}
              style={{ width: `${Math.max(2, pct / 2)}%` }}
            />
          )}
        </div>

        <DirIcon className={cn("h-3.5 w-3.5 shrink-0", valueTone)} />
        <span className={cn("w-24 shrink-0 text-right font-mono text-xs font-semibold", valueTone)}>
          {w.days > 0 ? formatCompactIDR(w.net) : "—"}
        </span>
      </div>
    </div>
  );
}

/** Re-export untuk kemudahan tipe konsumen. */
export type { FlowDirection };
