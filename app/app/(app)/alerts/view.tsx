"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCard } from "@/components/alerts/AlertCard";
import { AlertConditionBuilder } from "@/components/alerts/AlertConditionBuilder";
import type {
  Alert,
  AlertCondition,
  AlertStatus,
  CreateAlertInput,
} from "@/lib/types/alerts";

const POLL_MS = 30_000;

async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  const json = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    data?: T;
    error?: { message?: string };
  };
  if (!res.ok || !json.ok) throw new Error(json.error?.message ?? "Request gagal");
  return json.data as T;
}

async function apiSend<T>(url: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    data?: T;
    error?: { message?: string };
  };
  if (!res.ok || !json.ok) throw new Error(json.error?.message ?? "Request gagal");
  return json.data as T;
}

const STATUS_FILTERS: { value: AlertStatus | "all"; label: string }[] = [
  { value: "all", label: "Semua" },
  { value: "active", label: "Aktif" },
  { value: "paused", label: "Dijeda" },
  { value: "triggered", label: "Terpicu" },
  { value: "expired", label: "Kadaluwarsa" },
];

export function AlertsView() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<AlertStatus | "all">("all");
  const [showCreate, setShowCreate] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ["alerts", "list", filter],
    queryFn: () =>
      apiGet<{ items: Alert[]; total: number }>(
        filter === "all" ? "/api/alerts" : `/api/alerts?status=${filter}`,
      ),
    refetchInterval: POLL_MS,
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateAlertInput) =>
      apiSend<{ alert: Alert }>("/api/alerts", "POST", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alerts", "list"] });
      setShowCreate(false);
      setFormError(null);
    },
    onError: (e) => setFormError(e instanceof Error ? e.message : "Gagal membuat alert"),
  });

  const pauseMutation = useMutation({
    mutationFn: (id: string) => apiSend(`/api/alerts/${id}/pause`, "POST"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alerts", "list"] }),
  });
  const resumeMutation = useMutation({
    mutationFn: (id: string) => apiSend(`/api/alerts/${id}/resume`, "POST"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alerts", "list"] }),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiSend(`/api/alerts/${id}`, "DELETE"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alerts", "list"] }),
  });

  const alerts = useMemo(() => listQuery.data?.items ?? [], [listQuery.data]);

  return (
    <div className="space-y-6 p-6">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Alerts</h1>
          <p className="text-sm text-muted-foreground">
            Notifikasi otomatis saat kondisi pasar terpenuhi.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm"
        >
          + Alert baru
        </button>
      </header>

      <div className="flex gap-2 flex-wrap">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={
              filter === f.value
                ? "px-3 py-1 text-xs rounded-full bg-primary text-primary-foreground"
                : "px-3 py-1 text-xs rounded-full border border-border hover:bg-accent"
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      {showCreate ? (
        <CreateAlertForm
          error={formError}
          onSubmit={(payload) => createMutation.mutate(payload)}
          onCancel={() => {
            setShowCreate(false);
            setFormError(null);
          }}
          submitting={createMutation.isPending}
        />
      ) : null}

      {listQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Memuat alert...</p>
      ) : alerts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center space-y-3">
          <h3 className="text-base font-medium">Belum ada alert</h3>
          <p className="text-sm text-muted-foreground">
            Buat alert pertama untuk dapat notifikasi otomatis saat kondisi pasar terpenuhi.
          </p>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground"
          >
            Buat alert
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {alerts.map((a) => (
            <AlertCard
              key={a.id}
              alert={a}
              onPause={(id) => pauseMutation.mutate(id)}
              onResume={(id) => resumeMutation.mutate(id)}
              onDelete={(id) => deleteMutation.mutate(id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface CreateAlertFormProps {
  error: string | null;
  onSubmit: (payload: CreateAlertInput) => void;
  onCancel: () => void;
  submitting?: boolean;
}

function CreateAlertForm({ error, onSubmit, onCancel, submitting }: CreateAlertFormProps) {
  const [companyKode, setCompanyKode] = useState("");
  const [name, setName] = useState("");
  const [condition, setCondition] = useState<AlertCondition | null>(null);
  const [channels, setChannels] = useState<("in_app" | "email" | "push")[]>(["in_app"]);
  const [repeatable, setRepeatable] = useState(false);

  const valid = companyKode.trim().length > 0 && name.trim().length > 0 && condition != null;

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Kode emiten</label>
          <input
            value={companyKode}
            onChange={(e) => setCompanyKode(e.target.value.toUpperCase())}
            maxLength={10}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
            placeholder="mis. BBRI"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Nama alert</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            placeholder="mis. BBRI breakout 5000"
          />
        </div>
      </div>

      <AlertConditionBuilder value={condition} onChange={setCondition} />

      <div>
        <label className="block text-sm font-medium mb-1">Channel notifikasi</label>
        <div className="flex gap-3 text-sm">
          {(["in_app", "email", "push"] as const).map((ch) => {
            const checked = channels.includes(ch);
            return (
              <label key={ch} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setChannels((prev) => [...prev, ch]);
                    } else {
                      setChannels((prev) => prev.filter((c) => c !== ch));
                    }
                  }}
                />
                <span className="capitalize">{ch.replace("_", " ")}</span>
              </label>
            );
          })}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={repeatable}
          onChange={(e) => setRepeatable(e.target.checked)}
        />
        Ulang setelah terpicu (jangan auto-pause)
      </label>

      {error ? (
        <div className="rounded-md border border-bear bg-bear-soft px-3 py-2 text-sm text-bear">
          {error}
        </div>
      ) : null}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-2 text-sm rounded-md border border-border"
        >
          Batal
        </button>
        <button
          type="button"
          disabled={!valid || submitting || channels.length === 0}
          onClick={() => {
            if (!valid || !condition) return;
            onSubmit({
              companyKode: companyKode.toUpperCase(),
              name,
              condition,
              channels,
              repeatable,
            } as CreateAlertInput);
          }}
          className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground disabled:opacity-50"
        >
          Simpan
        </button>
      </div>
    </div>
  );
}
