"use client";

import { cn } from "@/lib/utils/cn";
import type { UsageSummaryItem } from "@/lib/types/billing";

const COUNTER_LABELS: Record<string, string> = {
  "ai.queries": "AI Buddy Queries",
  "alerts.created": "Alert dibuat",
  "picks.unlock": "Daily Picks dibuka",
  "backtest.runs": "Backtest run",
  "api.requests": "API requests",
};

export function UsageBar({ item }: { item: UsageSummaryItem }) {
  const label = COUNTER_LABELS[item.counterKey] ?? item.counterKey;
  const pct = item.unlimited || !item.limit ? 0 : Math.min(100, Math.round((item.used / item.limit) * 100));
  const isCritical = pct >= 80;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">
          {item.unlimited
            ? `${item.used.toLocaleString("id-ID")} / Unlimited`
            : `${item.used.toLocaleString("id-ID")} / ${(item.limit ?? 0).toLocaleString("id-ID")}`}
        </span>
      </div>
      {!item.unlimited && (
        <div className="h-2 w-full overflow-hidden rounded bg-muted">
          <div
            className={cn(
              "h-full transition-all",
              isCritical ? "bg-destructive" : "bg-primary",
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}
