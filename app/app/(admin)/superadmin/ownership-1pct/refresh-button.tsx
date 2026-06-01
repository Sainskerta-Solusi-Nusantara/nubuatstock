"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RefreshCw, Loader2 } from "lucide-react";

export function RefreshButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function run() {
    setBusy(true);
    try {
      const res = await fetch("/api/superadmin/ownership-1pct/refresh", { method: "POST" });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        toast.error(json?.error?.message ?? "Gagal refresh.");
        return;
      }
      toast.success(`Berhasil: ${json.data.emitenCount} emiten, ${json.data.holderCount} pemegang saham.`);
      router.refresh();
    } catch {
      toast.error("Terjadi kesalahan saat refresh.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <button
      type="button"
      onClick={run}
      disabled={busy}
      className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
      {busy ? "Mengambil…" : "Refresh dari sumber"}
    </button>
  );
}
