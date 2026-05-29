"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";
import type { HealthResponse } from "@/lib/types/audit";

const REFRESH_INTERVAL_MS = 30_000;

type ServiceState = "operational" | "degraded" | "down" | "unknown";

interface ServiceRow {
  label: string;
  detail: string;
  state: ServiceState;
}

const STATE_META: Record<
  ServiceState,
  { label: string; dot: string; text: string }
> = {
  operational: { label: "Operational", dot: "bg-bull", text: "text-bull" },
  degraded: { label: "Degraded", dot: "bg-amber-500", text: "text-amber-500" },
  down: { label: "Down", dot: "bg-bear", text: "text-bear" },
  unknown: { label: "Unknown", dot: "bg-muted-foreground", text: "text-muted-foreground" },
};

function mapCheck(status: HealthResponse["checks"]["db"]): ServiceState {
  switch (status) {
    case "ok":
      return "operational";
    case "degraded":
      return "degraded";
    case "fail":
      return "down";
    default:
      return "unknown";
  }
}

function buildRows(health: HealthResponse | null, reachable: boolean): ServiceRow[] {
  // App reachable selama fetch sukses (status 200 atau 503 — keduanya berarti
  // HTTP layer hidup). reachable=false hanya saat network/error total.
  const appState: ServiceState = reachable ? "operational" : "down";

  if (!health) {
    return [
      { label: "Aplikasi", detail: reachable ? "Web app merespons" : "Tidak dapat dijangkau", state: appState },
      { label: "Database", detail: "Status tidak tersedia", state: "unknown" },
      { label: "Market Data & AI Worker", detail: "Status tidak tersedia", state: "unknown" },
      { label: "Antrian (Redis)", detail: "Status tidak tersedia", state: "unknown" },
    ];
  }

  const worker = health.checks.worker;
  const workerDetail =
    worker.ageSeconds != null
      ? `Heartbeat terakhir ${worker.ageSeconds}s lalu`
      : "Belum ada heartbeat";

  return [
    { label: "Aplikasi", detail: `Web app merespons (v${health.version})`, state: appState },
    {
      label: "Database",
      detail: health.checks.db === "ok" ? "Koneksi normal" : "Koneksi bermasalah",
      state: mapCheck(health.checks.db),
    },
    {
      label: "Market Data & AI Worker",
      detail: workerDetail,
      state: mapCheck(worker.status),
    },
    {
      label: "Antrian (Redis)",
      detail: health.checks.redis === "ok" ? "Koneksi normal" : "Koneksi bermasalah",
      state: mapCheck(health.checks.redis),
    },
  ];
}

function overallState(rows: ServiceRow[]): ServiceState {
  if (rows.some((r) => r.state === "down")) return "down";
  if (rows.some((r) => r.state === "degraded")) return "degraded";
  if (rows.some((r) => r.state === "unknown")) return "unknown";
  return "operational";
}

export function StatusView() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [reachable, setReachable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      // /api/health balas 200 saat sehat, 503 saat ada check fail.
      // Kedua kasus mengembalikan JSON HealthResponse — keduanya berarti app reachable.
      const res = await fetch("/api/health", { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as HealthResponse | null;
      if (json && typeof json.ok === "boolean") {
        setHealth(json);
        setReachable(true);
      } else {
        setHealth(null);
        setReachable(res.ok);
      }
    } catch {
      setHealth(null);
      setReachable(false);
    } finally {
      setLoading(false);
      setUpdatedAt(Date.now());
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [load]);

  const rows = buildRows(health, reachable);
  const overall = overallState(rows);
  const overallMeta = STATE_META[overall];

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Status Layanan</h1>
        <p className="text-sm text-muted-foreground">
          Status real-time komponen utama Nubuat. Halaman ini menyegarkan otomatis setiap 30 detik.
        </p>
      </div>

      <div
        className={cn(
          "mt-8 flex items-center justify-between gap-4 rounded-lg border border-border bg-card px-5 py-4",
        )}
      >
        <div className="flex items-center gap-3">
          <span className={cn("inline-block h-3 w-3 rounded-full", overallMeta.dot)} />
          <span className={cn("text-base font-medium", overallMeta.text)}>
            {overall === "operational"
              ? "Semua Sistem Beroperasi"
              : overall === "degraded"
                ? "Sebagian Layanan Terganggu"
                : overall === "down"
                  ? "Ada Layanan Bermasalah"
                  : "Status Sebagian Tidak Diketahui"}
          </span>
        </div>
        {loading ? (
          <span className="text-xs text-muted-foreground">Memuat…</span>
        ) : null}
      </div>

      <ul className="mt-6 divide-y divide-border rounded-lg border border-border bg-card">
        {rows.map((row) => {
          const meta = STATE_META[row.state];
          return (
            <li key={row.label} className="flex items-center justify-between gap-4 px-5 py-4">
              <div>
                <p className="text-sm font-medium text-foreground">{row.label}</p>
                <p className="text-xs text-muted-foreground">{row.detail}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn("inline-block h-2.5 w-2.5 rounded-full", meta.dot)} />
                <span className={cn("text-sm font-medium", meta.text)}>{meta.label}</span>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-6 text-xs text-muted-foreground">
        {updatedAt
          ? `Terakhir diperbarui: ${new Date(updatedAt).toLocaleTimeString("id-ID")}`
          : "Belum diperbarui"}
      </p>
    </main>
  );
}
