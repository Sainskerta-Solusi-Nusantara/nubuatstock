"use client";

import { useState } from "react";
import { toast } from "sonner";

interface PromptVersion {
  id: string;
  version: string;
  content: string;
  isActive: boolean;
  description: string | null;
  createdAt: string;
}

interface PromptGroup {
  key: string;
  versions: PromptVersion[];
}

export function AiPromptsManager({ groups }: { groups: PromptGroup[] }) {
  const [creating, setCreating] = useState<{ key: string } | null>(null);
  const [newVersion, setNewVersion] = useState<string>("");
  const [newContent, setNewContent] = useState<string>("");
  const [newDescription, setNewDescription] = useState<string>("");
  const [busy, setBusy] = useState(false);

  async function activate(promptId: string, key: string, version: string) {
    if (!confirm(`Aktifkan ${key} versi ${version}? Versi aktif sebelumnya akan dinonaktifkan.`))
      return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/ai-prompts/${promptId}/activate`, { method: "POST" });
      const j = (await res.json()) as { ok: boolean; error?: { message?: string } };
      if (!res.ok || !j.ok) throw new Error(j.error?.message ?? `HTTP ${res.status}`);
      toast.success(`${key}@${version} diaktifkan.`);
      if (typeof window !== "undefined") window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal aktivasi");
    } finally {
      setBusy(false);
    }
  }

  function openCreate(key: string) {
    setCreating({ key });
    setNewVersion("");
    setNewContent("");
    setNewDescription("");
  }

  async function saveNew() {
    if (!creating) return;
    if (!newVersion.trim() || !newContent.trim()) {
      toast.error("Version dan content wajib diisi");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/ai-prompts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: creating.key,
          version: newVersion.trim(),
          content: newContent,
          description: newDescription.trim() || undefined,
        }),
      });
      const j = (await res.json()) as { ok: boolean; error?: { message?: string } };
      if (!res.ok || !j.ok) throw new Error(j.error?.message ?? `HTTP ${res.status}`);
      toast.success("Versi baru tersimpan.");
      setCreating(null);
      if (typeof window !== "undefined") window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      {groups.map((g) => (
        <section key={g.key} className="rounded-xl border border-neutral-200 bg-white">
          <header className="p-5 border-b flex items-center justify-between">
            <div className="font-mono text-sm font-semibold">{g.key}</div>
            <button
              type="button"
              onClick={() => openCreate(g.key)}
              className="text-sm px-3 py-1.5 rounded-md border border-neutral-300 hover:bg-neutral-50"
            >
              + Versi baru
            </button>
          </header>
          <div className="divide-y divide-neutral-100">
            {g.versions.map((v) => (
              <details key={v.id} className="p-5 group">
                <summary className="cursor-pointer flex items-center justify-between gap-3 list-none">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-sm font-medium">{v.version}</span>
                    {v.isActive ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                        Active
                      </span>
                    ) : null}
                    {v.description ? (
                      <span className="text-xs text-neutral-500 truncate">{v.description}</span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-neutral-500">
                      {new Date(v.createdAt).toLocaleString("id-ID")}
                    </span>
                    {!v.isActive ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={(e) => {
                          e.preventDefault();
                          activate(v.id, g.key, v.version);
                        }}
                        className="text-xs px-2 py-1 rounded-md bg-neutral-900 text-white"
                      >
                        Activate
                      </button>
                    ) : null}
                  </div>
                </summary>
                <pre className="mt-3 text-xs bg-neutral-50 rounded p-3 max-h-96 overflow-auto whitespace-pre-wrap font-mono">
                  {v.content}
                </pre>
              </details>
            ))}
          </div>
        </section>
      ))}

      {groups.length === 0 ? (
        <p className="text-sm text-neutral-500">Belum ada prompt. Buat lewat seed Agent 7.</p>
      ) : null}

      {creating ? (
        <div
          role="dialog"
          aria-modal
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !busy && setCreating(null)}
        >
          <div
            className="bg-white rounded-xl w-full max-w-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b">
              <h2 className="font-semibold">Buat versi baru: {creating.key}</h2>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs font-semibold text-neutral-500 uppercase">Version</label>
                <input
                  className="mt-1 w-full text-sm border rounded px-2 py-1.5 font-mono"
                  value={newVersion}
                  onChange={(e) => setNewVersion(e.target.value)}
                  placeholder="v2"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-neutral-500 uppercase">
                  Description (opsional)
                </label>
                <input
                  className="mt-1 w-full text-sm border rounded px-2 py-1.5"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-neutral-500 uppercase">Content</label>
                <textarea
                  className="mt-1 w-full h-64 text-xs border rounded p-2 font-mono"
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                />
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-2 bg-neutral-50">
              <button
                type="button"
                disabled={busy}
                onClick={() => setCreating(null)}
                className="text-sm px-3 py-1.5 rounded-md border border-neutral-300 hover:bg-white"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={saveNew}
                className="text-sm px-3 py-1.5 rounded-md bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-50"
              >
                {busy ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
