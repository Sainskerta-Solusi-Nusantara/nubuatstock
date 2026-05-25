"use client";

import { FileDown, Loader2 } from "lucide-react";
import { useState } from "react";

export function FeaturePdfButton() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handle() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/pitchdeck/feature-pdf", { method: "GET" });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`HTTP ${res.status}: ${txt.slice(0, 200)}`);
      }
      const missing = Number(res.headers.get("X-Screenshots-Missing") ?? "0");
      const total = Number(res.headers.get("X-Features-Total") ?? "0");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Nubuat-Feature-Guide-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      if (missing > 0) {
        setErr(`PDF berhasil dibuat (${missing}/${total} screenshot belum di-capture — placeholder dipakai). Jalankan: npm exec tsx -- scripts/capture-pitchdeck-screenshots.ts`);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal generate PDF");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1 print:hidden">
      <button
        onClick={handle}
        disabled={loading}
        type="button"
        className="inline-flex h-9 items-center rounded-md border border-primary/30 bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
      >
        {loading ? (
          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
        ) : (
          <FileDown className="mr-2 h-3.5 w-3.5" />
        )}
        Download Feature Guide PDF
      </button>
      {err ? (
        <p className="max-w-xs text-right text-[11px] text-orange-600 dark:text-orange-400">{err}</p>
      ) : null}
    </div>
  );
}
