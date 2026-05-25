"use client";

import { useEffect, useState } from "react";

interface QueueCounts {
  name: string;
  counts: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: number;
  };
  isPaused: boolean;
}

interface ApiResponse {
  ok: boolean;
  data?: { queues: QueueCounts[] };
  error?: { message: string };
}

export function JobsBoard() {
  const [queues, setQueues] = useState<QueueCounts[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/admin/jobs", { cache: "no-store" });
        const j = (await res.json()) as ApiResponse;
        if (!res.ok || !j.ok) throw new Error(j.error?.message ?? `HTTP ${res.status}`);
        if (!cancelled) setQueues(j.data?.queues ?? []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Gagal memuat queues");
      }
    }
    void load();
    const interval = setInterval(load, 10_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        {error}
      </div>
    );
  }

  if (!queues) {
    return <p className="text-sm text-neutral-500">Memuat queues…</p>;
  }

  if (queues.length === 0) {
    return <p className="text-sm text-neutral-500">Belum ada queue terdaftar.</p>;
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-neutral-50 text-neutral-600 text-xs uppercase tracking-wide">
          <tr>
            <th className="text-left px-4 py-2">Queue</th>
            <th className="text-right px-4 py-2">Waiting</th>
            <th className="text-right px-4 py-2">Active</th>
            <th className="text-right px-4 py-2">Delayed</th>
            <th className="text-right px-4 py-2">Completed</th>
            <th className="text-right px-4 py-2">Failed</th>
            <th className="text-right px-4 py-2">Paused</th>
            <th className="text-right px-4 py-2">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {queues.map((q) => (
            <tr key={q.name}>
              <td className="px-4 py-2 font-mono text-xs">{q.name}</td>
              <td className="px-4 py-2 text-right">{q.counts.waiting.toLocaleString("id-ID")}</td>
              <td className="px-4 py-2 text-right">{q.counts.active.toLocaleString("id-ID")}</td>
              <td className="px-4 py-2 text-right">{q.counts.delayed.toLocaleString("id-ID")}</td>
              <td className="px-4 py-2 text-right">
                {q.counts.completed.toLocaleString("id-ID")}
              </td>
              <td className="px-4 py-2 text-right">
                <span className={q.counts.failed > 0 ? "text-red-700 font-medium" : ""}>
                  {q.counts.failed.toLocaleString("id-ID")}
                </span>
              </td>
              <td className="px-4 py-2 text-right">{q.counts.paused.toLocaleString("id-ID")}</td>
              <td className="px-4 py-2 text-right">
                {q.isPaused ? (
                  <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                    Paused
                  </span>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-800">
                    Running
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
