"use client";

import { useState } from "react";
import type { ElliottAnalysisDTO } from "@/lib/elliott/service";
import { ElliottWaveCard } from "./ElliottWaveCard";
import { cn } from "@/lib/utils/cn";

interface Props {
  analyses: ElliottAnalysisDTO[];
}

/**
 * Wrapper component dengan timeframe switcher untuk Elliott Wave.
 */
export function ElliottWaveSection({ analyses }: Props) {
  if (analyses.length === 0) return null;

  // Filter analyses yang memang valid (waveType != unknown atau confidence > 0.4)
  const valid = analyses.filter((a) => a.waveType !== "unknown");

  const [activeTimeframe, setActiveTimeframe] = useState<string>(
    valid[0]?.timeframe ?? analyses[0]!.timeframe,
  );

  // Always show all available timeframes as tabs (even if unknown — user bisa switch)
  const allTfs = analyses.map((a) => a.timeframe);
  const active = analyses.find((a) => a.timeframe === activeTimeframe) ?? analyses[0]!;

  // If only 1 timeframe and it's unknown, hide entire section
  if (analyses.length === 1 && analyses[0]!.waveType === "unknown") return null;

  return (
    <div className="space-y-2">
      {/* Timeframe switcher — show only if multiple TFs */}
      {allTfs.length > 1 && (
        <div className="flex items-center gap-1 rounded-md border border-border bg-card p-1 w-fit">
          {allTfs.map((tf) => (
            <button
              key={tf}
              onClick={() => setActiveTimeframe(tf)}
              className={cn(
                "rounded px-3 py-1 text-xs font-medium transition",
                activeTimeframe === tf
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Elliott {tf}
            </button>
          ))}
        </div>
      )}
      <ElliottWaveCard analysis={active} />
    </div>
  );
}
