import { Footprints, TrendingUp, TrendingDown, Minus, ArrowLeftRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCompactIDR } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import {
  BROKER_TAG_TEXT,
  SMART_MONEY_BIAS_TEXT,
  type BrokerActivity,
  type BrokerStalkerResult,
  type BrokerTag,
  type SmartMoneyBias,
} from "@/lib/bandarmology/broker-stalker";

/**
 * BrokerStalkerCard — visualisasi Broker Stalker (§3.C.2, NeoBDM-inspired).
 *
 * Pemakaian:
 *   const data = await computeBrokerStalker(ticker);   // broker-stalker-service
 *   return <BrokerStalkerCard data={data} />;
 *
 * Bila `data` null (belum ada broker summary — blokir vendor), tampilkan
 * empty-state "Data broker segera hadir" tanpa dummy data.
 *
 * Catatan wiring: belum dipasang ke tab manapun untuk hindari bentrok dengan
 * agent paralel (components/ticker/* di luar scope). Untuk memasang, render di
 * dalam BandarmologyTab atau tab baru di page ticker.
 */

interface Props {
  /** Hasil dari computeBrokerStalker(); null bila data belum tersedia. */
  data: {
    result: BrokerStalkerResult;
    tradeDate: string;
    fromDate: string;
    windowDays: number;
  } | null;
}

const TAG_TONE: Record<BrokerTag, string> = {
  foreign: "bg-primary/15 text-primary",
  institusi: "bg-bull-soft text-bull",
  retail: "bg-muted text-muted-foreground",
};

const BIAS_TONE: Record<
  SmartMoneyBias,
  { class: string; Icon: typeof TrendingUp }
> = {
  bullish: { class: "bg-bull text-white", Icon: TrendingUp },
  bearish: { class: "bg-bear text-white", Icon: TrendingDown },
  netral: { class: "bg-muted text-muted-foreground", Icon: Minus },
  tidak_ada_data: { class: "bg-muted text-muted-foreground", Icon: Minus },
};

export function BrokerStalkerCard({ data }: Props) {
  if (!data || !data.result.hasData) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Footprints className="h-4 w-4 text-primary" />
            Broker Stalker — Jejak Aktivitas Broker
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="Data broker segera hadir"
            description="Pelacakan akumulasi/distribusi per-broker dan bias smart money (asing/institusi vs ritel) akan aktif setelah broker summary IDX di-ingest. Engine sudah siap pakai begitu data masuk."
            action={null}
          />
        </CardContent>
      </Card>
    );
  }

  const { result, tradeDate, fromDate, windowDays } = data;
  const { smartMoney } = result;
  const tone = BIAS_TONE[smartMoney.bias];
  const ToneIcon = tone.Icon;

  return (
    <div className="space-y-4">
      {/* Smart money verdict header */}
      <Card className="overflow-hidden">
        <div className={cn("flex items-center gap-4 p-5", tone.class)}>
          <ToneIcon className="h-8 w-8 shrink-0" />
          <div className="flex-1">
            <div className="text-[10px] font-semibold uppercase tracking-wider opacity-80">
              Smart Money Bias — Window {windowDays} hari
            </div>
            <div className="mt-0.5 text-2xl font-bold tracking-tight">
              {SMART_MONEY_BIAS_TEXT[smartMoney.bias]}
            </div>
            <div className="mt-1 text-[11px] opacity-90">{result.summary}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider opacity-80">Keyakinan</div>
            <div className="font-mono text-3xl font-bold">{smartMoney.score}</div>
            <div className="mt-1 font-mono text-[10px] opacity-80">
              {fromDate} → {tradeDate}
            </div>
          </div>
        </div>
      </Card>

      {/* Net per tag */}
      <div className="grid grid-cols-3 gap-3">
        <NetTagStat label={BROKER_TAG_TEXT.foreign} value={result.netByTag.foreign} />
        <NetTagStat label={BROKER_TAG_TEXT.institusi} value={result.netByTag.institusi} />
        <NetTagStat label={BROKER_TAG_TEXT.retail} value={result.netByTag.retail} />
      </div>

      {smartMoney.contrarian && (
        <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary">
          <ArrowLeftRight className="h-4 w-4 shrink-0" />
          <span>
            <strong>Sinyal contrarian:</strong> smart money dan ritel bergerak berlawanan arah.
          </span>
        </div>
      )}

      {/* Top accumulators vs distributors */}
      <div className="grid gap-4 lg:grid-cols-2">
        <BrokerRankCard
          title="Top Akumulator (Net-Buy)"
          brokers={result.topAccumulators}
          tone="bull"
        />
        <BrokerRankCard
          title="Top Distributor (Net-Sell)"
          brokers={result.topDistributors}
          tone="bear"
        />
      </div>

      <p className="px-1 text-[11px] text-muted-foreground">
        <strong>Smart money</strong> = broker asing + institusi domestik; <strong>ritel</strong> =
        broker lokal/kecil. Bias <em>bullish</em> bila smart money net-buy, terutama saat ritel
        net-sell (peluang <em>contrarian</em>). Tag broker adalah heuristik adaptasi (bukan
        identitas pasti pemodal). Basis:{" "}
        {result.basis === "value" ? "nilai transaksi (IDR)" : "volume lembar"}.
      </p>
    </div>
  );
}

function NetTagStat({ label, value }: { label: string; value: number }) {
  const toneClass = value > 0 ? "text-bull" : value < 0 ? "text-bear" : "text-muted-foreground";
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return (
    <div className="rounded-md border border-border bg-card/40 p-2 text-center">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("mt-0.5 font-mono text-sm font-semibold", toneClass)}>
        {sign}
        {formatCompactIDR(Math.abs(value))}
      </div>
    </div>
  );
}

function BrokerRankCard({
  title,
  brokers,
  tone,
}: {
  title: string;
  brokers: BrokerActivity[];
  tone: "bull" | "bear";
}) {
  const toneClass = tone === "bull" ? "text-bull" : "text-bear";
  // Skala bar relatif terhadap |net| terbesar dalam daftar ini.
  const maxNet = brokers.reduce((m, b) => Math.max(m, Math.abs(b.netAmount)), 0) || 1;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          {tone === "bull" ? (
            <TrendingUp className={cn("h-4 w-4", toneClass)} />
          ) : (
            <TrendingDown className={cn("h-4 w-4", toneClass)} />
          )}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {brokers.length === 0 ? (
          <p className="text-xs text-muted-foreground">Tidak ada broker pada kategori ini.</p>
        ) : (
          <ul className="space-y-2 text-xs">
            {brokers.map((b) => {
              const pct = (Math.abs(b.netAmount) / maxNet) * 100;
              return (
                <li key={b.brokerCode}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 font-mono font-semibold">
                      {b.brokerCode}
                      {b.brokerName ? (
                        <span className="font-sans font-normal text-muted-foreground">
                          {b.brokerName}
                        </span>
                      ) : null}
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.5 text-[9px] font-bold uppercase",
                          TAG_TONE[b.tag],
                        )}
                      >
                        {BROKER_TAG_TEXT[b.tag]}
                      </span>
                    </span>
                    <span className={cn("shrink-0 font-mono", toneClass)}>
                      {b.netAmount > 0 ? "+" : "−"}
                      {formatCompactIDR(Math.abs(b.netAmount))}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn("h-full", tone === "bull" ? "bg-bull" : "bg-bear")}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
