"use client";

import { useState } from "react";
import { toast } from "sonner";

interface SecretItem {
  id: string;
  key: string;
  description: string | null;
  isConfigured: boolean;
  keyVersion: number;
  lastRotatedAt: string | null;
}

export function SecretsManager({ items }: { items: SecretItem[] }) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  async function handleSet(key: string) {
    const value = drafts[key]?.trim();
    if (!value) {
      toast.error("Value wajib diisi");
      return;
    }
    if (!confirm(`Set / rotate secret "${key}"?`)) return;
    setBusy(key);
    try {
      const res = await fetch(`/api/admin/secrets/${encodeURIComponent(key)}/set`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      });
      const j = (await res.json()) as { ok: boolean; error?: { message?: string } };
      if (!res.ok || !j.ok) throw new Error(j.error?.message ?? `HTTP ${res.status}`);
      toast.success(`Secret ${key} disimpan.`);
      setDrafts((d) => ({ ...d, [key]: "" }));
      if (typeof window !== "undefined") window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setBusy(null);
    }
  }

  async function handleClear(key: string) {
    if (!confirm(`Hapus secret "${key}"? Fitur yang bergantung padanya akan berhenti bekerja.`))
      return;
    setBusy(key);
    try {
      const res = await fetch(`/api/admin/secrets/${encodeURIComponent(key)}`, {
        method: "DELETE",
      });
      const j = (await res.json()) as { ok: boolean; error?: { message?: string } };
      if (!res.ok || !j.ok) throw new Error(j.error?.message ?? `HTTP ${res.status}`);
      toast.success(`Secret ${key} dihapus.`);
      if (typeof window !== "undefined") window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white divide-y divide-neutral-100">
      {items.map((item) => (
        <div key={item.id} className="p-4 flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm font-medium">{item.key}</span>
              {item.isConfigured ? (
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                  ✓ Configured
                </span>
              ) : (
                <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600">
                  ○ Not Set
                </span>
              )}
            </div>
            {item.description ? (
              <div className="text-xs text-neutral-500 mt-1">{item.description}</div>
            ) : null}
            {item.lastRotatedAt ? (
              <div className="text-xs text-neutral-400 mt-1">
                Terakhir di-rotate: {new Date(item.lastRotatedAt).toLocaleString("id-ID")} · v
                {item.keyVersion}
              </div>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="password"
              autoComplete="new-password"
              placeholder={item.isConfigured ? "Rotate (input value baru)" : "Set value"}
              value={drafts[item.key] ?? ""}
              onChange={(e) => setDrafts((d) => ({ ...d, [item.key]: e.target.value }))}
              className="text-sm border border-neutral-300 rounded px-2 py-1.5 w-64 font-mono"
            />
            <button
              type="button"
              disabled={busy === item.key}
              onClick={() => handleSet(item.key)}
              className="text-sm px-3 py-1.5 rounded-md bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-50"
            >
              {item.isConfigured ? "Rotate" : "Set"}
            </button>
            {item.isConfigured ? (
              <button
                type="button"
                disabled={busy === item.key}
                onClick={() => handleClear(item.key)}
                className="text-sm px-3 py-1.5 rounded-md border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                Clear
              </button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
