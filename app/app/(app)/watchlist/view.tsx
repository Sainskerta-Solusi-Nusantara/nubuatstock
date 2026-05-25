"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AddTickerCombobox } from "@/components/watchlist/AddTickerCombobox";
import { WatchlistTable } from "@/components/watchlist/WatchlistTable";
import { WatchlistTabs } from "@/components/watchlist/WatchlistTabs";
import type {
  WatchlistDetail,
  WatchlistView as WatchlistViewType,
} from "@/lib/types/watchlist";

const QUOTE_POLL_INTERVAL_MS = 30_000;

async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  const json = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    data?: T;
    error?: { message?: string };
  };
  if (!res.ok || !json.ok) {
    throw new Error(json.error?.message ?? `Request gagal (${res.status})`);
  }
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
  if (!res.ok || !json.ok) {
    throw new Error(json.error?.message ?? `Request gagal (${res.status})`);
  }
  return json.data as T;
}

export function WatchlistView() {
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [newWatchlistName, setNewWatchlistName] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ["watchlist", "list"],
    queryFn: () => apiGet<{ items: WatchlistViewType[] }>("/api/watchlist"),
  });

  useEffect(() => {
    if (!activeId && listQuery.data?.items.length) {
      setActiveId(listQuery.data.items[0]!.id);
    }
  }, [listQuery.data, activeId]);

  const detailQuery = useQuery({
    queryKey: ["watchlist", "detail", activeId],
    queryFn: () => apiGet<WatchlistDetail>(`/api/watchlist/${activeId}`),
    enabled: !!activeId,
    refetchInterval: QUOTE_POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
  });

  const createWatchlist = useMutation({
    mutationFn: (name: string) =>
      apiSend<{ watchlist: WatchlistViewType }>("/api/watchlist", "POST", { name }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["watchlist", "list"] });
      setActiveId(data.watchlist.id);
      setNewWatchlistName("");
      setShowCreate(false);
    },
    onError: (e) => setError(e instanceof Error ? e.message : "Gagal membuat watchlist"),
  });

  const addTicker = useMutation({
    mutationFn: ({ id, code }: { id: string; code: string }) =>
      apiSend(`/api/watchlist/${id}/items`, "POST", { companyKode: code }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["watchlist", "detail", activeId] });
      qc.invalidateQueries({ queryKey: ["watchlist", "list"] });
    },
    onError: (e) => setError(e instanceof Error ? e.message : "Gagal menambah emiten"),
  });

  const removeTicker = useMutation({
    mutationFn: ({ id, itemId }: { id: string; itemId: string }) =>
      apiSend(`/api/watchlist/${id}/items/${itemId}`, "DELETE"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["watchlist", "detail", activeId] });
      qc.invalidateQueries({ queryKey: ["watchlist", "list"] });
    },
    onError: (e) => setError(e instanceof Error ? e.message : "Gagal menghapus emiten"),
  });

  const items = useMemo(() => listQuery.data?.items ?? [], [listQuery.data]);

  return (
    <div className="space-y-6 p-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Watchlist</h1>
          <p className="text-sm text-muted-foreground">
            Pantau emiten favorit dengan harga live (refresh otomatis setiap 30 detik).
          </p>
        </div>
      </header>

      {error ? (
        <div className="rounded-md border border-bear bg-bear-soft px-3 py-2 text-sm text-bear flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-xs underline" type="button">
            Tutup
          </button>
        </div>
      ) : null}

      {listQuery.isLoading ? (
        <div className="text-sm text-muted-foreground">Memuat watchlist...</div>
      ) : listQuery.error ? (
        <EmptyState
          title="Gagal memuat watchlist"
          description={listQuery.error.message}
          action={{ label: "Coba lagi", onClick: () => listQuery.refetch() }}
        />
      ) : items.length === 0 ? (
        <EmptyState
          title="Belum ada watchlist"
          description="Watchlist default akan dibuat otomatis. Refresh kalau belum muncul."
          action={{ label: "Refresh", onClick: () => listQuery.refetch() }}
        />
      ) : (
        <>
          <WatchlistTabs
            items={items}
            activeId={activeId}
            onSelect={setActiveId}
            onNew={() => setShowCreate(true)}
          />

          {showCreate ? (
            <div className="rounded-md border border-border bg-card p-4 flex flex-col gap-2">
              <label className="text-sm font-medium">Nama watchlist baru</label>
              <div className="flex gap-2">
                <input
                  className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
                  value={newWatchlistName}
                  onChange={(e) => setNewWatchlistName(e.target.value)}
                  maxLength={80}
                  placeholder="mis. Sektor Energi"
                />
                <button
                  type="button"
                  onClick={() => createWatchlist.mutate(newWatchlistName.trim())}
                  disabled={!newWatchlistName.trim() || createWatchlist.isPending}
                  className="px-3 py-2 text-sm rounded-md bg-primary text-primary-foreground disabled:opacity-50"
                >
                  Buat
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-3 py-2 text-sm rounded-md border border-border"
                >
                  Batal
                </button>
              </div>
            </div>
          ) : null}

          <div className="flex justify-between items-center gap-4 flex-wrap">
            <AddTickerCombobox
              disabled={!activeId}
              onPick={(code) => {
                if (!activeId) return;
                addTicker.mutate({ id: activeId, code });
              }}
            />
            {detailQuery.dataUpdatedAt ? (
              <p className="text-xs text-muted-foreground">
                Diperbarui: {new Date(detailQuery.dataUpdatedAt).toLocaleTimeString("id-ID")}
              </p>
            ) : null}
          </div>

          {detailQuery.isLoading ? (
            <div className="text-sm text-muted-foreground">Memuat data...</div>
          ) : detailQuery.error ? (
            <EmptyState
              title="Gagal memuat watchlist"
              description={detailQuery.error.message}
            />
          ) : detailQuery.data ? (
            <WatchlistTable
              items={detailQuery.data.items}
              onRemove={(itemId) =>
                activeId && removeTicker.mutate({ id: activeId, itemId })
              }
              onOpenTicker={(code) => {
                window.location.href = `/ticker/${code}`;
              }}
            />
          ) : null}
        </>
      )}
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}

function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-border p-10 text-center space-y-3">
      <h3 className="text-base font-medium">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
      {action ? (
        <button
          type="button"
          onClick={action.onClick}
          className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground"
        >
          {action.label}
        </button>
      ) : null}
    </div>
  );
}
