"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Play, Loader2, ListChecks, Newspaper, CandlestickChart, Target, Building2, Activity, Shapes, Waves, Gauge } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { PipelineStatus, PipelineStepStatus } from "@/lib/superadmin/pipeline-status";

/**
 * Pemicu manual pipeline data (inline, tanpa worker). Setiap tombol memanggil
 * endpoint Vercel Cron yang sama yang dijalankan otomatis — tapi sekarang bisa
 * di-trigger superadmin kapan saja (mis. saat cron Vercel tidak jalan / data
 * kosong). Endpoint cron menerima sesi superadmin (lihat lib/cron/helpers.ts).
 */

type StepKey =
  | "news"
  | "eod"
  | "technical"
  | "patterns"
  | "elliott"
  | "analysis"
  | "picks"
  | "securities";

type Step = {
  key: StepKey;
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  desc: string;
};

function timeAgo(d: string | null): string {
  if (!d) return "belum pernah";
  const t = new Date(d).getTime();
  if (Number.isNaN(t)) return "—";
  const mins = Math.floor((Date.now() - t) / 60000);
  if (mins < 1) return "baru saja";
  if (mins < 60) return `${mins} menit lalu`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} jam lalu`;
  const days = Math.floor(hrs / 24);
  return `${days} hari lalu`;
}

function statusLine(key: StepKey, s: PipelineStepStatus | undefined): { text: string; stale: boolean } {
  if (!s || !s.lastAt) return { text: "Belum ada data", stale: true };
  const ago = timeAgo(s.lastAt);
  const stale = Date.now() - new Date(s.lastAt).getTime() > 24 * 3600_000;
  if (key === "news") {
    return { text: `Terakhir ambil ${ago} · ${s.count} berita (24j)`, stale };
  }
  if (key === "eod" || key === "technical") {
    return { text: `Data ${s.dataDate ?? "—"} · ${s.count} emiten · update ${ago}`, stale };
  }
  if (key === "securities") {
    return { text: `Data ${s.dataDate ?? "—"} · ${s.count} rekomendasi · ${ago}`, stale };
  }
  if (key === "patterns" || key === "elliott" || key === "analysis") {
    return { text: `${s.count} di-refresh hari ini · update ${ago}`, stale };
  }
  return { text: `Data ${s.dataDate ?? "—"} · ${s.count} picks · publish ${ago}`, stale };
}

// Urutan = urutan dependensi rantai data harian.
const STEPS: Step[] = [
  {
    key: "news",
    label: "Berita (News)",
    path: "/api/cron/news-ingest",
    icon: Newspaper,
    desc: "Fetch RSS sumber aktif → simpan + skor sentimen. Independen.",
  },
  {
    key: "eod",
    label: "Harga EOD (OHLCV)",
    path: "/api/cron/ingest-eod",
    icon: CandlestickChart,
    desc: "Ambil harga penutupan semua emiten aktif. Prasyarat Technical & Picks.",
  },
  {
    key: "technical",
    label: "Technical Snapshots",
    path: "/api/cron/technical-snapshots",
    icon: Activity,
    desc: "Hitung indikator teknikal (RSI, Stoch, MA, ADX…) dari EOD. Dipakai preset teknikal Screener.",
  },
  {
    key: "patterns",
    label: "Pattern Detection",
    path: "/api/cron/detect-patterns",
    icon: Shapes,
    desc: "Deteksi pola chart & candlestick dari EOD. Butuh harga EOD.",
  },
  {
    key: "elliott",
    label: "Elliott Wave",
    path: "/api/cron/analyze-elliott",
    icon: Waves,
    desc: "Analisis hitungan gelombang Elliott per emiten. Butuh harga EOD.",
  },
  {
    key: "analysis",
    label: "Analysis Snapshots (Verdict)",
    path: "/api/cron/analysis-snapshots",
    icon: Gauge,
    desc: "Gabungkan teknikal + pattern + Elliott + Wyckoff jadi verdict. Jalankan setelah Technical/Pattern/Elliott.",
  },
  {
    key: "picks",
    label: "Daily Picks",
    path: "/api/cron/picks-generate",
    icon: Target,
    desc: "Generate rekomendasi harian dari EOD terbaru + narasi AI.",
  },
  {
    key: "securities",
    label: "Daily Picks Sekuritas",
    path: "/api/cron/securities-picks",
    icon: Building2,
    desc: "Fetch rekomendasi sekuritas dari sumber publik + ekstraksi AI. Independen.",
  },
];

function summarize(j: Record<string, unknown> | null): string {
  if (!j) return "selesai";
  // Tampilkan field angka yang umum dipakai endpoint (count-like).
  const keys = ["inserted", "scored", "generated", "skipped", "count", "rows", "tradeDate"];
  const parts: string[] = [];
  for (const k of keys) {
    const v = (j as Record<string, unknown>)[k];
    if (typeof v === "number" || typeof v === "string") parts.push(`${k}=${v}`);
  }
  const res = (j as { result?: Record<string, unknown> }).result;
  if (parts.length === 0 && res && typeof res === "object") {
    for (const [k, v] of Object.entries(res)) {
      if (typeof v === "number" || typeof v === "string") parts.push(`${k}=${v}`);
    }
  }
  return parts.length ? parts.slice(0, 4).join(" · ") : "selesai";
}

export function DataPipelineTriggers({ status }: { status: PipelineStatus }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [last, setLast] = useState<Record<string, { ok: boolean; msg: string }>>({});

  async function runStep(step: Step): Promise<boolean> {
    setBusy(step.key);
    try {
      const res = await fetch(step.path, { method: "POST" });
      const j = (await res.json().catch(() => null)) as Record<string, unknown> | null;
      const ok = res.ok && (j?.ok ?? false) === true;
      if (ok) {
        const msg = summarize(j);
        setLast((p) => ({ ...p, [step.key]: { ok: true, msg } }));
        toast.success(`${step.label}: ${msg}`);
      } else {
        const err = (j?.error as string) ?? `HTTP ${res.status}`;
        setLast((p) => ({ ...p, [step.key]: { ok: false, msg: err } }));
        toast.error(`${step.label}: ${err}`);
      }
      router.refresh();
      return ok;
    } catch {
      setLast((p) => ({ ...p, [step.key]: { ok: false, msg: "network error" } }));
      toast.error(`${step.label}: gagal terhubung.`);
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function runAll() {
    setBusy("all");
    // Jalankan berurutan sesuai dependensi. Technical & Picks butuh harga EOD;
    // News & Securities independen (tetap jalan walau EOD gagal).
    let eodOk = true;
    // Langkah yang butuh harga EOD (dilewati bila EOD gagal). News & Securities independen.
    const priceDependent: StepKey[] = ["technical", "patterns", "elliott", "analysis", "picks"];
    for (const step of STEPS) {
      if (priceDependent.includes(step.key) && !eodOk) {
        toast.warning(`${step.label} dilewati — EOD gagal (tak ada harga baru).`);
        continue;
      }
      const ok = await runStep(step);
      if (step.key === "eod") eodOk = ok;
    }
    setBusy(null);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Play className="h-4 w-4 text-primary" />
          Pemicu Pipeline Data (Manual)
          <button
            onClick={runAll}
            disabled={busy !== null}
            className="ml-auto inline-flex h-8 items-center gap-2 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {busy === "all" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ListChecks className="h-3.5 w-3.5" />}
            Jalankan semua (urut)
          </button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-xs text-muted-foreground">
          Trigger manual untuk endpoint cron yang sama dengan jadwal otomatis (Vercel Cron).
          Aman diulang — semua idempotent. Gunakan bila data hari ini kosong.
        </p>
        <ul className="space-y-2">
          {STEPS.map((step) => {
            const Icon = step.icon;
            const r = last[step.key];
            const running = busy === step.key || busy === "all";
            const st = statusLine(step.key, status[step.key]);
            return (
              <li
                key={step.key}
                className="flex items-center gap-3 rounded-md border border-border bg-background p-3"
              >
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{step.label}</span>
                    <Badge
                      variant={st.stale ? "outline" : "secondary"}
                      className={`text-[10px] ${st.stale ? "text-amber-600 dark:text-amber-500" : "text-emerald-600 dark:text-emerald-500"}`}
                    >
                      {st.text}
                    </Badge>
                    {r && (
                      <Badge
                        variant={r.ok ? "secondary" : "destructive"}
                        className="text-[10px]"
                      >
                        {r.ok ? `→ ${r.msg}` : `gagal: ${r.msg}`}
                      </Badge>
                    )}
                  </div>
                  <p className="truncate text-[11px] text-muted-foreground">{step.desc}</p>
                </div>
                <button
                  onClick={() => runStep(step)}
                  disabled={running}
                  className="inline-flex h-8 shrink-0 items-center gap-2 rounded-md border border-border px-3 text-xs font-semibold hover:bg-muted disabled:opacity-50"
                >
                  {busy === step.key ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Play className="h-3.5 w-3.5" />
                  )}
                  Jalankan
                </button>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
