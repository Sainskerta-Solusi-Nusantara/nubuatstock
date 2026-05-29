"use client";

import * as React from "react";
import { Loader2, X } from "lucide-react";

import { MTFChart } from "@/components/chart/MTFChart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";
import type { OhlcvBar } from "@/lib/types/market";
import type { ChartTimeframe, IndicatorId } from "@/lib/types/ui";
import type { WorkspacePane as PaneState } from "./types";

interface WorkspacePaneProps {
  index: number;
  pane: PaneState;
  /** Tinggi chart area; lebih kecil saat grid 4-pane. */
  chartHeight: number;
  onChangeTicker: (index: number, ticker: string) => void;
  onChangeIndicators: (index: number, indicators: IndicatorId[]) => void;
  onChangeInterval: (index: number, interval: ChartTimeframe) => void;
  onClear: (index: number) => void;
}

interface OhlcvResponse {
  ok: boolean;
  data?: { bars?: OhlcvBar[] };
}

export function WorkspacePane({
  index,
  pane,
  chartHeight,
  onChangeTicker,
  onChangeIndicators,
  onChangeInterval,
  onClear,
}: WorkspacePaneProps) {
  const [draft, setDraft] = React.useState(pane.ticker);
  const [bars, setBars] = React.useState<OhlcvBar[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setDraft(pane.ticker);
  }, [pane.ticker]);

  const ticker = pane.ticker;

  React.useEffect(() => {
    if (!ticker) {
      setBars([]);
      setError(null);
      return;
    }
    const ac = new AbortController();
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const url = `/api/market/ohlcv/${encodeURIComponent(
          ticker,
        )}?interval=1d&range=5y`;
        const res = await fetch(url, { signal: ac.signal });
        if (!res.ok) {
          setBars([]);
          setError(
            res.status === 404
              ? `Ticker ${ticker} tidak ditemukan`
              : `Gagal memuat data (${res.status})`,
          );
          return;
        }
        const json = (await res.json()) as OhlcvResponse;
        const next = json.ok && json.data?.bars ? json.data.bars : [];
        setBars(next);
        if (next.length === 0) setError(`Data harga ${ticker} belum tersedia`);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setBars([]);
        setError("Gagal memuat data");
      } finally {
        setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [ticker]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = draft.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
    if (next) onChangeTicker(index, next);
  };

  return (
    <div className="flex min-w-0 flex-col rounded-lg border bg-card">
      <div className="flex items-center gap-2 border-b p-2">
        <form onSubmit={submit} className="flex flex-1 items-center gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value.toUpperCase())}
            placeholder="Ticker (mis. BBRI)"
            aria-label={`Ticker pane ${index + 1}`}
            className="h-8 w-32 font-mono text-sm uppercase"
            maxLength={6}
          />
          <Button type="submit" size="sm" variant="secondary" className="h-8">
            Muat
          </Button>
        </form>
        {loading && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden />
        )}
        {pane.ticker && (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            aria-label={`Kosongkan pane ${index + 1}`}
            onClick={() => onClear(index)}
          >
            <X className="h-4 w-4" aria-hidden />
          </Button>
        )}
      </div>

      <div className="min-w-0 p-2">
        {!pane.ticker ? (
          <div
            className={cn(
              "flex items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground",
            )}
            style={{ height: chartHeight }}
          >
            Ketik ticker untuk menampilkan chart
          </div>
        ) : error && bars.length === 0 ? (
          <div
            className="flex items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground"
            style={{ height: chartHeight }}
          >
            {error}
          </div>
        ) : (
          <MTFChart
            key={pane.ticker}
            ticker={pane.ticker}
            data={bars}
            defaultTimeframe={pane.interval}
            defaultActive={pane.indicators}
            chartHeight={chartHeight}
            onTimeframeChange={(tf) => onChangeInterval(index, tf)}
            onIndicatorsChange={(ids) => onChangeIndicators(index, ids)}
          />
        )}
      </div>
    </div>
  );
}
