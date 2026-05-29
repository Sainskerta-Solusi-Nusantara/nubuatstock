"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Check, LayoutGrid, Link as LinkIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import type { ChartTimeframe, IndicatorId } from "@/lib/types/ui";
import { WorkspacePane } from "./WorkspacePane";
import { FunctionCodeBar } from "./FunctionCodeBar";
import {
  LAYOUT_PANE_COUNT,
  defaultWorkspace,
  type WorkspaceConfig,
  type WorkspaceLayout,
} from "./types";
import {
  WORKSPACE_PARAM_KEY,
  buildShareUrl,
  decodeWorkspace,
  encodeWorkspace,
} from "./url-state";

const LAYOUT_OPTIONS: { value: WorkspaceLayout; label: string }[] = [
  { value: "1", label: "1 Pane" },
  { value: "2", label: "2 Pane" },
  { value: "4", label: "4 Pane" },
];

const GRID_CLASS: Record<WorkspaceLayout, string> = {
  "1": "grid-cols-1",
  "2": "grid-cols-1 lg:grid-cols-2",
  "4": "grid-cols-1 lg:grid-cols-2",
};

export function WorkspaceGrid() {
  const searchParams = useSearchParams();

  // Init dari URL sekali (param ?ws=...). Setelah itu state lokal yang berkuasa.
  const [config, setConfig] = React.useState<WorkspaceConfig>(() =>
    defaultWorkspace(),
  );
  const [copied, setCopied] = React.useState(false);
  const initialized = React.useRef(false);

  React.useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const raw = searchParams.get(WORKSPACE_PARAM_KEY);
    setConfig(decodeWorkspace(raw));
  }, [searchParams]);

  // Sinkron URL (replaceState) supaya reload mempertahankan layout tanpa nambah history.
  React.useEffect(() => {
    if (!initialized.current) return;
    if (typeof window === "undefined") return;
    const encoded = encodeWorkspace(config);
    const url = new URL(window.location.href);
    url.searchParams.set(WORKSPACE_PARAM_KEY, encoded);
    window.history.replaceState(null, "", url.toString());
  }, [config]);

  const paneCount = LAYOUT_PANE_COUNT[config.layout];

  const setLayout = (layout: WorkspaceLayout) => {
    setConfig((prev) => ({ ...prev, layout }));
  };

  const updatePane = React.useCallback(
    (index: number, patch: Partial<WorkspaceConfig["panes"][number]>) => {
      setConfig((prev) => {
        const panes = prev.panes.slice();
        panes[index] = { ...panes[index]!, ...patch };
        return { ...prev, panes };
      });
    },
    [],
  );

  const onChangeTicker = React.useCallback(
    (index: number, ticker: string) => updatePane(index, { ticker }),
    [updatePane],
  );
  const onChangeIndicators = React.useCallback(
    (index: number, indicators: IndicatorId[]) =>
      updatePane(index, { indicators }),
    [updatePane],
  );
  const onChangeInterval = React.useCallback(
    (index: number, interval: ChartTimeframe) => updatePane(index, { interval }),
    [updatePane],
  );
  const onClear = React.useCallback(
    (index: number) =>
      updatePane(index, { ticker: "", indicators: ["sma20", "sma50"] }),
    [updatePane],
  );

  // Function-code bar: kalau hasilkan ticker, isi pane kosong pertama.
  const onFunctionTicker = React.useCallback((ticker: string) => {
    setConfig((prev) => {
      const count = LAYOUT_PANE_COUNT[prev.layout];
      const slot = prev.panes.findIndex((p, i) => i < count && !p.ticker);
      const target = slot === -1 ? 0 : slot;
      const panes = prev.panes.slice();
      panes[target] = { ...panes[target]!, ticker };
      return { ...prev, panes };
    });
  }, []);

  const share = async () => {
    const url = buildShareUrl(config);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback: prompt supaya user bisa copy manual.
      window.prompt("Salin URL workspace:", url);
    }
  };

  const chartHeight = config.layout === "4" ? 240 : config.layout === "2" ? 320 : 440;

  return (
    <div className="space-y-4">
      <FunctionCodeBar onTicker={onFunctionTicker} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 rounded-md border bg-muted/30 p-0.5">
          <LayoutGrid
            className="mx-1.5 h-4 w-4 text-muted-foreground"
            aria-hidden
          />
          {LAYOUT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setLayout(opt.value)}
              aria-pressed={config.layout === opt.value}
              className={cn(
                "rounded px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                config.layout === opt.value &&
                  "bg-background text-foreground shadow",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <Button type="button" size="sm" variant="outline" onClick={share}>
          {copied ? (
            <>
              <Check className="mr-1 h-4 w-4" aria-hidden />
              Tersalin
            </>
          ) : (
            <>
              <LinkIcon className="mr-1 h-4 w-4" aria-hidden />
              Bagikan
            </>
          )}
        </Button>
      </div>

      <div className={cn("grid gap-3", GRID_CLASS[config.layout])}>
        {config.panes.slice(0, paneCount).map((pane, i) => (
          <WorkspacePane
            key={i}
            index={i}
            pane={pane}
            chartHeight={chartHeight}
            onChangeTicker={onChangeTicker}
            onChangeIndicators={onChangeIndicators}
            onChangeInterval={onChangeInterval}
            onClear={onClear}
          />
        ))}
      </div>
    </div>
  );
}
