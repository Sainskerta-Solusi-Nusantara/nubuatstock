"use client";

import * as React from "react";
import type { FfDashData } from "@/lib/freefloat/service";
import { fmtDateId } from "@/lib/utils/date-id";

const nf = new Intl.NumberFormat("id-ID");
function fmtRp(n: number): string {
  if (!n) return "—";
  if (n >= 1e12) return `Rp ${(n / 1e12).toFixed(1)} T`;
  if (n >= 1e9) return `Rp ${(n / 1e9).toFixed(1)} M`;
  if (n >= 1e6) return `Rp ${(n / 1e6).toFixed(1)} jt`;
  return `Rp ${nf.format(n)}`;
}

const PAGE = 25;
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

function ffStatusBadge(status: string | null) {
  const s = status || "—";
  if (/Telah Memenuhi/i.test(s)) return <span className="rounded bg-bull/15 px-1.5 py-0.5 text-[10px] font-semibold text-bull">Memenuhi</span>;
  if (/Delisting/i.test(s)) return <span className="rounded bg-bear/15 px-1.5 py-0.5 text-[10px] font-semibold text-bear">{s}</span>;
  if (/Pengecualian/i.test(s)) return <span title={s} className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">Pengecualian</span>;
  if (/\d{4}/.test(s)) return <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600">Tenggat {s}</span>;
  return <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">{s}</span>;
}

export function FreeFloatPanel({ ff }: { ff: FfDashData }) {
  const [q, setQ] = React.useState("");
  const [status, setStatus] = React.useState<"all" | "met" | "pending">("all");
  const [board, setBoard] = React.useState("");
  const [sort, setSort] = React.useState<"kode" | "ff" | "ffdesc" | "mcap">("kode");
  const [page, setPage] = React.useState(1);

  const filtered = React.useMemo(() => {
    const s = q.trim().toUpperCase();
    const met = (st: string | null) => /Telah Memenuhi/i.test(st || "");
    let rows = ff.rows.filter((r) =>
      (!s || r.kode.includes(s) || r.name.toUpperCase().includes(s)) &&
      (!board || r.board === board) &&
      (status === "all" || (status === "met" ? met(r.status) : !met(r.status))),
    );
    rows = [...rows].sort((a, b) =>
      sort === "ff" ? a.freeFloatPct - b.freeFloatPct
        : sort === "ffdesc" ? b.freeFloatPct - a.freeFloatPct
          : sort === "mcap" ? b.marketCap - a.marketCap
            : a.kode.localeCompare(b.kode),
    );
    return rows;
  }, [ff.rows, q, status, board, sort]);

  const totalP = Math.max(1, Math.ceil(filtered.length / PAGE));
  const p = Math.min(page, totalP);
  const shown = filtered.slice((p - 1) * PAGE, p * PAGE);

  if (ff.rows.length === 0) {
    return <p className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">Data Free Float belum tersedia. Klik &ldquo;Refresh dari sumber&rdquo;.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-3">
        {[
          { l: "Total emiten", v: nf.format(ff.summary.total), c: "" },
          { l: "Telah memenuhi", v: nf.format(ff.summary.met), c: "text-bull" },
          { l: "Belum / tenggat / pengecualian", v: nf.format(ff.summary.pending), c: "text-amber-600" },
        ].map((k) => (
          <div key={k.l} className="rounded-lg border border-border bg-card p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k.l}</div>
            <div className={`mt-0.5 font-mono text-xl font-bold ${k.c}`}>{k.v}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-2 text-sm">
        <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Cari kode / emiten…" className="h-9 min-w-[160px] flex-1 rounded-md border border-input bg-background px-3 text-sm" />
        <select value={status} onChange={(e) => { setStatus(e.target.value as typeof status); setPage(1); }} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
          <option value="all">Semua status</option>
          <option value="met">Telah memenuhi</option>
          <option value="pending">Belum memenuhi</option>
        </select>
        <select value={board} onChange={(e) => { setBoard(e.target.value); setPage(1); }} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
          <option value="">Semua papan</option>
          {ff.boards.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">Urut</span>
          {([["kode", "Kode"], ["ff", "FF↑"], ["ffdesc", "FF↓"], ["mcap", "Kap."]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setSort(k)} className={`h-8 rounded-md px-2.5 text-xs font-medium ${sort === k ? "bg-primary text-primary-foreground" : "border border-border hover:bg-accent"}`}>{l}</button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground">{filtered.length} emiten</span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="border-b border-border bg-secondary/50 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2">#</th><th className="px-3 py-2">Kode</th><th className="px-3 py-2">Emiten</th>
              <th className="px-3 py-2">Papan</th><th className="px-3 py-2 text-right">Kapitalisasi</th>
              <th className="px-3 py-2 text-right">Pemegang Saham</th><th className="px-3 py-2 text-right">Free Float</th>
              <th className="px-3 py-2 text-right">Wajib</th><th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => {
              const below = r.freeFloatPct < r.requiredPct;
              return (
                <tr key={r.kode} className="border-b border-border/60 last:border-0 hover:bg-accent/40">
                  <td className="px-3 py-2 text-muted-foreground">{r.rank}</td>
                  <td className="px-3 py-2 font-mono font-bold text-primary">{r.kode}</td>
                  <td className="px-3 py-2"><span className="block max-w-[260px] truncate" title={r.name}>{r.name}</span></td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{r.board || "—"}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-right font-mono">{r.marketCap > 0 ? fmtRp(r.marketCap) : "—"}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-right font-mono text-muted-foreground">{nf.format(r.shareholders)}</td>
                  <td className={`px-3 py-2 whitespace-nowrap text-right font-mono font-semibold ${below ? "text-bear" : "text-bull"}`}>{r.freeFloatPct.toFixed(2)}%</td>
                  <td className="px-3 py-2 whitespace-nowrap text-right font-mono text-muted-foreground">{r.requiredPct.toFixed(2)}%</td>
                  <td className="px-3 py-2">{ffStatusBadge(r.status)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalP > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-1 pt-1">
          <button onClick={() => setPage(Math.max(1, p - 1))} disabled={p <= 1} className="inline-flex h-8 items-center rounded-md border border-input px-2.5 text-sm disabled:opacity-40 hover:bg-accent">‹</button>
          {pageNums(p, totalP).map((n, i) => n === "…" ? (
            <span key={`e${i}`} className="px-1.5 text-muted-foreground">…</span>
          ) : (
            <button key={n} onClick={() => setPage(n)} className={`inline-flex h-8 min-w-[2rem] items-center justify-center rounded-md border px-2 text-sm font-medium ${n === p ? "border-primary bg-primary text-primary-foreground" : "border-input hover:bg-accent"}`}>{n}</button>
          ))}
          <button onClick={() => setPage(Math.min(totalP, p + 1))} disabled={p >= totalP} className="inline-flex h-8 items-center rounded-md border border-input px-2.5 text-sm disabled:opacity-40 hover:bg-accent">›</button>
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">
        Status pemenuhan Free Float sesuai ketentuan BEI · posisi {fmtDateId(ff.snapshotDate) || "—"} · Sumber: BEI. Free float di bawah ambang wajib ditandai merah.
      </p>
    </div>
  );
}
