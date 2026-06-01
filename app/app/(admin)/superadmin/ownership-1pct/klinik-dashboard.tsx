"use client";

import * as React from "react";
import type { DashData, DashEmiten, DashHolder } from "@/lib/ownership1pct/service";

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

  const shown = filtered.slice(0, 150);
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

      {shown.map((e) => <EmitenCard key={e.kode} e={e} open={open.has(e.kode)} onToggle={() => toggle(e.kode)} />)}
      {filtered.length > shown.length && <p className="py-2 text-center text-xs text-muted-foreground">Menampilkan 150 dari {filtered.length}. Persempit pencarian untuk lihat lainnya.</p>}
    </div>
  );
}

function EmitenCard({ e, open, onToggle }: { e: DashEmiten; open: boolean; onToggle: () => void }) {
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
          <div className="min-h-[280px] rounded-md border border-border text-muted-foreground">
            <MiniGraph center={e.kode} nodes={e.holders.map((h) => ({ label: h.name }))} />
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

  const shown = filtered.slice(0, 150);
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
      {filtered.length > shown.length && <p className="py-2 text-center text-xs text-muted-foreground">Menampilkan 150 dari {filtered.length}. Persempit pencarian.</p>}
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

/* ---------- Klasifikasi (per emiten, % per kategori) ---------- */
function KlasifikasiTab({ data }: { data: DashData }) {
  const [q, setQ] = React.useState("");
  const [open, setOpen] = React.useState<Set<string>>(new Set());

  const rows = React.useMemo(() => {
    const s = q.trim().toUpperCase();
    return data.emiten.filter((e) => !s || e.kode.includes(s) || e.name.toUpperCase().includes(s)).slice(0, 150);
  }, [data.emiten, q]);

  const catOf = (e: DashEmiten) => {
    const map = new Map<string, number>();
    for (const h of e.holders) map.set(titleCase(h.type), (map.get(titleCase(h.type)) ?? 0) + h.pct);
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  };
  const toggle = (k: string) => setOpen((o) => { const n = new Set(o); n.has(k) ? n.delete(k) : n.add(k); return n; });

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border bg-card p-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari emiten…" className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" />
      </div>
      <p className="text-xs text-muted-foreground">% kepemilikan per kategori investor (posisi sekarang). Kolom &ldquo;Sebelumnya/Δ%&rdquo; tersedia setelah ada 2 snapshot.</p>
      {rows.map((e) => {
        const cats = catOf(e);
        const top = cats[0];
        return (
          <div key={e.kode} className="overflow-hidden rounded-lg border border-border bg-card">
            <button onClick={() => toggle(e.kode)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-accent/40">
              <span className="text-muted-foreground">{open.has(e.kode) ? "▼" : "▶"}</span>
              <span className="rounded bg-bull px-1.5 py-0.5 font-mono text-xs font-bold text-white">{e.kode}</span>
              <span className="min-w-0 flex-1 truncate text-sm">{e.name}</span>
              {top && <span className="text-xs text-muted-foreground">{top[0]} <strong className="text-foreground">{top[1].toFixed(2)}%</strong></span>}
            </button>
            {open.has(e.kode) && (
              <div className="space-y-1.5 border-t border-border p-3">
                {cats.map(([c, p]) => (
                  <div key={c} className="text-xs">
                    <div className="flex justify-between"><span>{c}</span><span className="font-mono text-muted-foreground">{p.toFixed(2)}%</span></div>
                    <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-secondary"><div className="h-full bg-bull" style={{ width: `${Math.min(100, p)}%` }} /></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Shell ---------- */
const TABS = ["Ringkasan Saham", "Per Investor", "Konglo Stocks", "Metrik", "Perubahan Data", "Klasifikasi"] as const;

export function KlinikDashboard({ data }: { data: DashData }) {
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
      {(tab === "Konglo Stocks" || tab === "Perubahan Data") && (
        <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Tab <strong>{tab}</strong> segera:{" "}
          {tab === "Konglo Stocks"
            ? "butuh data mapping grup konglomerat (akan diekstrak dari sumber)."
            : "butuh minimal 2 snapshot periode KSEI (saat ini baru 1; akan aktif setelah refresh periode berikutnya)."}
        </div>
      )}
    </div>
  );
}
