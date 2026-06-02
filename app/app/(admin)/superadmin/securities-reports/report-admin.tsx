"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ExternalLink, Lock, Plus, Trash2, Loader2 } from "lucide-react";
import type { SecuritiesReport } from "@/db/schema/securities-reports";
import { formatDateTimeId } from "@/lib/utils/datetime";
import { securitiesSiteUrl } from "@/lib/securities/sites";
import { normalizeCategory, REPORT_CATEGORIES, type ReportCategory } from "@/lib/securities-reports/category";

const SECURITIES = [
  "Mirae Asset Sekuritas", "Indo Premier Sekuritas", "BRI Danareksa Sekuritas",
  "Mandiri Sekuritas", "BNI Sekuritas", "Phintraco Sekuritas", "MNC Sekuritas",
  "Samuel Sekuritas", "Sucor Sekuritas", "KB Valbury Sekuritas", "RHB Sekuritas",
  "Ciptadana Sekuritas", "Kiwoom Sekuritas", "Henan Putihrai Sekuritas",
];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

/** Warna badge per kategori ternormalisasi (Tailwind, tema-aware). */
const CATEGORY_BADGE: Record<ReportCategory, string> = {
  Daily: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  Weekly: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400",
  Monthly: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  "Company Update": "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  "Economic/Strategy": "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  Technical: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  Telegram: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  Lainnya: "bg-muted text-muted-foreground",
};

function CategoryBadge({ cat }: { cat: ReportCategory }) {
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${CATEGORY_BADGE[cat]}`}>
      {cat}
    </span>
  );
}

export function ReportAdmin({ rows }: { rows: SecuritiesReport[] }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [f, setF] = React.useState({ securities: SECURITIES[0]!, title: "", category: "", publishedAt: todayStr(), sourceUrl: "", pdfUrl: "" });
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));
  const inp = "h-9 rounded-md border border-input bg-background px-2 text-sm";

  const [catFilter, setCatFilter] = React.useState<ReportCategory | "Semua">("Semua");

  // Kategori ternormalisasi per baris + hitung jumlah per kategori untuk filter.
  const withCat = React.useMemo(
    () => rows.map((r) => ({ r, cat: normalizeCategory(r.category, r.title, r.categoryType) })),
    [rows],
  );
  const counts = React.useMemo(() => {
    const m = new Map<ReportCategory, number>();
    for (const { cat } of withCat) m.set(cat, (m.get(cat) ?? 0) + 1);
    return m;
  }, [withCat]);
  const visible = React.useMemo(
    () => (catFilter === "Semua" ? withCat : withCat.filter((x) => x.cat === catFilter)),
    [withCat, catFilter],
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.title.trim()) { toast.error("Judul wajib."); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/superadmin/securities-reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) { toast.error(j?.error?.message ?? "Gagal simpan."); return; }
      toast.success(`Tersimpan: ${f.title.slice(0, 40)}.`);
      setF((p) => ({ ...p, title: "", sourceUrl: "", pdfUrl: "" }));
      router.refresh();
    } catch { toast.error("Terjadi kesalahan."); } finally { setBusy(false); }
  }

  async function remove(id: string) {
    if (!confirm("Hapus riset ini?")) return;
    const res = await fetch(`/api/superadmin/securities-reports?id=${id}`, { method: "DELETE" });
    const j = await res.json().catch(() => null);
    if (!res.ok || !j?.ok) { toast.error("Gagal hapus."); return; }
    toast.success("Dihapus."); router.refresh();
  }

  return (
    <div className="space-y-4">
      <details className="rounded-lg border border-border bg-card p-3">
        <summary className="cursor-pointer text-sm font-semibold">+ Tambah riset manual (sumber tanpa fetcher otomatis)</summary>
        <form onSubmit={submit} className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">Sekuritas
            <input list="rep-sec" value={f.securities} onChange={(e) => set("securities", e.target.value)} className={inp} />
            <datalist id="rep-sec">{SECURITIES.map((x) => <option key={x} value={x} />)}</datalist>
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">Tanggal
            <input type="date" value={f.publishedAt} onChange={(e) => set("publishedAt", e.target.value)} className={inp} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">Kategori
            <input value={f.category} onChange={(e) => set("category", e.target.value)} className={inp} placeholder="mis. Daily, Company Update" />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground sm:col-span-2 lg:col-span-3">Judul
            <input value={f.title} onChange={(e) => set("title", e.target.value)} className={inp} placeholder="Judul riset" />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground sm:col-span-1 lg:col-span-2">URL sumber / artikel
            <input value={f.sourceUrl} onChange={(e) => set("sourceUrl", e.target.value)} className={inp} placeholder="https://…" />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">URL PDF (opsional)
            <input value={f.pdfUrl} onChange={(e) => set("pdfUrl", e.target.value)} className={inp} placeholder="https://…pdf" />
          </label>
          <div className="sm:col-span-2 lg:col-span-3">
            <button disabled={busy} className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Simpan riset
            </button>
          </div>
        </form>
      </details>

      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setCatFilter("Semua")}
          className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${catFilter === "Semua" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-accent"}`}
        >
          Semua <span className="opacity-70">({withCat.length})</span>
        </button>
        {REPORT_CATEGORIES.filter((c) => (counts.get(c) ?? 0) > 0).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCatFilter(c)}
            className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${catFilter === c ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-accent"}`}
          >
            {c} <span className="opacity-70">({counts.get(c)})</span>
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full min-w-[800px] text-sm">
          <thead className="border-b border-border bg-secondary/50 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
            <tr><th className="px-3 py-2">Terbit</th><th className="px-3 py-2">Sumber</th><th className="px-3 py-2">Judul</th><th className="px-3 py-2">Kategori</th><th className="px-3 py-2 text-right">Buka</th><th className="px-3 py-2" /></tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">{rows.length === 0 ? "Belum ada riset. Klik “Refresh dari sumber” atau tambah manual." : "Tidak ada riset di kategori ini."}</td></tr>
            ) : visible.map(({ r, cat }) => (
              <tr key={r.id} className="border-b border-border/60 last:border-0 hover:bg-accent/40">
                <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">{r.publishedAt ? formatDateTimeId(r.publishedAt) : "—"}</td>
                <td className="px-3 py-2 whitespace-nowrap text-xs font-medium">
                  {securitiesSiteUrl(r.securities) ? (
                    <a href={securitiesSiteUrl(r.securities)!} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 hover:text-primary hover:underline">
                      {r.securities} <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  ) : r.securities}
                </td>
                <td className="px-3 py-2"><span className="flex items-center gap-1.5">{r.isMemberOnly ? <Lock className="h-3 w-3 shrink-0 text-amber-600" /> : null}<span className="max-w-[380px] truncate" title={r.title}>{r.title}</span></span></td>
                <td className="px-3 py-2 text-xs">
                  <span className="flex flex-col items-start gap-0.5">
                    <CategoryBadge cat={cat} />
                    {r.category && r.category.toLowerCase() !== cat.toLowerCase() ? (
                      <span className="text-[10px] text-muted-foreground" title="Kategori asli dari sumber">{r.category}</span>
                    ) : null}
                  </span>
                </td>
                <td className="px-3 py-2 text-right">
                  {(r.pdfUrl || r.sourceUrl) ? <a href={(r.isMemberOnly ? r.sourceUrl : r.pdfUrl) ?? r.sourceUrl ?? "#"} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">{r.isMemberOnly ? "Sumber" : "Buka"} <ExternalLink className="h-3 w-3" /></a> : "—"}
                </td>
                <td className="px-3 py-2 text-right"><button onClick={() => remove(r.id)} className="inline-flex text-muted-foreground hover:text-bear"><Trash2 className="h-4 w-4" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
