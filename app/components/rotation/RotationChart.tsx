"use client";

import * as React from "react";
import type { RotationEntity } from "@/lib/rotation/service";

interface Props {
  entities: RotationEntity[];
  variant?: "sector" | "ticker";
}

const QUADRANT_COLORS = {
  Leading: "#16a34a", // green
  Weakening: "#f59e0b", // orange
  Lagging: "#dc2626", // red
  Improving: "#2563eb", // blue
} as const;

/**
 * Plot RRG-style scatter chart pakai SVG.
 *
 * Center = (100, 100) — entity di sini berarti perform sama dengan benchmark.
 * Auto-scale axes ke (90, 110) tipikal, adjust kalau data extreme.
 */
export function RotationChart({ entities, variant = "sector" }: Props) {
  const [hovered, setHovered] = React.useState<string | null>(null);

  // Find extent
  const allPoints = entities.flatMap((e) => e.trail);
  if (allPoints.length === 0) {
    return <div className="rounded-md border border-border p-8 text-center text-sm text-muted-foreground">Tidak ada data rotation untuk ditampilkan.</div>;
  }

  const allRs = allPoints.map((p) => p.rsRatio);
  const allMom = allPoints.map((p) => p.rsMomentum);
  const minRs = Math.min(100, ...allRs);
  const maxRs = Math.max(100, ...allRs);
  const minMom = Math.min(100, ...allMom);
  const maxMom = Math.max(100, ...allMom);
  const rsPad = (maxRs - minRs) * 0.1 + 0.5;
  const momPad = (maxMom - minMom) * 0.1 + 0.5;
  const xMin = minRs - rsPad;
  const xMax = maxRs + rsPad;
  const yMin = minMom - momPad;
  const yMax = maxMom + momPad;

  const WIDTH = 640;
  const HEIGHT = 480;
  const MARGIN = 36;
  const innerW = WIDTH - MARGIN * 2;
  const innerH = HEIGHT - MARGIN * 2;

  const xScale = (v: number) => MARGIN + ((v - xMin) / (xMax - xMin)) * innerW;
  const yScale = (v: number) => MARGIN + innerH - ((v - yMin) / (yMax - yMin)) * innerH; // inverted

  // Center axis at 100
  const centerX = xScale(100);
  const centerY = yScale(100);

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full max-w-3xl mx-auto block">
        {/* Quadrant backgrounds */}
        <rect x={centerX} y={MARGIN} width={WIDTH - MARGIN - centerX} height={centerY - MARGIN} fill={QUADRANT_COLORS.Leading} opacity={0.08} />
        <rect x={centerX} y={centerY} width={WIDTH - MARGIN - centerX} height={HEIGHT - MARGIN - centerY} fill={QUADRANT_COLORS.Weakening} opacity={0.08} />
        <rect x={MARGIN} y={centerY} width={centerX - MARGIN} height={HEIGHT - MARGIN - centerY} fill={QUADRANT_COLORS.Lagging} opacity={0.08} />
        <rect x={MARGIN} y={MARGIN} width={centerX - MARGIN} height={centerY - MARGIN} fill={QUADRANT_COLORS.Improving} opacity={0.08} />

        {/* Quadrant labels */}
        <text x={WIDTH - MARGIN - 6} y={MARGIN + 16} textAnchor="end" fontSize="11" fontWeight="bold" fill={QUADRANT_COLORS.Leading} opacity={0.7}>LEADING</text>
        <text x={WIDTH - MARGIN - 6} y={HEIGHT - MARGIN - 6} textAnchor="end" fontSize="11" fontWeight="bold" fill={QUADRANT_COLORS.Weakening} opacity={0.7}>WEAKENING</text>
        <text x={MARGIN + 6} y={HEIGHT - MARGIN - 6} fontSize="11" fontWeight="bold" fill={QUADRANT_COLORS.Lagging} opacity={0.7}>LAGGING</text>
        <text x={MARGIN + 6} y={MARGIN + 16} fontSize="11" fontWeight="bold" fill={QUADRANT_COLORS.Improving} opacity={0.7}>IMPROVING</text>

        {/* Crosshair axes at 100/100 */}
        <line x1={centerX} y1={MARGIN} x2={centerX} y2={HEIGHT - MARGIN} stroke="currentColor" strokeWidth={1} opacity={0.3} strokeDasharray="3,3" />
        <line x1={MARGIN} y1={centerY} x2={WIDTH - MARGIN} y2={centerY} stroke="currentColor" strokeWidth={1} opacity={0.3} strokeDasharray="3,3" />

        {/* Outer frame */}
        <rect x={MARGIN} y={MARGIN} width={innerW} height={innerH} fill="none" stroke="currentColor" strokeWidth={1} opacity={0.4} />

        {/* X axis label */}
        <text x={WIDTH / 2} y={HEIGHT - 8} textAnchor="middle" fontSize="11" fontWeight="500" opacity={0.6} fill="currentColor">
          JdK RS-Ratio (relatif vs IHSG) →
        </text>
        {/* Y axis label */}
        <text x={12} y={HEIGHT / 2} textAnchor="middle" fontSize="11" fontWeight="500" opacity={0.6} fill="currentColor" transform={`rotate(-90, 12, ${HEIGHT / 2})`}>
          JdK RS-Momentum →
        </text>

        {/* Entities */}
        {entities.map((e) => {
          const trail = e.trail;
          if (trail.length === 0) return null;
          const last = trail[trail.length - 1]!;
          const isHovered = hovered === e.kode;
          const radius = isHovered ? 8 : 5;
          const color = QUADRANT_COLORS[last.quadrant];

          // Trail line
          const pathData = trail
            .map((p, i) => {
              const px = xScale(p.rsRatio);
              const py = yScale(p.rsMomentum);
              return `${i === 0 ? "M" : "L"} ${px} ${py}`;
            })
            .join(" ");

          return (
            <g
              key={e.kode}
              onMouseEnter={() => setHovered(e.kode)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: "pointer" }}
            >
              <path d={pathData} stroke={color} strokeWidth={isHovered ? 2 : 1} fill="none" opacity={isHovered ? 0.9 : 0.4} />
              {trail.slice(0, -1).map((p, i) => (
                <circle key={i} cx={xScale(p.rsRatio)} cy={yScale(p.rsMomentum)} r={2.5} fill={color} opacity={0.5} />
              ))}
              <circle cx={xScale(last.rsRatio)} cy={yScale(last.rsMomentum)} r={radius} fill={color} stroke="white" strokeWidth={2} />
              <text
                x={xScale(last.rsRatio)}
                y={yScale(last.rsMomentum) - radius - 4}
                textAnchor="middle"
                fontSize={variant === "sector" ? 11 : 9}
                fontWeight="bold"
                fill="currentColor"
                pointerEvents="none"
              >
                {variant === "sector" ? e.name.slice(0, 12) : e.kode}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="mt-2 flex flex-wrap items-center justify-center gap-3 text-[11px]">
        {(["Leading", "Weakening", "Lagging", "Improving"] as const).map((q) => (
          <span key={q} className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: QUADRANT_COLORS[q] }} />
            {q}
          </span>
        ))}
      </div>
    </div>
  );
}
