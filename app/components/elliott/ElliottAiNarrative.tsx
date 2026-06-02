"use client";

import * as React from "react";
import { Sparkles, Loader2 } from "lucide-react";

/** Tombol on-demand untuk minta narasi AI Elliott Wave (P2). */
export function ElliottAiNarrative({ kode, timeframe }: { kode: string; timeframe: string }) {
  const [busy, setBusy] = React.useState(false);
  const [text, setText] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  async function run() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/elliott/narrative", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kode, timeframe }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) {
        setErr(j?.error?.message ?? "Gagal membuat narasi.");
        return;
      }
      setText(j.data.narrative as string);
    } catch {
      setErr("Terjadi kesalahan.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Penjelasan AI
          <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold normal-case text-primary">P2</span>
        </div>
        {!text && (
          <button
            onClick={run}
            disabled={busy}
            className="inline-flex h-6 items-center gap-1 rounded-md border border-border px-2 text-[10px] font-medium hover:bg-accent disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            {busy ? "Menyusun…" : "Buat penjelasan AI"}
          </button>
        )}
      </div>
      {text && (
        <div className="rounded-md bg-primary/5 p-2 text-[11px] leading-relaxed text-foreground">{text}</div>
      )}
      {err && <div className="text-[10px] text-bear">{err}</div>}
    </div>
  );
}
