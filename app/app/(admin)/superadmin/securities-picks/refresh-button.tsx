"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RefreshCw, Loader2 } from "lucide-react";

export function PicksRefreshButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function run() {
    setBusy(true);
    try {
      const res = await fetch("/api/superadmin/securities-picks/refresh", { method: "POST" });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) { toast.error(j?.error?.message ?? "Gagal refresh."); return; }
      const { inserted, candidates, errors } = j.data as { inserted: number; candidates: number; errors: string[] };
      if (inserted > 0) {
        toast.success(`Berhasil: ${inserted} rekomendasi dari ${candidates} pesan kandidat.`);
      } else {
        toast.message(`Tidak ada rekomendasi baru ditemukan (dari ${candidates} pesan kandidat).`);
      }
      if (errors?.length) toast.warning(`${errors.length} sumber/pesan bermasalah — cek log.`);
      router.refresh();
    } catch {
      toast.error("Terjadi kesalahan.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <button onClick={run} disabled={busy} className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
      {busy ? "Mengambil…" : "Refresh dari sumber"}
    </button>
  );
}
