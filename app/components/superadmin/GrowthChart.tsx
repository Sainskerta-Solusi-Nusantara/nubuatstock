"use client";

import * as React from "react";

export interface GrowthPoint {
  date: string; // YYYY-MM-DD
  signups: number;
  activated: number;
}

const PERIODS = [
  { label: "7h", days: 7 },
  { label: "30h", days: 30 },
  { label: "90h", days: 90 },
] as const;

const W = 800;
const H = 200;
const PAD = 24;

function fmtDate(d: string): string {
  const [, mm, dd] = d.split("-");
  return `${dd}/${mm}`;
}

/** Chart pertumbuhan harian interaktif: filter periode + hover detail per hari. */
export function GrowthChart({ points }: { points: GrowthPoint[] }) {
  const [days, setDays] = React.useState(30);
  const [hover, setHover] = React.useState<number | null>(null);
  const svgRef = React.useRef<SVGSVGElement>(null);

  const data = React.useMemo(() => points.slice(-days), [points, days]);

  if (points.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        Belum ada data signup. Tunggu user pertama mendaftar.
      </div>
    );
  }

  const maxSignups = Math.max(1, ...data.map((p) => p.signups));
  const maxActive = Math.max(1, ...data.map((p) => p.activated));
  const max = Math.max(maxSignups, maxActive);
  const dx = (W - PAD * 2) / Math.max(1, data.length - 1);
  const totalSignups = data.reduce((s, p) => s + p.signups, 0);
  const totalActive = data.reduce((s, p) => s + p.activated, 0);

  const xOf = (i: number) => PAD + i * dx;
  const yOf = (v: number) => H - PAD - (v / max) * (H - PAD * 2);

  const linePath = (key: "signups" | "activated") =>
    data.map((p, i) => `${i === 0 ? "M" : "L"} ${xOf(i)} ${yOf(p[key])}`).join(" ");

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const xView = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round((xView - PAD) / dx);
    setHover(Math.max(0, Math.min(data.length - 1, i)));
  }

  const hp = hover != null ? data[hover] : null;

  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-end gap-1">
        {PERIODS.map((p) => (
          <button
            key={p.days}
            onClick={() => { setDays(p.days); setHover(null); }}
            className={`h-7 rounded-md px-2.5 text-xs font-medium ${
              days === p.days ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="relative w-full">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="h-52 w-full"
          aria-label="Pertumbuhan harian"
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
        >
          <g stroke="currentColor" strokeOpacity="0.1" strokeWidth="1">
            {[0, 0.25, 0.5, 0.75, 1].map((t) => (
              <line key={t} x1={PAD} y1={PAD + (H - PAD * 2) * t} x2={W - PAD} y2={PAD + (H - PAD * 2) * t} />
            ))}
          </g>
          {/* y-axis ticks (kiri) */}
          <g fill="currentColor" fillOpacity="0.5" fontSize="9">
            <text x={2} y={PAD + 3}>{max}</text>
            <text x={2} y={H - PAD}>0</text>
          </g>

          <path d={linePath("activated")} fill="none" stroke="oklch(0.65 0.18 245)" strokeWidth="2" strokeDasharray="3 3" strokeLinecap="round" />
          <path d={linePath("signups")} fill="none" stroke="oklch(0.72 0.17 160)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

          {/* titik signups (lebih jelas saat data sedikit) */}
          {data.length <= 31 && data.map((p, i) => (
            <circle key={i} cx={xOf(i)} cy={yOf(p.signups)} r={2} fill="oklch(0.72 0.17 160)" />
          ))}

          {/* hover: garis vertikal + titik + tooltip */}
          {hp && hover != null && (
            <g>
              <line x1={xOf(hover)} y1={PAD} x2={xOf(hover)} y2={H - PAD} stroke="currentColor" strokeOpacity="0.3" strokeWidth="1" />
              <circle cx={xOf(hover)} cy={yOf(hp.signups)} r={3.5} fill="oklch(0.72 0.17 160)" stroke="white" strokeWidth="1.5" />
              <circle cx={xOf(hover)} cy={yOf(hp.activated)} r={3.5} fill="oklch(0.65 0.18 245)" stroke="white" strokeWidth="1.5" />
              {(() => {
                const tx = Math.min(W - 150, Math.max(4, xOf(hover) + 8));
                return (
                  <g>
                    <rect x={tx} y={PAD} width={142} height={48} rx={4} fill="black" fillOpacity="0.82" />
                    <text x={tx + 8} y={PAD + 16} fill="white" fontSize="11" fontWeight="bold">{fmtDate(hp.date)}</text>
                    <text x={tx + 8} y={PAD + 31} fill="oklch(0.82 0.17 160)" fontSize="10">● {hp.signups} signup</text>
                    <text x={tx + 8} y={PAD + 44} fill="oklch(0.78 0.18 245)" fontSize="10">● {hp.activated} aktif</text>
                  </g>
                );
              })()}
            </g>
          )}
        </svg>
      </div>

      <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <div className="flex gap-4">
          <span className="flex items-center gap-1"><span className="h-2 w-3 rounded bg-primary" /> Signups</span>
          <span className="flex items-center gap-1"><span className="h-0.5 w-3 border-b border-dashed border-blue-400" /> Active</span>
        </div>
        <div>
          Max {max}/hari · <strong>{totalSignups}</strong> signup · <strong>{totalActive}</strong> aktif (window {days}h)
        </div>
      </div>
    </div>
  );
}
