"use client";

import { cn } from "@/lib/utils/cn";
import type { Alert, AlertCondition } from "@/lib/types/alerts";

interface AlertCardProps {
  alert: Alert;
  onPause?: (id: string) => void;
  onResume?: (id: string) => void;
  onDelete?: (id: string) => void;
}

const STATUS_LABEL: Record<Alert["status"], string> = {
  active: "Aktif",
  paused: "Dijeda",
  triggered: "Terpicu",
  expired: "Kadaluwarsa",
};

const STATUS_COLOR: Record<Alert["status"], string> = {
  active: "bg-bull-soft text-bull",
  paused: "bg-neutral-soft text-neutral",
  triggered: "bg-bear-soft text-bear",
  expired: "bg-muted text-muted-foreground",
};

function summarizeCondition(c: AlertCondition): string {
  switch (c.type) {
    case "price_above":
      return `Harga > ${c.params.value.toLocaleString("id-ID")}`;
    case "price_below":
      return `Harga < ${c.params.value.toLocaleString("id-ID")}`;
    case "pct_change":
      return `Perubahan ${c.params.direction === "up" ? "+" : "-"}${c.params.changePct}% (${c.params.window})`;
    case "volume_spike":
      return `Volume ≥ ${c.params.multiple}× rata-rata ${c.params.lookback} hari`;
    case "ma_cross":
      return `${c.params.direction === "golden" ? "Golden" : "Death"} cross MA${c.params.fast}/${c.params.slow}`;
    case "rsi_threshold":
      return `RSI(${c.params.period}) ${c.params.direction === "above" ? "≥" : "≤"} ${c.params.threshold}`;
  }
}

export function AlertCard({ alert, onPause, onResume, onDelete }: AlertCardProps) {
  const condition = alert.condition as AlertCondition;
  return (
    <div className="rounded-lg border border-border bg-card p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono font-semibold">{alert.companyKode}</span>
            <span
              className={cn(
                "text-xs px-2 py-0.5 rounded-full",
                STATUS_COLOR[alert.status],
              )}
            >
              {STATUS_LABEL[alert.status]}
            </span>
          </div>
          <div className="text-sm font-medium mt-0.5 truncate">{alert.name}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {summarizeCondition(condition)}
          </div>
        </div>
        <div className="text-xs text-muted-foreground shrink-0 text-right">
          {alert.lastTriggeredAt ? (
            <div>
              Terakhir: {new Date(alert.lastTriggeredAt).toLocaleString("id-ID")}
            </div>
          ) : null}
          <div>Terpicu {alert.triggerCount}×</div>
        </div>
      </div>
      <div className="flex gap-2 text-xs">
        {alert.status === "active" ? (
          <button
            type="button"
            onClick={() => onPause?.(alert.id)}
            className="px-2 py-1 rounded-md border border-border hover:bg-accent transition"
          >
            Jeda
          </button>
        ) : alert.status === "paused" || alert.status === "triggered" ? (
          <button
            type="button"
            onClick={() => onResume?.(alert.id)}
            className="px-2 py-1 rounded-md border border-border hover:bg-accent transition"
          >
            Aktifkan
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => onDelete?.(alert.id)}
          className="px-2 py-1 rounded-md border border-border hover:bg-accent text-bear transition ml-auto"
        >
          Hapus
        </button>
      </div>
    </div>
  );
}
