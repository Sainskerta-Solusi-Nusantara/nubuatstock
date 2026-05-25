"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

interface ConfigItem {
  id: string;
  key: string;
  value: unknown;
  type: string;
  description: string | null;
  isSensitive: boolean;
  updatedAt: string;
}

interface ConfigGroup {
  category: string;
  items: ConfigItem[];
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function diffLines(before: string, after: string): { type: "ctx" | "add" | "del"; text: string }[] {
  // Diff line-based sederhana — bukan LCS. Cukup untuk preview admin.
  const a = before.split("\n");
  const b = after.split("\n");
  const out: { type: "ctx" | "add" | "del"; text: string }[] = [];
  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max; i++) {
    const aLine = a[i];
    const bLine = b[i];
    if (aLine === bLine) {
      if (aLine !== undefined) out.push({ type: "ctx", text: aLine });
    } else {
      if (aLine !== undefined) out.push({ type: "del", text: aLine });
      if (bLine !== undefined) out.push({ type: "add", text: bLine });
    }
  }
  return out;
}

export function ConfigEditor({ groups }: { groups: ConfigGroup[] }) {
  const [editing, setEditing] = useState<ConfigItem | null>(null);
  const [draft, setDraft] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const diff = useMemo(() => {
    if (!editing) return [];
    return diffLines(safeStringify(editing.value), draft);
  }, [editing, draft]);

  function openEditor(item: ConfigItem) {
    setEditing(item);
    setDraft(safeStringify(item.value));
  }

  async function handleSave() {
    if (!editing) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(draft);
    } catch {
      toast.error("Value bukan JSON valid");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/config/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: parsed }),
      });
      const j = (await res.json()) as { ok: boolean; error?: { message?: string } };
      if (!res.ok || !j.ok) {
        throw new Error(j.error?.message ?? `HTTP ${res.status}`);
      }
      toast.success(`Config ${editing.key} disimpan.`);
      setEditing(null);
      // Reload server data
      if (typeof window !== "undefined") window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      {groups.map((g) => (
        <section key={g.category}>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 mb-3">
            {g.category}
          </h2>
          <div className="rounded-xl border border-neutral-200 bg-white divide-y divide-neutral-100">
            {g.items.map((item) => (
              <div key={item.id} className="p-4 flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-sm font-medium">{item.key}</div>
                  {item.description ? (
                    <div className="text-xs text-neutral-500 mt-1">{item.description}</div>
                  ) : null}
                  <pre className="mt-2 text-xs bg-neutral-50 rounded px-2 py-1 max-h-32 overflow-auto font-mono">
                    {safeStringify(item.value)}
                  </pre>
                </div>
                <button
                  type="button"
                  className="text-sm px-3 py-1.5 rounded-md border border-neutral-300 hover:bg-neutral-50"
                  onClick={() => openEditor(item)}
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
            className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b">
              <div className="font-mono text-sm font-semibold">{editing.key}</div>
              <div className="text-xs text-neutral-500 mt-1">
                Type: {editing.type} · Updated: {new Date(editing.updatedAt).toLocaleString("id-ID")}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-0 flex-1 overflow-hidden">
              <div className="p-4 border-r overflow-auto">
                <div className="text-xs font-semibold mb-2 text-neutral-500">EDIT (JSON)</div>
                <textarea
                  className="w-full h-64 font-mono text-xs border rounded p-2 focus:outline-none focus:ring-2 focus:ring-neutral-400"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  spellCheck={false}
                />
              </div>
              <div className="p-4 overflow-auto">
                <div className="text-xs font-semibold mb-2 text-neutral-500">DIFF PREVIEW</div>
                <pre className="font-mono text-xs leading-relaxed">
                  {diff.map((line, i) => (
                    <div
                      key={i}
                      className={
                        line.type === "add"
                          ? "bg-green-50 text-green-800"
                          : line.type === "del"
                            ? "bg-red-50 text-red-800"
                            : "text-neutral-700"
                      }
                    >
                      {line.type === "add" ? "+" : line.type === "del" ? "-" : " "} {line.text}
                    </div>
                  ))}
                </pre>
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
                onClick={handleSave}
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
