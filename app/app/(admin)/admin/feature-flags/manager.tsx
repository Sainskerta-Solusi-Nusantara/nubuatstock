"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { RolloutStrategy } from "@/lib/types/admin";

interface FlagRow {
  key: string;
  description: string;
  category: string;
  defaultValue: unknown;
  rolloutStrategy: RolloutStrategy;
  isActive: boolean;
  updatedAt: string;
}

function summarizeStrategy(s: RolloutStrategy): string {
  switch (s.type) {
    case "all":
      return "Semua user";
    case "off":
      return "Off (semua user)";
    case "percentage":
      return `${s.value}% rollout`;
    case "tier_min":
      return `Tier ≥ ${s.value}`;
    case "user_list":
      return `User list (${s.value.length})`;
    case "role":
      return `Role = ${s.value}`;
    default:
      return "Unknown";
  }
}

export function FeatureFlagsManager({ flags }: { flags: FlagRow[] }) {
  const groups = useMemo(() => {
    const m = new Map<string, FlagRow[]>();
    for (const f of flags) {
      const list = m.get(f.category) ?? [];
      list.push(f);
      m.set(f.category, list);
    }
    return Array.from(m.entries());
  }, [flags]);

  const [editing, setEditing] = useState<FlagRow | null>(null);
  const [strategyDraft, setStrategyDraft] = useState<string>("");
  const [defaultDraft, setDefaultDraft] = useState<string>("");
  const [saving, setSaving] = useState(false);

  function openEditor(flag: FlagRow) {
    setEditing(flag);
    setStrategyDraft(JSON.stringify(flag.rolloutStrategy, null, 2));
    setDefaultDraft(JSON.stringify(flag.defaultValue, null, 2));
  }

  async function toggleActive(flag: FlagRow) {
    try {
      const res = await fetch(`/api/admin/feature-flags/${encodeURIComponent(flag.key)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !flag.isActive }),
      });
      const j = (await res.json()) as { ok: boolean; error?: { message?: string } };
      if (!res.ok || !j.ok) throw new Error(j.error?.message ?? `HTTP ${res.status}`);
      toast.success(`Flag ${flag.key} ${!flag.isActive ? "diaktifkan" : "dinonaktifkan"}.`);
      if (typeof window !== "undefined") window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal toggle");
    }
  }

  async function saveEditor() {
    if (!editing) return;
    let strategy: RolloutStrategy;
    let defaultValue: unknown;
    try {
      strategy = JSON.parse(strategyDraft);
    } catch {
      toast.error("Rollout strategy bukan JSON valid");
      return;
    }
    try {
      defaultValue = JSON.parse(defaultDraft);
    } catch {
      toast.error("Default value bukan JSON valid");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/feature-flags/${encodeURIComponent(editing.key)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rolloutStrategy: strategy, defaultValue }),
      });
      const j = (await res.json()) as { ok: boolean; error?: { message?: string } };
      if (!res.ok || !j.ok) throw new Error(j.error?.message ?? `HTTP ${res.status}`);
      toast.success(`Flag ${editing.key} disimpan.`);
      setEditing(null);
      if (typeof window !== "undefined") window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      {groups.map(([category, list]) => (
        <section key={category}>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 mb-3">
            {category}
          </h2>
          <div className="rounded-xl border border-neutral-200 bg-white divide-y divide-neutral-100">
            {list.map((flag) => (
              <div key={flag.key} className="p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-medium">{flag.key}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700">
                      {summarizeStrategy(flag.rolloutStrategy)}
                    </span>
                  </div>
                  {flag.description ? (
                    <div className="text-xs text-neutral-500 mt-1">{flag.description}</div>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => toggleActive(flag)}
                  className={`text-xs px-3 py-1 rounded-full ${
                    flag.isActive
                      ? "bg-green-100 text-green-800"
                      : "bg-neutral-100 text-neutral-600"
                  }`}
                >
                  {flag.isActive ? "Active" : "Inactive"}
                </button>
                <button
                  type="button"
                  onClick={() => openEditor(flag)}
                  className="text-sm px-3 py-1.5 rounded-md border border-neutral-300 hover:bg-neutral-50"
                >
                  Edit
                </button>
              </div>
            ))}
          </div>
        </section>
      ))}

      {editing ? (
        <div
          role="dialog"
          aria-modal
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !saving && setEditing(null)}
        >
          <div
            className="bg-white rounded-xl w-full max-w-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b">
              <div className="font-mono text-sm font-semibold">{editing.key}</div>
              <div className="text-xs text-neutral-500 mt-1">{editing.description}</div>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                  Default Value (JSON)
                </label>
                <textarea
                  className="mt-1 w-full h-24 font-mono text-xs border rounded p-2"
                  value={defaultDraft}
                  onChange={(e) => setDefaultDraft(e.target.value)}
                  spellCheck={false}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                  Rollout Strategy (JSON)
                </label>
                <p className="text-xs text-neutral-500 mt-1">
                  Contoh: {"{ \"type\": \"percentage\", \"value\": 25 }"} atau {"{ \"type\": \"tier_min\", \"value\": \"pro\" }"}
                </p>
                <textarea
                  className="mt-1 w-full h-32 font-mono text-xs border rounded p-2"
                  value={strategyDraft}
                  onChange={(e) => setStrategyDraft(e.target.value)}
                  spellCheck={false}
                />
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-2 bg-neutral-50">
              <button
                type="button"
                disabled={saving}
                onClick={() => setEditing(null)}
                className="text-sm px-3 py-1.5 rounded-md border border-neutral-300 hover:bg-white"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={saveEditor}
                className="text-sm px-3 py-1.5 rounded-md bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-50"
              >
                {saving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
