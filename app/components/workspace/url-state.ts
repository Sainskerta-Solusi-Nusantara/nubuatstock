import type { ChartTimeframe, IndicatorId } from "@/lib/types/ui";
import {
  DEFAULT_INDICATORS,
  LAYOUT_PANE_COUNT,
  MAX_PANES,
  defaultWorkspace,
  emptyPane,
  type WorkspaceConfig,
  type WorkspaceLayout,
  type WorkspacePane,
} from "./types";

/**
 * URL-state codec untuk workspace. Config disimpan sebagai base64url(JSON) di
 * param `?ws=`. Tidak butuh DB — share-via-URL murni client-state. Decode
 * defensif: input rusak → fallback ke default workspace.
 */

const PARAM_KEY = "ws";

const VALID_LAYOUTS: WorkspaceLayout[] = ["1", "2", "4"];
const VALID_TIMEFRAMES: ChartTimeframe[] = [
  "1D",
  "5D",
  "1M",
  "3M",
  "1Y",
  "5Y",
  "MAX",
];
const VALID_INDICATORS: IndicatorId[] = [
  "sma20",
  "sma50",
  "sma200",
  "ema12",
  "ema26",
  "bollinger",
  "rsi14",
  "macd",
];

function toBase64Url(input: string): string {
  // btoa beroperasi pada Latin-1; encodeURIComponent → unescape supaya UTF-8 aman.
  const b64 =
    typeof window === "undefined"
      ? Buffer.from(input, "utf-8").toString("base64")
      : window.btoa(unescape(encodeURIComponent(input)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(input: string): string {
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/");
  if (typeof window === "undefined") {
    return Buffer.from(b64, "base64").toString("utf-8");
  }
  return decodeURIComponent(escape(window.atob(b64)));
}

function sanitizePane(raw: unknown): WorkspacePane {
  const base = emptyPane();
  if (!raw || typeof raw !== "object") return base;
  const obj = raw as Record<string, unknown>;

  const ticker =
    typeof obj.ticker === "string"
      ? obj.ticker.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6)
      : "";

  const interval = VALID_TIMEFRAMES.includes(obj.interval as ChartTimeframe)
    ? (obj.interval as ChartTimeframe)
    : "1Y";

  const indicators = Array.isArray(obj.indicators)
    ? (obj.indicators.filter((i) =>
        VALID_INDICATORS.includes(i as IndicatorId),
      ) as IndicatorId[])
    : [...DEFAULT_INDICATORS];

  return { ticker, interval, indicators };
}

export function decodeWorkspace(encoded: string | null | undefined): WorkspaceConfig {
  if (!encoded) return defaultWorkspace();
  try {
    const json = fromBase64Url(encoded);
    const parsed = JSON.parse(json) as unknown;
    if (!parsed || typeof parsed !== "object") return defaultWorkspace();
    const obj = parsed as Record<string, unknown>;

    const layout = VALID_LAYOUTS.includes(obj.layout as WorkspaceLayout)
      ? (obj.layout as WorkspaceLayout)
      : "2";

    const rawPanes = Array.isArray(obj.panes) ? obj.panes : [];
    const panes: WorkspacePane[] = [];
    for (let i = 0; i < MAX_PANES; i += 1) {
      panes.push(sanitizePane(rawPanes[i]));
    }

    return { layout, panes };
  } catch {
    return defaultWorkspace();
  }
}

export function encodeWorkspace(config: WorkspaceConfig): string {
  // Hanya simpan pane yang relevan untuk layout aktif → URL lebih pendek.
  const count = LAYOUT_PANE_COUNT[config.layout];
  const trimmed: WorkspaceConfig = {
    layout: config.layout,
    panes: config.panes.slice(0, count),
  };
  return toBase64Url(JSON.stringify(trimmed));
}

/** Bangun URL share-able penuh dari config. */
export function buildShareUrl(config: WorkspaceConfig, origin?: string): string {
  const base =
    origin ??
    (typeof window !== "undefined"
      ? `${window.location.origin}${window.location.pathname}`
      : "/workspace");
  return `${base}?${PARAM_KEY}=${encodeWorkspace(config)}`;
}

export { PARAM_KEY as WORKSPACE_PARAM_KEY };
