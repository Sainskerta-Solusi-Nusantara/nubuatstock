"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RefreshCw, Loader2 } from "lucide-react";

export function ReportsRefreshButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function run() {
    setBusy(true);
    try {
      const res = await fetch("/api/superadmin/securities-reports/refresh", { method: "POST" });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) { toast.error(j?.error?.message ?? "Gagal refresh."); return; }
      toast.success(`Berhasil: ${j.data.upserted} riset (fetched ${j.data.fetched}).`);
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
