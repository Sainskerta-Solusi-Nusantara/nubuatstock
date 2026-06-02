"use client";

import * as React from "react";
import type {
  ChangelogResult,
  DashData,
  DashEmiten,
  DashHolder,
  SummaryGainerLoser,
  SummaryHolder,
  SummaryStockFlow,
} from "@/lib/ownership1pct/service";
import { fmtDateId } from "@/lib/utils/date-id";

/* ---------- format helpers ---------- */
const nf = new Intl.NumberFormat("id-ID");
const fmtShares = (n: number) => nf.format(n);
function fmtRp(n: number): string {
  if (!n) return "—";
  if (n >= 1e12) return `Rp ${(n / 1e12).toFixed(1)} T`;
  if (n >= 1e9) return `Rp ${(n / 1e9).toFixed(1)} M`;
  if (n >= 1e6) return `Rp ${(n / 1e6).toFixed(1)} jt`;
  return `Rp ${nf.format(n)}`;
}
const pct = (n: number) => `${n.toFixed(2)}%`;

const LIST_PAGE = 50;
function pageNums(cur: number, total: number): (number | "…")[] {
  if (total <= 9) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | "…")[] = [1];
  const lo = Math.max(2, cur - 2), hi = Math.min(total - 1, cur + 2);
  if (lo > 2) out.push("…");
  for (let i = lo; i <= hi; i++) out.push(i);
  if (hi < total - 1) out.push("…");
  out.push(total);
  return out;
}
function Pager({ page, total, onPage }: { page: number; total: number; onPage: (p: number) => void }) {
  const totalPages = Math.max(1, Math.ceil(total / LIST_PAGE));
  if (totalPages <= 1) return null;
  return (
    <div className="flex flex-wrap items-center justify-center gap-1 pt-1">
      <button onClick={() => onPage(Math.max(1, page - 1))} disabled={page <= 1} className="inline-flex h-8 items-center rounded-md border border-input px-2.5 text-sm disabled:opacity-40 hover:bg-accent">‹</button>
      {pageNums(page, totalPages).map((n, i) => n === "…" ? (
        <span key={`e${i}`} className="px-1.5 text-muted-foreground">…</span>
      ) : (
        <button key={n} onClick={() => onPage(n)} className={`inline-flex h-8 min-w-[2rem] items-center justify-center rounded-md border px-2 text-sm font-medium ${n === page ? "border-primary bg-primary text-primary-foreground" : "border-input hover:bg-accent"}`}>{n}</button>
      ))}
      <button onClick={() => onPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages} className="inline-flex h-8 items-center rounded-md border border-input px-2.5 text-sm disabled:opacity-40 hover:bg-accent">›</button>
    </div>
  );
}

const TYPE_LABEL: Record<string, string> = {
  "": "Unknown", CORPORATE: "Corporate", INDIVIDUAL: "Individual",
  "STATE OWNED ENTERPRISES": "BUMN", INSURANCE: "Insurance", "MUTUAL FUND": "Reksa Dana",
  "PENSION FUND": "Pension Fund", BANK: "Bank", "SECURITIES COMPANY": "Securities", FOUNDATION: "Yayasan",
};
const typeLabel = (t: string) => TYPE_LABEL[t] ?? (t ? t.charAt(0) + t.slice(1).toLowerCase() : "Unknown");
const isBUMN = (t: string) => /STATE OWNED|BUMN/i.test(t);

function StatusBadge({ lf, type, domicile }: { lf: string; type: string; domicile: string }) {
  if (isBUMN(type)) return <span className="rounded bg-bear/15 px-1.5 py-0.5 text-[10px] font-semibold text-bear">BUMN</span>;
  return lf === "F"
    ? <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600" title={domicile}>Asing</span>
    : <span className="rounded bg-bull/15 px-1.5 py-0.5 text-[10px] font-semibold text-bull">Lokal</span>;
}

/* ---------- mini network graph (SVG radial) ---------- */
function MiniGraph({ center, nodes }: { center: string; nodes: { label: string }[] }) {
  const W = 360, H = 300, cx = W / 2, cy = H / 2, R = 110;
  const shown = nodes.slice(0, 14);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full">
      {shown.map((n, i) => {
        const a = (i / Math.max(1, shown.length)) * Math.PI * 2 - Math.PI / 2;
        const x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R;
        return <line key={`l${i}`} x1={cx} y1={cy} x2={x} y2={y} stroke="currentColor" strokeOpacity={0.2} strokeDasharray="3 3" />;
      })}
      {shown.map((n, i) => {
        const a = (i / Math.max(1, shown.length)) * Math.PI * 2 - Math.PI / 2;
        const x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R;
        const lab = n.label.length > 16 ? n.label.slice(0, 15) + "…" : n.label;
        return (
          <g key={`n${i}`}>
            <circle cx={x} cy={y} r={5} className="fill-emerald-500" />
            <text x={x} y={y - 8} textAnchor="middle" className="fill-muted-foreground text-[8px]">{lab}</text>
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r={22} className="fill-primary" />
      <text x={cx} y={cy + 3} textAnchor="middle" className="fill-primary-foreground text-[10px] font-bold">{center}</text>
    </svg>
  );
}

/* ---------- interactive network graph (zoom / pan / hover / fullscreen) ---------- */
type CrossIndex = Map<string, { kode: string; pct: number }[]>;

function holderColor(h: { type: string; lf: string }): string {
  if (isBUMN(h.type)) return "#ef4444"; // BUMN
  if (/INDIVIDUAL/i.test(h.type)) return "#f97316"; // individu
  if (h.lf === "F") return "#eab308"; // asing
  return "#10b981"; // korporasi/institusi lokal
}

function NetworkGraph({
  center,
  holders,
  index,
}: {
  center: string;
  holders: DashHolder[];
  index: CrossIndex;
}) {
  const VB_W = 640, VB_H = 480, cx = VB_W / 2, cy = VB_H / 2;
  const [scale, setScale] = React.useState(1);
  const [tr, setTr] = React.useState({ x: 0, y: 0 });
  const [hover, setHover] = React.useState<string | null>(null);
  const [full, setFull] = React.useState(false);
  const drag = React.useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const svgRef = React.useRef<SVGSVGElement>(null);

  // --- layout ---
  const layout = React.useMemo(() => {
    const H = holders.slice(0, 16);
    const R1 = 130;
    const holderPos = H.map((h, i) => {
      const a = (i / Math.max(1, H.length)) * Math.PI * 2 - Math.PI / 2;
      return { x: cx + Math.cos(a) * R1, y: cy + Math.sin(a) * R1, h };
    });
    const conn = new Map<string, number>();
    const hStocks = holderPos.map((hp) => {
      const list = (index.get(hp.h.name) ?? []).filter((s) => s.kode !== center);
      const top = [...list].sort((a, b) => b.pct - a.pct).slice(0, 6);
      top.forEach((s) => conn.set(s.kode, (conn.get(s.kode) ?? 0) + 1));
      return { hp, stocks: top.map((s) => s.kode) };
    });
    const codes = [...conn.keys()].sort((a, b) => (conn.get(b) ?? 0) - (conn.get(a) ?? 0)).slice(0, 30);
    const codeSet = new Set(codes);
    const R2 = 215;
    const stockPos = new Map<string, { x: number; y: number }>();
    codes.forEach((k, i) => {
      const a = (i / Math.max(1, codes.length)) * Math.PI * 2 - Math.PI / 2;
      stockPos.set(k, { x: cx + Math.cos(a) * R2, y: cy + Math.sin(a) * R2 });
    });
    return { holderPos, hStocks, codes, codeSet, stockPos };
  }, [holders, index, center, cx, cy]);

  // --- highlight set when hovering ---
  const active = React.useMemo(() => {
    if (!hover) return null;
    const set = new Set<string>([hover]);
    if (hover === `c:${center}`) {
      layout.holderPos.forEach((hp) => set.add(`h:${hp.h.name}`));
    } else if (hover.startsWith("h:")) {
      const name = hover.slice(2);
      set.add(`c:${center}`);
      layout.hStocks.find((x) => x.hp.h.name === name)?.stocks.forEach((k) => layout.codeSet.has(k) && set.add(`s:${k}`));
    } else if (hover.startsWith("s:")) {
      const kode = hover.slice(2);
      layout.hStocks.forEach((x) => { if (x.stocks.includes(kode)) set.add(`h:${x.hp.h.name}`); });
    }
    return set;
  }, [hover, center, layout]);
  const dim = (id: string) => active != null && !active.has(id) ? 0.12 : 1;

  // --- interactions ---
  const toVB = () => {
    const r = svgRef.current?.getBoundingClientRect();
    if (!r) return { sx: 1, sy: 1 };
    return { sx: VB_W / r.width, sy: VB_H / r.height };
  };
  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setScale((s) => Math.min(3, Math.max(0.4, s * (e.deltaY < 0 ? 1.12 : 0.89))));
  };
  const onDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, tx: tr.x, ty: tr.y };
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const { sx, sy } = toVB();
    setTr({ x: drag.current.tx + (e.clientX - drag.current.x) * sx, y: drag.current.ty + (e.clientY - drag.current.y) * sy });
  };
  const onUp = () => { drag.current = null; };
  const reset = () => { setScale(1); setTr({ x: 0, y: 0 }); };

  const tip = React.useMemo(() => {
    if (!hover) return null;
    if (hover.startsWith("h:")) {
      const name = hover.slice(2);
      const h = holders.find((x) => x.name === name);
      if (!h) return null;
      const others = (index.get(name) ?? []).filter((s) => s.kode !== center).length;
      const pos = layout.holderPos.find((p) => p.h.name === name)!;
      return { x: pos.x, y: pos.y, lines: [name, `${typeLabel(h.type)} · ${h.lf === "F" ? "Asing" : "Lokal"}`, `${pct(h.pct)} di ${center}`, others ? `+${others} saham lain` : "hanya di sini"] };
    }
    if (hover.startsWith("s:")) {
      const kode = hover.slice(2);
      const pos = layout.stockPos.get(kode);
      if (!pos) return null;
      const via = layout.hStocks.filter((x) => x.stocks.includes(kode)).map((x) => x.hp.h.name);
      return { x: pos.x, y: pos.y, lines: [kode, `terhubung via ${via.length} pemegang`, ...via.slice(0, 3).map((n) => "• " + (n.length > 22 ? n.slice(0, 21) + "…" : n))] };
    }
    return null;
  }, [hover, holders, index, center, layout]);

  const graph = (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      className="h-full w-full touch-none select-none"
      style={{ cursor: drag.current ? "grabbing" : "grab" }}
      onWheel={onWheel}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerLeave={() => { onUp(); setHover(null); }}
    >
      <g transform={`translate(${tr.x} ${tr.y}) scale(${scale})`}>
        {/* edges: holder -> stock (dashed) */}
        {layout.hStocks.flatMap((x) =>
          x.stocks.filter((k) => layout.codeSet.has(k)).map((k) => {
            const sp = layout.stockPos.get(k)!;
            const on = active == null || (active.has(`h:${x.hp.h.name}`) && active.has(`s:${k}`));
            return <line key={`hs${x.hp.h.name}-${k}`} x1={x.hp.x} y1={x.hp.y} x2={sp.x} y2={sp.y} stroke="currentColor" strokeOpacity={on ? 0.35 : 0.05} strokeDasharray="3 3" />;
          }),
        )}
        {/* edges: center -> holder (solid) */}
        {layout.holderPos.map((hp, i) => {
          const on = active == null || (active.has(`c:${center}`) && active.has(`h:${hp.h.name}`));
          return <line key={`ch${i}`} x1={cx} y1={cy} x2={hp.x} y2={hp.y} stroke="currentColor" strokeOpacity={on ? 0.45 : 0.07} strokeWidth={1.2} />;
        })}
        {/* stock pills */}
        {layout.codes.map((k) => {
          const p = layout.stockPos.get(k)!;
          const w = 8 + k.length * 7;
          return (
            <g key={`s${k}`} opacity={dim(`s:${k}`)} style={{ cursor: "pointer" }}
               onPointerEnter={() => setHover(`s:${k}`)} onPointerLeave={() => setHover(null)}>
              <rect x={p.x - w / 2} y={p.y - 9} width={w} height={18} rx={9} className="fill-sky-500" />
              <text x={p.x} y={p.y + 3} textAnchor="middle" className="fill-white text-[10px] font-semibold font-mono">{k}</text>
            </g>
          );
        })}
        {/* holder nodes */}
        {layout.holderPos.map((hp, i) => {
          const lab = hp.h.name.length > 22 ? hp.h.name.slice(0, 21) + "…" : hp.h.name;
          const r = 7 + Math.min(9, hp.h.pct / 4);
          return (
            <g key={`h${i}`} opacity={dim(`h:${hp.h.name}`)} style={{ cursor: "pointer" }}
               onPointerEnter={() => setHover(`h:${hp.h.name}`)} onPointerLeave={() => setHover(null)}>
              <circle cx={hp.x} cy={hp.y} r={r} fill={holderColor(hp.h)} />
              <text x={hp.x + r + 3} y={hp.y + 3} className="fill-current text-[9px]">{lab}</text>
            </g>
          );
        })}
        {/* center */}
        <g onPointerEnter={() => setHover(`c:${center}`)} onPointerLeave={() => setHover(null)} style={{ cursor: "pointer" }}>
          <circle cx={cx} cy={cy} r={24} className="fill-primary" />
          <text x={cx} y={cy + 4} textAnchor="middle" className="fill-primary-foreground text-[11px] font-bold font-mono">{center}</text>
        </g>
      </g>
      {/* tooltip overlay (constant size) */}
      {tip && (() => {
        const px = tr.x + tip.x * scale, py = tr.y + tip.y * scale;
        const w = Math.max(120, ...tip.lines.map((l) => l.length * 5.6)) + 16;
        const h = 14 + tip.lines.length * 13;
        const ox = Math.min(VB_W - w - 4, Math.max(4, px + 12));
        const oy = Math.min(VB_H - h - 4, Math.max(4, py - h / 2));
        return (
          <g pointerEvents="none">
            <rect x={ox} y={oy} width={w} height={h} rx={6} className="fill-popover stroke-border" strokeWidth={1} fillOpacity={0.97} />
            {tip.lines.map((l, i) => (
              <text key={i} x={ox + 8} y={oy + 15 + i * 13} className={i === 0 ? "fill-foreground text-[10px] font-bold" : "fill-muted-foreground text-[9.5px]"}>{l}</text>
            ))}
          </g>
        );
      })()}
    </svg>
  );

  const controls = (
    <div className="absolute right-2 top-2 flex flex-col gap-1">
      {[
        { k: "+", fn: () => setScale((s) => Math.min(3, s * 1.2)), t: "Perbesar" },
        { k: "−", fn: () => setScale((s) => Math.max(0.4, s / 1.2)), t: "Perkecil" },
        { k: "⟳", fn: reset, t: "Reset" },
        { k: full ? "✕" : "⛶", fn: () => setFull((f) => !f), t: full ? "Tutup" : "Layar penuh" },
      ].map((b) => (
        <button key={b.t} title={b.t} onClick={b.fn}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card text-sm text-muted-foreground shadow-sm hover:bg-accent hover:text-foreground">
          {b.k}
        </button>
      ))}
    </div>
  );

  if (full) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-background/95 p-4 backdrop-blur">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-semibold">Peta Jaringan · {center}</div>
          <Legend />
        </div>
        <div className="relative flex-1 overflow-hidden rounded-lg border border-border text-muted-foreground">
          {graph}
          {controls}
        </div>
      </div>
    );
  }
  return (
    <div className="relative h-full min-h-[280px] overflow-hidden rounded-md border border-border text-muted-foreground">
      {graph}
      {controls}
    </div>
  );
}

function Legend() {
  const items = [["#10b981", "Korporasi"], ["#f97316", "Individu"], ["#eab308", "Asing"], ["#ef4444", "BUMN"], ["#0ea5e9", "Saham lain"]];
  return (
    <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
      {items.map(([c, l]) => (
        <span key={l} className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />{l}</span>
      ))}
    </div>
  );
}

/* ---------- Ringkasan Saham ---------- */
function ffBadge(ff: number) {
  const c = ff < 10 ? "bg-bear/15 text-bear" : ff < 25 ? "bg-amber-500/15 text-amber-600" : "bg-bull/15 text-bull";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${c}`}>Float {ff.toFixed(2)}%</span>;
}

function RingkasanTab({ data }: { data: DashData }) {
  const [q, setQ] = React.useState("");
  const [sort, setSort] = React.useState<"ticker" | "ff" | "ccs">("ticker");
  const [sector, setSector] = React.useState("");
  const [ffMax, setFfMax] = React.useState(100);
  const [open, setOpen] = React.useState<Set<string>>(new Set());
  const [page, setPage] = React.useState(1);

  // Index lintas-kepemilikan: nama investor → daftar saham yang dipegang.
  const investorIndex = React.useMemo<CrossIndex>(() => {
    const m: CrossIndex = new Map();
    for (const e of data.emiten) for (const h of e.holders) {
      const arr = m.get(h.name) ?? [];
      arr.push({ kode: e.kode, pct: h.pct });
      m.set(h.name, arr);
    }
    return m;
  }, [data.emiten]);

  const filtered = React.useMemo(() => {
    const s = q.trim().toUpperCase();
    let rows = data.emiten.filter((e) =>
      (!s || e.kode.includes(s) || e.name.toUpperCase().includes(s)) &&
      (!sector || e.sector === sector) &&
      e.freeFloat <= ffMax,
    );
    rows = [...rows].sort((a, b) =>
      sort === "ff" ? a.freeFloat - b.freeFloat : sort === "ccs" ? b.ccs - a.ccs : a.kode.localeCompare(b.kode),
    );
    return rows;
  }, [data.emiten, q, sort, sector, ffMax]);

  const totalP = Math.max(1, Math.ceil(filtered.length / LIST_PAGE));
  const p = Math.min(page, totalP);
  const shown = filtered.slice((p - 1) * LIST_PAGE, p * LIST_PAGE);
  const toggle = (k: string) => setOpen((o) => { const n = new Set(o); n.has(k) ? n.delete(k) : n.add(k); return n; });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-2 text-sm">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari kode saham, emiten…" className="h-9 min-w-[180px] flex-1 rounded-md border border-input bg-background px-3 text-sm" />
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">FREE FLOAT ≤</span>
          <input type="number" min={0} max={100} value={ffMax} onChange={(e) => setFfMax(Number(e.target.value) || 100)} className="h-9 w-16 rounded-md border border-input bg-background px-2 text-sm" />%
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">URUTKAN</span>
          {([["ticker", "Ticker"], ["ff", "Free Float"], ["ccs", "CCS"]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setSort(k)} className={`h-8 rounded-md px-2.5 text-xs font-medium ${sort === k ? "bg-primary text-primary-foreground" : "border border-border hover:bg-accent"}`}>{l}</button>
          ))}
        </div>
        <select value={sector} onChange={(e) => setSector(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
          <option value="">Semua Sektor</option>
          {data.sectors.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="text-xs text-muted-foreground">{filtered.length} saham</span>
        <button onClick={() => setOpen(new Set(shown.map((e) => e.kode)))} className="h-8 rounded-md border border-border px-2.5 text-xs hover:bg-accent">Buka Semua</button>
        <button onClick={() => setOpen(new Set())} className="h-8 rounded-md border border-border px-2.5 text-xs hover:bg-accent">Tutup Semua</button>
      </div>

      {shown.map((e) => <EmitenCard key={e.kode} e={e} index={investorIndex} open={open.has(e.kode)} onToggle={() => toggle(e.kode)} />)}
      <Pager page={p} total={filtered.length} onPage={setPage} />
    </div>
  );
}

function EmitenCard({ e, index, open, onToggle }: { e: DashEmiten; index: CrossIndex; open: boolean; onToggle: () => void }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <button onClick={onToggle} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-accent/40">
        <span className="text-muted-foreground">{open ? "▼" : "▶"}</span>
        <span className="rounded-md bg-bull px-2 py-1 font-mono text-sm font-bold text-white">{e.kode}</span>
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{e.name}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="rounded bg-bear/10 px-1.5 py-0.5 text-bear">Harga: Rp {nf.format(e.price)}</span>
            {e.marketCap > 0 && <span className="rounded bg-bear/10 px-1.5 py-0.5 text-bear">Market Cap: {fmtRp(e.marketCap)}</span>}
            {e.sector && <span className="rounded bg-secondary px-1.5 py-0.5 text-muted-foreground">{e.sector}</span>}
            <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-amber-600">CCS {e.ccs}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-muted-foreground">{e.holderCount} pemegang saham</div>
          <div className="text-lg font-bold">{(100 - e.freeFloat).toFixed(2)}%</div>
        </div>
        <div>{ffBadge(e.freeFloat)}</div>
      </button>
      {open && (
        <div className="grid gap-3 border-t border-border p-3 lg:grid-cols-[1.4fr_1fr]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead className="border-b border-border text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr><th className="px-2 py-1.5">#</th><th className="px-2 py-1.5">Pemegang Saham</th><th className="px-2 py-1.5">Tipe</th><th className="px-2 py-1.5">Status</th><th className="px-2 py-1.5 text-right">Saham</th><th className="px-2 py-1.5 text-right">Nilai (Rp)</th><th className="px-2 py-1.5 text-right">%</th></tr>
              </thead>
              <tbody>
                {e.holders.map((h, i) => (
                  <tr key={i} className="border-b border-border/60 last:border-0">
                    <td className="px-2 py-1.5 text-muted-foreground">{i + 1}</td>
                    <td className="px-2 py-1.5 font-medium">{h.name}</td>
                    <td className="px-2 py-1.5 text-xs text-muted-foreground">{typeLabel(h.type)}</td>
                    <td className="px-2 py-1.5"><StatusBadge lf={h.lf} type={h.type} domicile={h.domicile} /></td>
                    <td className="px-2 py-1.5 whitespace-nowrap text-right font-mono">{fmtShares(h.shares)}</td>
                    <td className="px-2 py-1.5 whitespace-nowrap text-right font-mono">{h.value > 0 ? fmtRp(h.value) : "—"}</td>
                    <td className="px-2 py-1.5 whitespace-nowrap text-right font-mono font-semibold">{pct(h.pct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col gap-2">
            <NetworkGraph center={e.kode} holders={e.holders} index={index} />
            <Legend />
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Per Investor ---------- */
interface InvAgg {
  name: string; type: string; lf: string; domicile: string;
  stockCount: number; totalShares: number; totalValue: number;
  holdings: { kode: string; emiten: string; shares: number; value: number; pct: number }[];
}

function PerInvestorTab({ data }: { data: DashData }) {
  const [q, setQ] = React.useState("");
  const [sort, setSort] = React.useState<"name" | "shares">("shares");
  const [open, setOpen] = React.useState<Set<string>>(new Set());
  const [page, setPage] = React.useState(1);

  const investors = React.useMemo(() => {
    const map = new Map<string, InvAgg>();
    for (const e of data.emiten) {
      for (const h of e.holders) {
        const key = h.name;
        const agg = map.get(key) ?? { name: h.name, type: h.type, lf: h.lf, domicile: h.domicile, stockCount: 0, totalShares: 0, totalValue: 0, holdings: [] };
        agg.stockCount += 1;
        agg.totalShares += h.shares;
        agg.totalValue += h.value;
        agg.holdings.push({ kode: e.kode, emiten: e.name, shares: h.shares, value: h.value, pct: h.pct });
        map.set(key, agg);
      }
    }
    return [...map.values()];
  }, [data.emiten]);

  const filtered = React.useMemo(() => {
    const s = q.trim().toUpperCase();
    let rows = investors.filter((iv) => !s || iv.name.toUpperCase().includes(s) || iv.holdings.some((h) => h.kode.includes(s)));
    rows = [...rows].sort((a, b) => (sort === "name" ? a.name.localeCompare(b.name) : b.totalShares - a.totalShares));
    return rows;
  }, [investors, q, sort]);

  const totalP = Math.max(1, Math.ceil(filtered.length / LIST_PAGE));
  const p = Math.min(page, totalP);
  const shown = filtered.slice((p - 1) * LIST_PAGE, p * LIST_PAGE);
  const toggle = (k: string) => setOpen((o) => { const n = new Set(o); n.has(k) ? n.delete(k) : n.add(k); return n; });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-2 text-sm">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama investor, kode saham, atau emiten…" className="h-9 min-w-[220px] flex-1 rounded-md border border-input bg-background px-3 text-sm" />
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">URUTKAN</span>
          <button onClick={() => setSort("name")} className={`h-8 rounded-md px-2.5 text-xs ${sort === "name" ? "bg-primary text-primary-foreground" : "border border-border hover:bg-accent"}`}>Nama</button>
          <button onClick={() => setSort("shares")} className={`h-8 rounded-md px-2.5 text-xs ${sort === "shares" ? "bg-primary text-primary-foreground" : "border border-border hover:bg-accent"}`}>Total Saham</button>
        </div>
        <span className="text-xs text-muted-foreground">{filtered.length} investor</span>
      </div>

      {shown.map((iv) => (
        <div key={iv.name} className="overflow-hidden rounded-lg border border-border bg-card">
          <button onClick={() => toggle(iv.name)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-accent/40">
            <span className="text-muted-foreground">{open.has(iv.name) ? "▼" : "▶"}</span>
            <span className="min-w-0 flex-1 truncate font-semibold">{iv.name}</span>
            <span className="rounded-full bg-bull/10 px-2 py-0.5 text-xs text-bull">{iv.stockCount} saham</span>
            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">{fmtRp(iv.totalValue)}</span>
            <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px]">{typeLabel(iv.type)}</span>
            <StatusBadge lf={iv.lf} type={iv.type} domicile={iv.domicile} />
          </button>
          {open.has(iv.name) && (
            <div className="grid gap-3 border-t border-border p-3 lg:grid-cols-[1.4fr_1fr]">
              <div>
                <div className="mb-2 text-sm">Total AUM <span className="text-lg font-bold text-bull">{fmtRp(iv.totalValue)}</span> <span className="text-xs text-muted-foreground">({nf.format(iv.totalValue)})</span></div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[440px] text-sm">
                    <thead className="border-b border-border text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                      <tr><th className="px-2 py-1.5">#</th><th className="px-2 py-1.5">Kode</th><th className="px-2 py-1.5">Emiten</th><th className="px-2 py-1.5 text-right">Saham</th><th className="px-2 py-1.5 text-right">Nilai</th><th className="px-2 py-1.5 text-right">%</th></tr>
                    </thead>
                    <tbody>
                      {[...iv.holdings].sort((a, b) => b.pct - a.pct).map((h, i) => (
                        <tr key={i} className="border-b border-border/60 last:border-0">
                          <td className="px-2 py-1.5 text-muted-foreground">{i + 1}</td>
                          <td className="px-2 py-1.5"><span className="rounded bg-bull px-1.5 py-0.5 font-mono text-xs font-bold text-white">{h.kode}</span></td>
                          <td className="px-2 py-1.5 max-w-[14rem] truncate">{h.emiten}</td>
                          <td className="px-2 py-1.5 whitespace-nowrap text-right font-mono">{fmtShares(h.shares)}</td>
                          <td className="px-2 py-1.5 whitespace-nowrap text-right font-mono">{h.value > 0 ? fmtRp(h.value) : "—"}</td>
                          <td className="px-2 py-1.5 whitespace-nowrap text-right font-mono font-semibold">{pct(h.pct)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="min-h-[280px] rounded-md border border-border text-muted-foreground">
                <MiniGraph center={iv.name.split(" ")[0] ?? "INV"} nodes={iv.holdings.map((h) => ({ label: h.kode }))} />
              </div>
            </div>
          )}
        </div>
      ))}
      <Pager page={p} total={filtered.length} onPage={setPage} />
    </div>
  );
}

/* ---------- Metrik ---------- */
function titleCase(s: string) {
  return s ? s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : "Unknown";
}

function MetrikTab({ data }: { data: DashData }) {
  const m = React.useMemo(() => {
    let holders = 0, foreign = 0, local = 0;
    const byType = new Map<string, number>();
    const inv = new Map<string, { shares: number; value: number; type: string; lf: string; stocks: number }>();
    for (const e of data.emiten) {
      for (const h of e.holders) {
        holders++;
        if (h.lf === "F") foreign++; else local++;
        const t = titleCase(h.type);
        byType.set(t, (byType.get(t) ?? 0) + h.shares);
        const cur = inv.get(h.name) ?? { shares: 0, value: 0, type: h.type, lf: h.lf, stocks: 0 };
        cur.shares += h.shares; cur.value += h.value; cur.stocks += 1;
        inv.set(h.name, cur);
      }
    }
    const types = [...byType.entries()].sort((a, b) => b[1] - a[1]);
    const totalShares = types.reduce((s, [, v]) => s + v, 0);
    const topInv = [...inv.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.shares - a.shares).slice(0, 20);
    return { holders, foreign, local, unique: inv.size, types, totalShares, topInv };
  }, [data.emiten]);

  const kpi = [
    { l: "Total Emiten", v: nf.format(data.emiten.length) },
    { l: "Record ≥1%", v: nf.format(m.holders) },
    { l: "Investor Unik", v: nf.format(m.unique) },
    { l: "Lokal / Asing", v: `${nf.format(m.local)} / ${nf.format(m.foreign)}` },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        {kpi.map((k) => (
          <div key={k.l} className="rounded-lg border border-border bg-card p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k.l}</div>
            <div className="mt-0.5 font-mono text-xl font-bold">{k.v}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="mb-2 text-sm font-semibold">Distribusi per Tipe Investor (saham)</div>
          <div className="space-y-1.5">
            {m.types.slice(0, 14).map(([t, v]) => {
              const p = m.totalShares > 0 ? (v / m.totalShares) * 100 : 0;
              return (
                <div key={t} className="text-xs">
                  <div className="flex justify-between"><span>{t}</span><span className="font-mono text-muted-foreground">{p.toFixed(2)}%</span></div>
                  <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-secondary"><div className="h-full bg-primary" style={{ width: `${Math.min(100, p)}%` }} /></div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-3">
          <div className="mb-2 text-sm font-semibold">Top 20 Investor (total saham)</div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-left text-[10px] uppercase text-muted-foreground"><tr><th className="py-1">#</th><th className="py-1">Investor</th><th className="py-1 text-right">Saham</th><th className="py-1 text-right">Nilai</th></tr></thead>
              <tbody>
                {m.topInv.map((iv, i) => (
                  <tr key={iv.name} className="border-t border-border/60">
                    <td className="py-1 text-muted-foreground">{i + 1}</td>
                    <td className="py-1 max-w-[14rem] truncate">{iv.name}</td>
                    <td className="py-1 whitespace-nowrap text-right font-mono">{fmtShares(iv.shares)}</td>
                    <td className="py-1 whitespace-nowrap text-right font-mono">{iv.value > 0 ? fmtRp(iv.value) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Klasifikasi (komposisi 9-tipe investor KSEI) ---------- */
const KSEI_COLOR: Record<string, string> = {
  ID: "#f97316", CP: "#10b981", MF: "#6366f1", IB: "#0ea5e9", IS: "#ec4899",
  PF: "#14b8a6", SC: "#eab308", FD: "#a855f7", OT: "#94a3b8",
};
const kColor = (k: string) => KSEI_COLOR[k] ?? "#94a3b8";

/** Petakan tipe investor detail (≥1%) → ember 9-tipe KSEI. */
function kseiBucket(type: string): string {
  const t = (type || "").toUpperCase();
  if (/INDIVID/.test(t)) return "ID";
  if (/PENSION|DANA PENSIUN/.test(t)) return "PF";
  if (/INSURAN|ASURANSI/.test(t)) return "IS";
  if (/SECURIT|BROKER|SEKURITAS/.test(t)) return "SC";
  if (/MUTUAL|HEDGE|ASSET MANAG|INVESTMENT MANAG|FUND MANAG|ADVISOR|REKSA/.test(t)) return "MF";
  if (/BANK|FINANCIAL INST/.test(t)) return "IB";
  if (/FOUNDATION|YAYASAN|ENDOWMENT/.test(t)) return "FD";
  if (/CORPORAT|STATE OWNED|BUMN|PRIVATE EQUITY|VENTURE|FIRM|HOLDING|PERSEROAN|LIMITED/.test(t)) return "CP";
  return "OT";
}

function StackedBar({ types }: { types: { key: string; pct: number; label: string }[] }) {
  return (
    <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-secondary">
      {types.map((t) => (
        <div key={t.key} title={`${t.label} ${t.pct.toFixed(2)}%`} style={{ width: `${t.pct}%`, background: kColor(t.key) }} />
      ))}
    </div>
  );
}

function KlasifikasiTab({ data }: { data: DashData }) {
  const [q, setQ] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [open, setOpen] = React.useState<Set<string>>(new Set());

  const withKsei = React.useMemo(() => data.emiten.filter((e) => e.ksei), [data.emiten]);

  // Agregat pasar: gabung saham per tipe lintas semua emiten.
  const agg = React.useMemo(() => {
    const m = new Map<string, { label: string; shares: number }>();
    let grand = 0;
    for (const e of withKsei) for (const t of e.ksei!.types) {
      const cur = m.get(t.key) ?? { label: t.label, shares: 0 };
      cur.shares += t.shares; m.set(t.key, cur); grand += t.shares;
    }
    return [...m.entries()]
      .map(([key, v]) => ({ key, label: v.label, pct: grand ? (v.shares / grand) * 100 : 0, shares: v.shares }))
      .sort((a, b) => b.pct - a.pct);
  }, [withKsei]);

  const filtered = React.useMemo(() => {
    const s = q.trim().toUpperCase();
    return withKsei.filter((e) => !s || e.kode.includes(s) || e.name.toUpperCase().includes(s));
  }, [withKsei, q]);
  const totalP = Math.max(1, Math.ceil(filtered.length / LIST_PAGE));
  const p = Math.min(page, totalP);
  const shown = filtered.slice((p - 1) * LIST_PAGE, p * LIST_PAGE);
  const toggle = (k: string) => setOpen((o) => { const n = new Set(o); n.has(k) ? n.delete(k) : n.add(k); return n; });

  if (withKsei.length === 0) {
    return <p className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">Data komposisi KSEI belum tersedia. Unggah file BalancePos dulu.</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Komposisi <strong>9 tipe investor KSEI</strong> (sumber: BalancePos) — mencakup <strong>100% saham</strong>, beda dengan tab lain yang hanya pemegang ≥1%. % dari total saham tercatat di KSEI.
      </p>

      {/* Agregat pasar */}
      <div className="rounded-lg border border-border bg-card p-3">
        <div className="mb-2 text-sm font-semibold">Komposisi Agregat ({withKsei.length} emiten)</div>
        <StackedBar types={agg} />
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
          {agg.map((t) => (
            <span key={t.key} className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: kColor(t.key) }} />
              {t.label} <strong className="font-mono">{t.pct.toFixed(1)}%</strong>
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-2">
        <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Cari emiten…" className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" />
      </div>

      {shown.map((e) => {
        const k = e.ksei!;
        const top = k.types[0];
        return (
          <div key={e.kode} className="overflow-hidden rounded-lg border border-border bg-card">
            <button onClick={() => toggle(e.kode)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-accent/40">
              <span className="text-muted-foreground">{open.has(e.kode) ? "▼" : "▶"}</span>
              <span className="rounded bg-bull px-1.5 py-0.5 font-mono text-xs font-bold text-white">{e.kode}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm">{e.name}</div>
                <div className="mt-1"><StackedBar types={k.types} /></div>
              </div>
              <div className="hidden text-right text-[11px] sm:block">
                {top && <div>{top.label} <strong className="text-foreground">{top.pct.toFixed(1)}%</strong></div>}
                <div className="text-muted-foreground">Lokal {k.localPct.toFixed(1)}% · Asing {k.foreignPct.toFixed(1)}%</div>
              </div>
            </button>
            {open.has(e.kode) && (() => {
              const byBucket = new Map<string, DashHolder[]>();
              for (const h of e.holders) {
                const b = kseiBucket(h.type);
                const arr = byBucket.get(b) ?? []; arr.push(h); byBucket.set(b, arr);
              }
              return (
                <div className="space-y-2.5 border-t border-border p-3">
                  <p className="text-[10px] text-muted-foreground">Porsi resmi KSEI per tipe (100% saham) + nama pemegang ≥1% yang teridentifikasi di tiap tipe.</p>
                  {k.types.map((t) => {
                    const named = (byBucket.get(t.key) ?? []).slice().sort((a, b) => b.pct - a.pct);
                    const namedSum = named.reduce((s, h) => s + h.pct, 0);
                    const rest = t.pct - namedSum;
                    return (
                      <div key={t.key} className="text-xs">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: kColor(t.key) }} />{t.label}</span>
                          <span className="font-mono">{t.pct.toFixed(2)}% <span className="text-muted-foreground">({fmtShares(t.shares)})</span></span>
                        </div>
                        {named.length > 0 ? (
                          <div className="mt-1 space-y-0.5 border-l-2 pl-2.5" style={{ borderColor: kColor(t.key) }}>
                            {named.map((h, i) => (
                              <div key={i} className="flex items-center justify-between gap-2 text-[11px]">
                                <span className="flex min-w-0 items-center gap-1.5">
                                  <span className="truncate">{h.name}</span>
                                  <StatusBadge lf={h.lf} type={h.type} domicile={h.domicile} />
                                </span>
                                <span className="whitespace-nowrap font-mono text-muted-foreground">{h.pct.toFixed(2)}%</span>
                              </div>
                            ))}
                            {rest > 0.3 && <div className="text-[10px] text-muted-foreground italic">+ pemegang &lt;1% (ritel/lainnya): ~{rest.toFixed(2)}%</div>}
                          </div>
                        ) : (
                          <div className="pl-4 text-[10px] text-muted-foreground italic">semua pemegang &lt;1% · Lokal {fmtShares(t.localShares)} · Asing {fmtShares(t.foreignShares)}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        );
      })}
      <Pager page={p} total={filtered.length} onPage={setPage} />
    </div>
  );
}

/* ---------- Konglo Stocks (pemetaan grup konglomerat — kurasi) ---------- */
interface KongloGroup { id: string; label: string; re: RegExp }
const KONGLO_GROUPS: KongloGroup[] = [
  { id: "adaro-saratoga", label: "Adaro / Saratoga (Thohir – Soeryadjaya)", re: /ADARO|SARATOGA|PERSADA CAPITAL|GARIBALDI THOHIR|EDWIN SOERYADJAYA/ },
  { id: "djarum", label: "Djarum / Hartono", re: /DWIMURIA|DJARUM|GLOBAL DIGITAL NIAGA/ },
  { id: "sinarmas", label: "Sinarmas / Widjaja", re: /SINAR ?MAS|GOLDEN AGRI|PURADELTA|DSSA|EKA TJIPTA/ },
  { id: "salim", label: "Salim", re: /ANTHONI SALIM|FIRST PACIFIC|INDOFOOD|CAB HOLDING|PT SALIM/ },
  { id: "barito-prajogo", label: "Barito / Prajogo Pangestu", re: /PRAJOGO|BARITO PACIFIC|PETRINDO|RIMBA/ },
  { id: "lippo", label: "Lippo / Riady", re: /LIPPO|RIADY/ },
  { id: "bakrie", label: "Bakrie", re: /BAKRIE/ },
  { id: "mnc", label: "MNC / Hary Tanoesoedibjo", re: /BHAKTI INVESTAMA|MEDIA NUSANTARA|HARY TANOE| MNC/ },
  { id: "emtek", label: "Emtek / Sariaatmadja", re: /ELANG MAHKOTA|SARIAATMADJA/ },
  { id: "astra", label: "Astra / Jardine", re: /JARDINE|CYCLE ?& ?CARRIAGE|ASTRA INTERNATIONAL/ },
  { id: "triputra", label: "Triputra / TP Rachmat", re: /TRIPUTRA|PERMADI RACHMAT/ },
  { id: "rajawali", label: "Rajawali / Peter Sondakh", re: /RAJAWALI|PETER SONDAKH/ },
  { id: "mayapada", label: "Mayapada / Dato Tahir", re: /MAYAPADA/ },
  { id: "sungai-budi", label: "Sungai Budi / Widarto", re: /SUNGAI BUDI/ },
  { id: "pakuwon", label: "Pakuwon / Tedja", re: /PAKUWON/ },
  { id: "ctcorp", label: "CT Corp / Chairul Tanjung", re: /CHAIRUL TANJUNG|CT CORP|TRANS RETAIL|MEGA CORPORA/ },
  { id: "sampoerna", label: "Sampoerna", re: /PT SAMPOERNA|PUTERA SAMPOERNA|SAMPOERNA STRATEGIC/ },
];

function KongloTab({ data }: { data: DashData }) {
  const [q, setQ] = React.useState("");
  const [open, setOpen] = React.useState<Set<string>>(new Set());

  const groups = React.useMemo(() => {
    return KONGLO_GROUPS.map((g) => {
      const stocks: { kode: string; name: string; holder: string; pct: number }[] = [];
      for (const e of data.emiten) {
        const match = e.holders.find((h) => g.re.test(h.name.toUpperCase()));
        if (match) stocks.push({ kode: e.kode, name: e.name, holder: match.name, pct: match.pct });
      }
      stocks.sort((a, b) => b.pct - a.pct);
      return { ...g, stocks };
    }).filter((g) => g.stocks.length > 0).sort((a, b) => b.stocks.length - a.stocks.length);
  }, [data.emiten]);

  const s = q.trim().toUpperCase();
  const shown = s
    ? groups.map((g) => ({ ...g, stocks: g.stocks.filter((x) => x.kode.includes(s) || g.label.toUpperCase().includes(s)) })).filter((g) => g.stocks.length > 0)
    : groups;

  const totalMapped = new Set(groups.flatMap((g) => g.stocks.map((x) => x.kode))).size;
  const toggle = (id: string) => setOpen((o) => { const n = new Set(o); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Saham yang terdeteksi dikendalikan/dipegang grup konglomerat besar (dari pemegang ≥1%). <strong>Pemetaan kurasi</strong> berbasis nama entitas/pendiri — bisa ada saham yang belum tercakup atau false positive. {groups.length} grup · {totalMapped} emiten ter-mapping.
      </p>
      <div className="rounded-lg border border-border bg-card p-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari grup atau kode saham…" className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" />
      </div>
      {shown.map((g) => (
        <div key={g.id} className="overflow-hidden rounded-lg border border-border bg-card">
          <button onClick={() => toggle(g.id)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-accent/40">
            <span className="text-muted-foreground">{open.has(g.id) || s ? "▼" : "▶"}</span>
            <span className="flex-1 font-semibold">{g.label}</span>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">{g.stocks.length} saham</span>
          </button>
          {(open.has(g.id) || s) && (
            <div className="flex flex-wrap gap-1.5 border-t border-border p-3">
              {g.stocks.map((x) => (
                <span key={x.kode} title={`${x.name} · via ${x.holder} (${x.pct.toFixed(2)}%)`} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 text-xs">
                  <span className="font-mono font-bold text-primary">{x.kode}</span>
                  <span className="text-muted-foreground">{x.pct.toFixed(1)}%</span>
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ---------- Perubahan Data (changelog antar periode) ---------- */
const fmtSignedShares = (n: number) => `${n > 0 ? "+" : ""}${nf.format(n)}`;
const fmtSignedPct = (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(2)}%`;
const tickerPill = (kode: string) => (
  <span className="rounded bg-bull px-1.5 py-0.5 font-mono text-xs font-bold text-white">{kode}</span>
);

function GainerLoserTable({ rows, kind }: { rows: SummaryGainerLoser[]; kind: "gain" | "loss" }) {
  const color = kind === "gain" ? "text-bull" : "text-bear";
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] text-xs">
        <thead className="border-b border-border text-left text-[10px] uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-2 py-1.5">#</th>
            <th className="px-2 py-1.5">Kode</th>
            <th className="px-2 py-1.5">Investor</th>
            <th className="px-2 py-1.5 text-right">Δ Saham</th>
            <th className="px-2 py-1.5 text-right">Δ %</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.share_code}-${r.investor_name}-${i}`} className="border-b border-border/60 last:border-0">
              <td className="px-2 py-1.5 text-muted-foreground">{i + 1}</td>
              <td className="px-2 py-1.5">{tickerPill(r.share_code)}</td>
              <td className="px-2 py-1.5 max-w-[16rem] truncate" title={`${r.investor_name} · ${r.issuer_name}`}>{r.investor_name}</td>
              <td className={`px-2 py-1.5 whitespace-nowrap text-right font-mono ${color}`}>{fmtSignedShares(r.share_diff)}</td>
              <td className={`px-2 py-1.5 whitespace-nowrap text-right font-mono font-semibold ${color}`}>{fmtSignedPct(r.pct_diff)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StockFlowTable({ rows, kind }: { rows: SummaryStockFlow[]; kind: "buy" | "sell" }) {
  const color = kind === "buy" ? "text-bull" : "text-bear";
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[380px] text-xs">
        <thead className="border-b border-border text-left text-[10px] uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-2 py-1.5">#</th>
            <th className="px-2 py-1.5">Kode</th>
            <th className="px-2 py-1.5">Emiten</th>
            <th className="px-2 py-1.5 text-right">Δ Saham (net)</th>
            <th className="px-2 py-1.5 text-right">Δ % (net)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.share_code}-${i}`} className="border-b border-border/60 last:border-0">
              <td className="px-2 py-1.5 text-muted-foreground">{i + 1}</td>
              <td className="px-2 py-1.5">{tickerPill(r.share_code)}</td>
              <td className="px-2 py-1.5 max-w-[16rem] truncate" title={r.issuer_name}>{r.issuer_name}</td>
              <td className={`px-2 py-1.5 whitespace-nowrap text-right font-mono ${color}`}>{fmtSignedShares(r.net_share_change)}</td>
              <td className={`px-2 py-1.5 whitespace-nowrap text-right font-mono font-semibold ${color}`}>{fmtSignedPct(r.net_pct_change)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HolderTable({ rows }: { rows: SummaryHolder[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[320px] text-xs">
        <thead className="border-b border-border text-left text-[10px] uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-2 py-1.5">#</th>
            <th className="px-2 py-1.5">Investor</th>
            <th className="px-2 py-1.5 text-right">Total Saham</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.investor_name}-${i}`} className="border-b border-border/60 last:border-0">
              <td className="px-2 py-1.5 text-muted-foreground">{i + 1}</td>
              <td className="px-2 py-1.5 max-w-[18rem] truncate" title={r.investor_name}>{r.investor_name}</td>
              <td className="px-2 py-1.5 whitespace-nowrap text-right font-mono font-semibold">{fmtShares(r.total_shares)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const SUMMARY_LIMIT = 25;
function SummaryPanel<T>({
  title,
  subtitle,
  rows,
  render,
}: {
  title: string;
  subtitle?: string;
  rows: T[];
  render: (rows: T[]) => React.ReactNode;
}) {
  const [all, setAll] = React.useState(false);
  if (!rows || rows.length === 0) return null;
  const shown = all ? rows : rows.slice(0, SUMMARY_LIMIT);
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <div className="text-sm font-semibold">{title}</div>
          {subtitle && <div className="text-[11px] text-muted-foreground">{subtitle}</div>}
        </div>
        <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">{rows.length}</span>
      </div>
      {render(shown)}
      {rows.length > SUMMARY_LIMIT && (
        <button
          onClick={() => setAll((a) => !a)}
          className="mt-2 h-7 rounded-md border border-border px-2.5 text-xs hover:bg-accent"
        >
          {all ? "Tampilkan lebih sedikit" : `Selengkapnya (${rows.length - SUMMARY_LIMIT} lagi)`}
        </button>
      )}
    </div>
  );
}

const INVESTOR_CHIP_LIMIT = 60;
function NewInvestors({ names }: { names: string[] }) {
  const [all, setAll] = React.useState(false);
  if (!names || names.length === 0) return null;
  const shown = all ? names : names.slice(0, INVESTOR_CHIP_LIMIT);
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-sm font-semibold">Investor Baru</div>
        <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">{names.length}</span>
      </div>
      <p className="mb-2 text-[11px] text-muted-foreground">Nama pemegang ≥1% yang baru muncul di periode ini.</p>
      <div className="flex flex-wrap gap-1.5">
        {shown.map((n, i) => (
          <span key={`${n}-${i}`} className="rounded-md border border-border bg-background px-2 py-1 text-xs">{n}</span>
        ))}
      </div>
      {names.length > INVESTOR_CHIP_LIMIT && (
        <button
          onClick={() => setAll((a) => !a)}
          className="mt-2 h-7 rounded-md border border-border px-2.5 text-xs hover:bg-accent"
        >
          {all ? "Tampilkan lebih sedikit" : `Selengkapnya (${names.length - INVESTOR_CHIP_LIMIT} lagi)`}
        </button>
      )}
    </div>
  );
}

function StockList({ title, subtitle, rows }: { title: string; subtitle: string; rows: { share_code: string; issuer_name: string }[] }) {
  if (!rows || rows.length === 0) return null;
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <div className="text-sm font-semibold">{title}</div>
          <div className="text-[11px] text-muted-foreground">{subtitle}</div>
        </div>
        <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">{rows.length}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {rows.map((r) => (
          <span key={r.share_code} title={r.issuer_name} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 text-xs">
            <span className="font-mono font-bold text-primary">{r.share_code}</span>
            <span className="max-w-[12rem] truncate text-muted-foreground">{r.issuer_name}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function PerubahanDataTab({ changelogs }: { changelogs: ChangelogResult[] }) {
  const [idx, setIdx] = React.useState(0);

  if (changelogs.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        Belum ada data perubahan. Dibutuhkan minimal 2 snapshot periode. Coba klik &ldquo;Refresh dari sumber&rdquo; lagi nanti.
      </div>
    );
  }

  const changelog = changelogs[Math.min(idx, changelogs.length - 1)]!;
  const { raw } = changelog;
  const summary = raw.summary ?? {};
  const cl = raw.changelog ?? {};
  const newStocks = cl.new_stocks ?? [];
  const removedStocks = cl.removed_stocks ?? [];
  const newInvestorNames = raw.newInvestorNames ?? [];

  const periodLabel = `${fmtDateId(changelog.prevDate) || "—"} → ${fmtDateId(changelog.currentDate) || "—"}`;

  const hasAnything =
    (summary.topGainers?.length ?? 0) > 0 ||
    (summary.topLosers?.length ?? 0) > 0 ||
    (summary.topHolders?.length ?? 0) > 0 ||
    (summary.topBoughtStocks?.length ?? 0) > 0 ||
    (summary.topSoldStocks?.length ?? 0) > 0 ||
    newStocks.length > 0 ||
    removedStocks.length > 0 ||
    newInvestorNames.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card p-3">
        <div>
          <div className="text-sm font-semibold">Perubahan {periodLabel}</div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Perbandingan kepemilikan ≥1% antara dua periode snapshot.
            {changelog.fetchedAt ? ` · diambil ${new Date(changelog.fetchedAt).toLocaleString("id-ID")}` : ""}
          </p>
        </div>
        {changelogs.length > 1 && (
          <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            Periode
            <select
              value={idx}
              onChange={(e) => setIdx(Number(e.target.value))}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground"
            >
              {changelogs.map((c, i) => (
                <option key={c.currentDate} value={i}>
                  {fmtDateId(c.prevDate) || "—"} → {fmtDateId(c.currentDate) || "—"}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {!hasAnything ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Tidak ada perubahan signifikan yang tercatat untuk periode ini.
        </div>
      ) : (
        <>
          {/* Saham baru & keluar */}
          {(newStocks.length > 0 || removedStocks.length > 0) && (
            <div className="grid gap-4 lg:grid-cols-2">
              <StockList title="Saham Baru" subtitle="Emiten yang baru punya pemegang ≥1%." rows={newStocks} />
              <StockList title="Saham Keluar" subtitle="Emiten yang tidak lagi punya pemegang ≥1%." rows={removedStocks} />
            </div>
          )}

          {/* Ringkasan flow per saham */}
          <div className="grid gap-4 lg:grid-cols-2">
            <SummaryPanel
              title="Top Saham Diborong"
              subtitle="Net penambahan saham terbesar (akumulasi)."
              rows={summary.topBoughtStocks ?? []}
              render={(r) => <StockFlowTable rows={r} kind="buy" />}
            />
            <SummaryPanel
              title="Top Saham Dilepas"
              subtitle="Net pengurangan saham terbesar (distribusi)."
              rows={summary.topSoldStocks ?? []}
              render={(r) => <StockFlowTable rows={r} kind="sell" />}
            />
          </div>

          {/* Ringkasan per investor-saham */}
          <div className="grid gap-4 lg:grid-cols-2">
            <SummaryPanel
              title="Top Gainers"
              subtitle="Kenaikan kepemilikan per investor di satu saham."
              rows={summary.topGainers ?? []}
              render={(r) => <GainerLoserTable rows={r} kind="gain" />}
            />
            <SummaryPanel
              title="Top Losers"
              subtitle="Penurunan kepemilikan per investor di satu saham."
              rows={summary.topLosers ?? []}
              render={(r) => <GainerLoserTable rows={r} kind="loss" />}
            />
          </div>

          {/* Top holders & investor baru */}
          <div className="grid gap-4 lg:grid-cols-2">
            <SummaryPanel
              title="Top Holders"
              subtitle="Pemegang dengan total saham terbesar."
              rows={summary.topHolders ?? []}
              render={(r) => <HolderTable rows={r} />}
            />
            <NewInvestors names={newInvestorNames} />
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- Shell ---------- */
const TABS = ["Ringkasan Saham", "Per Investor", "Konglo Stocks", "Metrik", "Perubahan Data", "Klasifikasi"] as const;

export function KlinikDashboard({ data, changelogs }: { data: DashData; changelogs: ChangelogResult[] }) {
  const [tab, setTab] = React.useState<(typeof TABS)[number]>("Ringkasan Saham");
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1 border-b border-border pb-2 text-sm">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-md px-3 py-1.5 font-medium ${tab === t ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent"}`}>{t}</button>
        ))}
      </div>
      {tab === "Ringkasan Saham" && <RingkasanTab data={data} />}
      {tab === "Per Investor" && <PerInvestorTab data={data} />}
      {tab === "Metrik" && <MetrikTab data={data} />}
      {tab === "Klasifikasi" && <KlasifikasiTab data={data} />}
      {tab === "Konglo Stocks" && <KongloTab data={data} />}
      {tab === "Perubahan Data" && <PerubahanDataTab changelogs={changelogs} />}
    </div>
  );
}
