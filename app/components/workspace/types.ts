import type { ChartTimeframe, IndicatorId } from "@/lib/types/ui";

/** Layout grid options for the Terminal Pro workspace. */
export type WorkspaceLayout = "1" | "2" | "4";

/** One chart pane inside the workspace grid. */
export interface WorkspacePane {
  /** Ticker code (uppercase, e.g. "BBRI"). Empty string = belum diisi. */
  ticker: string;
  /** Timeframe filter applied client-side oleh MTFChart. */
  interval: ChartTimeframe;
  /** Indicator yang aktif (overlay + oscillator). */
  indicators: IndicatorId[];
}

/** Full serializable workspace state. */
export interface WorkspaceConfig {
  layout: WorkspaceLayout;
  panes: WorkspacePane[];
}

export const MAX_PANES = 4;

export const LAYOUT_PANE_COUNT: Record<WorkspaceLayout, number> = {
  "1": 1,
  "2": 2,
  "4": 4,
};

export const DEFAULT_INDICATORS: IndicatorId[] = ["sma20", "sma50"];

export function emptyPane(): WorkspacePane {
  return { ticker: "", interval: "1Y", indicators: [...DEFAULT_INDICATORS] };
}

export function defaultWorkspace(): WorkspaceConfig {
  return {
    layout: "2",
    panes: [
      { ticker: "BBRI", interval: "1Y", indicators: [...DEFAULT_INDICATORS] },
      { ticker: "BBCA", interval: "1Y", indicators: [...DEFAULT_INDICATORS] },
      emptyPane(),
      emptyPane(),
    ],
  };
}
