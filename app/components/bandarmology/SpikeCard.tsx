import { Radar, TrendingUp, TrendingDown, Users, Crosshair } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCompactIDR, formatNumber } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import {
  SPIKE_LABEL_TEXT,
  type ConcentrationMetrics,
  type SpikeLabel,
  type SpikeResult,
} from "@/lib/bandarmology/spike";

/**
 * SpikeCard — visualisasi Spike Detection / Frequency Analyzer (§3.C.4).
 *
 * Pemakaian:
 *   const data = await computeSpike(ticker);           // lib/bandarmology/spike-service
 *   return <SpikeCard data={data} tradeDate={data?.tradeDate} />;
 *
 * Bila `data` null (belum ada broker summary — blokir vendor), tampilkan
 * empty-state "Data bandarmology segera hadir" tanpa dummy data.
 *
 * Catatan wiring: belum di-pasang ke tab manapun untuk hindari bentrok dengan
 * agent paralel (components/ticker/* di luar scope). Untuk memasang, render di
 * dalam BandarmologyTab atau buat tab baru di app/(app)/ticker/[code]/page.tsx.
 */

interface Props {
  /** Hasil dari computeSpike(); null bila data belum tersedia. */
  data: { result: SpikeResult; tradeDate: string } | null;
}

const LABEL_TONE: Record<SpikeLabel, { class: string; Icon: typeof TrendingUp }> = {
  akumulasi_1_bandar: { class: "bg-bull text-white", Icon: TrendingUp },
  akumulasi_terkonsentrasi: { class: "bg-bull-soft text-bull", Icon: TrendingUp },
  distribusi_1_bandar: { class: "bg-bear text-white", Icon: TrendingDown },
  distribusi_terkonsentrasi: { class: "bg-bear-soft text-bear", Icon: TrendingDown },
  distribusi_retail_merata: { class: "bg-muted text-muted-foreground", Icon: Users },
  tidak_ada_data: { class: "bg-muted text-muted-foreground", Icon: Users },
};

export function SpikeCard({ data }: Props) {
  if (!data || data.result.label === "tidak_ada_data") {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Radar className="h-4 w-4 text-primary" />
            Spike Detection — Konsentrasi Transaksi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="Data bandarmology segera hadir"
            description="Analisis konsentrasi broker (deteksi 1 bandar vs retail merata) akan aktif setelah broker summary IDX di-ingest. Engine sudah siap pakai begitu data masuk."
            action={null}
          />
        </CardContent>
      </Card>
    );
  }

  const { result, tradeDate } = data;
  const tone = LABEL_TONE[result.label];
  const ToneIcon = tone.Icon;

  return (
    <div className="space-y-4">
      {/* Verdict header */}
      <Card className="overflow-hidden">
        <div className={cn("flex items-center gap-4 p-5", tone.class)}>
          <ToneIcon className="h-8 w-8 shrink-0" />
          <div className="flex-1">
            <div className="text-[10px] font-semibold uppercase tracking-wider opacity-80">
              Spike Detection / Frequency Analyzer
            </div>
            <div className="mt-0.5 text-2xl font-bold tracking-tight">
              {SPIKE_LABEL_TEXT[result.label]}
            </div>
            <div className="mt-1 text-[11px] opacity-90">{result.summary}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider opacity-80">Skor konsentrasi</div>
            <div className="font-mono text-3xl font-bold">{result.score}</div>
            <div className="mt-1 font-mono text-[10px] opacity-80">{tradeDate}</div>
          </div>
        </div>
      </Card>

      {/* Buy vs Sell concentration */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SideCard
          title="Konsentrasi Sisi Beli"
          metrics={result.buy}
          highlighted={result.dominantSide === "buy"}
          tone="bull"
        />
        <SideCard
          title="Konsentrasi Sisi Jual"
          metrics={result.sell}
          highlighted={result.dominantSide === "sell"}
          tone="bear"
        />
      </div>

      <p className="px-1 text-[11px] text-muted-foreground">
        <strong>HHI</strong> (Herfindahl-Hirschman Index, 0–10.000) mengukur konsentrasi:
        nilai tinggi = satu/sedikit broker mendominasi (akumulasi/distribusi terarah),
        nilai rendah = transaksi tersebar merata (retail). <strong>Broker efektif</strong> =
        perkiraan jumlah broker setara bila distribusi merata — makin kecil makin terkonsentrasi.
        Basis: {result.basis === "value" ? "nilai transaksi (IDR)" : "volume lembar"}.
      </p>
    </div>
  );
}

function SideCard({
  title,
  metrics,
  highlighted,
  tone,
}: {
  title: string;
  metrics: ConcentrationMetrics;
  highlighted: boolean;
  tone: "bull" | "bear";
}) {
  const toneClass = tone === "bull" ? "text-bull" : "text-bear";
  return (
    <Card className={cn(highlighted && "ring-2 ring-primary/50")}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Crosshair className={cn("h-4 w-4", toneClass)} />
            {title}
          </span>
          {highlighted && (
            <span className="rounded bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
              Sinyal utama
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat label="HHI" value={formatNumber(metrics.hhi, 0)} />
          <Stat label="Top-1 share" value={`${(metrics.top1Share * 100).toFixed(0)}%`} tone={tone} />
          <Stat label="Broker efektif" value={metrics.effectiveBrokers.toFixed(1)} />
        </div>
        <div className="grid grid-cols-2 gap-2 text-center">
          <Stat label="CR3 (top 3)" value={`${(metrics.cr3 * 100).toFixed(0)}%`} />
          <Stat label="Broker aktif" value={String(metrics.brokerCount)} />
        </div>

        <div>
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Top broker
          </div>
          {metrics.topBrokers.length === 0 ? (
            <p className="text-xs text-muted-foreground">—</p>
          ) : (
            <ul className="space-y-1 text-xs">
              {metrics.topBrokers.map((b) => (
                <li key={b.brokerCode}>
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-semibold">
                      {b.brokerCode}
                      {b.brokerName ? (
                        <span className="ml-1 font-sans font-normal text-muted-foreground">
                          {b.brokerName}
                        </span>
                      ) : null}
                    </span>
                    <span className={toneClass}>{(b.share * 100).toFixed(0)}%</span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn("h-full", tone === "bull" ? "bg-bull" : "bg-bear")}
                        style={{ width: `${Math.min(100, b.share * 100)}%` }}
                      />
                    </div>
                    <span className="w-20 shrink-0 text-right font-mono text-[10px] text-muted-foreground">
                      {formatCompactIDR(b.amount)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "bull" | "bear";
}) {
  const toneClass = tone === "bull" ? "text-bull" : tone === "bear" ? "text-bear" : "";
  return (
    <div className="rounded-md border border-border bg-card/40 p-2">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("mt-0.5 font-mono text-sm font-semibold", toneClass)}>{value}</div>
    </div>
  );
}
