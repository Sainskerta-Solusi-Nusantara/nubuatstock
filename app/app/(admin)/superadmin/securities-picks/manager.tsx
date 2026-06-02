"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import type { SecuritiesPick } from "@/db/schema/securities-picks";

const ACTIONS = ["Buy", "Trading Buy", "Spec Buy", "Buy on Weakness", "Hold", "Sell"];

function todayWIB(): string {
  // Approx WIB date for default input value.
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export function SecuritiesPicksManager({
  rows,
  securitiesOptions,
}: {
  rows: SecuritiesPick[];
  securitiesOptions: string[];
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [form, setForm] = React.useState({
    pickDate: todayWIB(),
    securities: securitiesOptions[0] ?? "",
    kode: "",
    action: "Buy",
    entryLow: "", entryHigh: "", support: "", resistance: "", target: "", stopLoss: "",
    rationale: "", sourceUrl: "",
  });
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.kode.trim() || !form.securities.trim()) { toast.error("Sekuritas & kode wajib."); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/superadmin/securities-picks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) { toast.error(j?.error?.message ?? "Gagal simpan."); return; }
      toast.success(`Tersimpan: ${form.kode.toUpperCase()} (${form.securities}).`);
      setForm((f) => ({ ...f, kode: "", entryLow: "", entryHigh: "", support: "", resistance: "", target: "", stopLoss: "", rationale: "", sourceUrl: "" }));
      router.refresh();
    } catch {
      toast.error("Terjadi kesalahan.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Hapus pick ini?")) return;
    const res = await fetch(`/api/superadmin/securities-picks?id=${id}`, { method: "DELETE" });
    const j = await res.json().catch(() => null);
    if (!res.ok || !j?.ok) { toast.error("Gagal hapus."); return; }
    toast.success("Dihapus.");
    router.refresh();
  }

  const inp = "h-9 rounded-md border border-input bg-background px-2 text-sm";

  return (
    <div className="space-y-5">
      <form onSubmit={submit} className="rounded-lg border border-border bg-card p-4">
        <div className="mb-3 text-sm font-semibold">Tambah rekomendasi sekuritas</div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">Tanggal
            <input type="date" value={form.pickDate} onChange={(e) => set("pickDate", e.target.value)} className={inp} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">Sekuritas (sumber)
            <input list="sec-list" value={form.securities} onChange={(e) => set("securities", e.target.value)} className={inp} placeholder="mis. Mirae Asset Sekuritas" />
            <datalist id="sec-list">{securitiesOptions.map((s) => <option key={s} value={s} />)}</datalist>
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">Kode saham
            <input value={form.kode} onChange={(e) => set("kode", e.target.value.toUpperCase())} className={`${inp} font-mono`} placeholder="BBRI" maxLength={10} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">Aksi
            <select value={form.action} onChange={(e) => set("action", e.target.value)} className={inp}>
              {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </label>
          {([["entryLow", "Entry bawah"], ["entryHigh", "Entry atas"], ["support", "Support"], ["resistance", "Resistance"], ["target", "Target"], ["stopLoss", "Stop loss"]] as const).map(([k, l]) => (
            <label key={k} className="flex flex-col gap-1 text-xs text-muted-foreground">{l}
              <input inputMode="numeric" value={form[k]} onChange={(e) => set(k, e.target.value)} className={`${inp} font-mono`} placeholder="—" />
            </label>
          ))}
          <label className="flex flex-col gap-1 text-xs text-muted-foreground sm:col-span-2">Catatan / rasional
            <input value={form.rationale} onChange={(e) => set("rationale", e.target.value)} className={inp} placeholder="opsional" />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground sm:col-span-2">URL sumber
            <input value={form.sourceUrl} onChange={(e) => set("sourceUrl", e.target.value)} className={inp} placeholder="https://… (opsional)" />
          </label>
        </div>
        <button disabled={busy} className="mt-3 inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Simpan
        </button>
      </form>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="border-b border-border bg-secondary/50 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Tanggal</th><th className="px-3 py-2">Sekuritas</th><th className="px-3 py-2">Kode</th>
              <th className="px-3 py-2">Aksi</th><th className="px-3 py-2 text-right">Entry</th><th className="px-3 py-2 text-right">Target</th>
              <th className="px-3 py-2 text-right">SL</th><th className="px-3 py-2">Catatan</th><th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">Belum ada rekomendasi. Tambah di atas.</td></tr>
            ) : rows.map((r) => (
              <tr key={r.id} className="border-b border-border/60 last:border-0">
                <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{r.pickDate}</td>
                <td className="px-3 py-2">{r.securities}</td>
                <td className="px-3 py-2 font-mono font-bold text-primary">{r.kode}</td>
                <td className="px-3 py-2 text-xs">{r.action ?? "—"}</td>
                <td className="px-3 py-2 whitespace-nowrap text-right font-mono">{r.entryLow ?? "—"}{r.entryHigh ? `–${r.entryHigh}` : ""}</td>
                <td className="px-3 py-2 text-right font-mono">{r.target ?? "—"}</td>
                <td className="px-3 py-2 text-right font-mono">{r.stopLoss ?? "—"}</td>
                <td className="px-3 py-2"><span className="block max-w-[220px] truncate text-xs text-muted-foreground" title={r.rationale ?? ""}>{r.rationale ?? "—"}</span></td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => remove(r.id)} className="inline-flex text-muted-foreground hover:text-bear"><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
