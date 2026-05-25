import Link from "next/link";
import { Calendar, RefreshCw, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/server";
import { listSchedules, type ScheduleInfo } from "@/lib/queue/schedule-status";
import { cn } from "@/lib/utils/cn";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Cron Schedules — Nubuat Admin",
};

interface PageProps {
  searchParams: Promise<{ ts?: string }>;
}

export default async function AdminJobSchedulePage({ searchParams }: PageProps) {
  await requireAdmin();
  // Touch searchParams.ts so Next treats this as dynamic per-request even kalau
  // ada caching layer di atas. Nilai ts hanya cache-buster, tidak dipakai.
  await searchParams;

  const schedules = await listSchedules();
  const refreshHref = `/admin/jobs/schedule?ts=${Date.now()}`;

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">Cron Schedules</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Daftar repeatable job (cron) yang terdaftar di BullMQ — read-only.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/jobs"
            className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-accent"
          >
            Back to Queues
          </Link>
          <Link
            href={refreshHref}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-accent"
          >
            <RefreshCw className="h-3 w-3" />
            Refresh
          </Link>
        </div>
      </header>

      {/* Explainer */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
            Tentang halaman ini
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Halaman ini <strong>read-only</strong> — untuk edit schedule, ubah config{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">app_config.cron.*</code>{" "}
          (atau key terkait di <code className="font-mono text-xs">lib/queue/scheduler.ts</code>),
          lalu restart worker process.
        </CardContent>
      </Card>

      {/* Schedules table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Schedules ({schedules.length})
          </CardTitle>
          <CardDescription>
            Diurutkan berdasarkan next-run terdekat.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {schedules.length === 0 ? (
            <div className="space-y-2 p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Belum ada cron schedule terdaftar.
              </p>
              <p className="text-xs text-muted-foreground">
                Pastikan worker process sudah jalan & cek{" "}
                <code className="rounded bg-muted px-1 py-0.5 font-mono">worker/index.ts</code>{" "}
                serta <code className="rounded bg-muted px-1 py-0.5 font-mono">lib/queue/scheduler.ts</code>.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="px-3 py-2 text-left">Job</th>
                    <th className="px-3 py-2 text-left">Cron</th>
                    <th className="px-3 py-2 text-left">TZ</th>
                    <th className="px-3 py-2 text-left">Last run</th>
                    <th className="px-3 py-2 text-center">Status</th>
                    <th className="px-3 py-2 text-left">Next run (est.)</th>
                    <th className="px-3 py-2 text-right">Iter</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {schedules.map((s) => (
                    <ScheduleRow key={s.name} s={s} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ScheduleRow({ s }: { s: ScheduleInfo }) {
  return (
    <tr className="transition hover:bg-accent/40">
      <td className="px-3 py-2">
        <div className="font-medium">{s.jobName}</div>
        <div className="font-mono text-[10px] text-muted-foreground">{s.queueName}</div>
      </td>
      <td className="px-3 py-2">
        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{s.pattern}</code>
      </td>
      <td className="px-3 py-2 text-xs text-muted-foreground">{s.tz ?? "—"}</td>
      <td className="px-3 py-2 text-xs">
        <TimeCell value={s.lastRunAt} />
      </td>
      <td className="px-3 py-2 text-center">
        <StatusBadge status={s.lastStatus} />
      </td>
      <td className="px-3 py-2 text-xs">
        <TimeCell value={s.nextRunAt} future />
      </td>
      <td className="px-3 py-2 text-right font-mono text-xs text-muted-foreground">
        {s.iterationCount.toLocaleString("id-ID")}
      </td>
    </tr>
  );
}

function TimeCell({ value, future }: { value: Date | null; future?: boolean }) {
  if (!value) {
    return <span className="text-muted-foreground">—</span>;
  }
  const abs = value.toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const rel = formatRelative(value, future);
  return (
    <span title={abs} className="cursor-help">
      {rel}
    </span>
  );
}

function StatusBadge({ status }: { status: ScheduleInfo["lastStatus"] }) {
  if (status === null) {
    return (
      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
        —
      </span>
    );
  }
  const map = {
    success: "bg-bull-soft text-bull",
    failed: "bg-bear-soft text-bear",
    running: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  } as const;
  const labelMap = {
    success: "Success",
    failed: "Failed",
    running: "Running",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase",
        map[status],
      )}
    >
      {labelMap[status]}
    </span>
  );
}

/**
 * Lightweight relative-time formatter (id-ID), local — hindari deps date-fns
 * supaya bundle thin & deterministic di SSR.
 */
function formatRelative(d: Date, future = false): string {
  const now = Date.now();
  const diffSec = Math.round((d.getTime() - now) / 1000);
  const abs = Math.abs(diffSec);
  let value: number;
  let unit: string;
  if (abs < 60) {
    value = abs;
    unit = "detik";
  } else if (abs < 3600) {
    value = Math.round(abs / 60);
    unit = "menit";
  } else if (abs < 86_400) {
    value = Math.round(abs / 3600);
    unit = "jam";
  } else {
    value = Math.round(abs / 86_400);
    unit = "hari";
  }
  if (future || diffSec > 0) {
    return diffSec > 0 ? `dalam ${value} ${unit}` : `${value} ${unit} lalu`;
  }
  return `${value} ${unit} lalu`;
}
