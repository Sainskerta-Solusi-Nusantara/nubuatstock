"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Save, Bookmark, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface SavedScreen {
  id: string;
  name: string;
  description: string | null;
  filters: Record<string, string | undefined>;
  isAlert: boolean;
}

/**
 * Compact saved-screens manager untuk screener page.
 * - Dropdown to load saved screen
 * - "Save current" button to persist current URL filters
 * - Delete button per item
 */
export function SavedScreensManager() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [screens, setScreens] = useState<SavedScreen[]>([]);
  const [openSave, setOpenSave] = useState(false);
  const [openList, setOpenList] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    void fetch("/api/saved-screens")
      .then((r) => r.json())
      .then((d) => setScreens(d.data?.items ?? []))
      .catch(() => {});
  }, []);

  const currentFilters: Record<string, string | undefined> = {};
  searchParams.forEach((value, key) => {
    if (value) currentFilters[key] = value;
  });

  const saveCurrent = () => {
    if (!name.trim()) {
      toast.error("Nama wajib diisi");
      return;
    }
    if (Object.keys(currentFilters).length === 0) {
      toast.error("Tidak ada filter aktif untuk disimpan");
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch("/api/saved-screens", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim() || undefined,
            filters: currentFilters,
          }),
        });
        const data = await res.json();
        if (!data.ok) {
          toast.error(data.error?.message ?? "Save failed");
          return;
        }
        toast.success(`Screen "${name}" tersimpan`);
        // Refresh list
        const list = await fetch("/api/saved-screens").then((r) => r.json());
        setScreens(list.data?.items ?? []);
        setOpenSave(false);
        setName("");
        setDescription("");
      } catch {
        toast.error("Gagal save");
      }
    });
  };

  const loadScreen = (s: SavedScreen) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(s.filters)) {
      if (v != null) params.set(k, String(v));
    }
    router.push(`/screener?${params.toString()}`);
    setOpenList(false);
  };

  const deleteScreen = async (id: string) => {
    if (!confirm("Hapus saved screen ini?")) return;
    const res = await fetch(`/api/saved-screens?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setScreens((s) => s.filter((x) => x.id !== id));
      toast.success("Deleted");
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOpenList(true)}
          className="inline-flex items-center gap-1"
        >
          <Bookmark className="h-3.5 w-3.5" />
          My Screens ({screens.length})
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOpenSave(true)}
          disabled={Object.keys(currentFilters).length === 0}
          className="inline-flex items-center gap-1"
        >
          <Save className="h-3.5 w-3.5" />
          Save Current
        </Button>
      </div>

      {/* Save dialog */}
      {openSave && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setOpenSave(false)}
        >
          <div
            className="w-full max-w-md rounded-lg border border-border bg-card p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold">Save Current Screen</h2>
              <button onClick={() => setOpenSave(false)} aria-label="Close">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Nama screen
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="mis. Banking Q4 Setup"
                  maxLength={80}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Deskripsi (opsional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Catatan strategy ini..."
                  rows={2}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  maxLength={500}
                />
              </div>
              <div className="rounded-md bg-muted/40 p-2 text-[11px]">
                <strong>Filter aktif:</strong>
                <div className="mt-1 flex flex-wrap gap-1">
                  {Object.entries(currentFilters).map(([k, v]) => (
                    <span key={k} className="rounded bg-card px-1.5 py-0.5 font-mono text-[10px]">
                      {k}={v}
                    </span>
                  ))}
                </div>
              </div>
              <Button onClick={saveCurrent} disabled={isPending} className="w-full">
                {isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* List dialog */}
      {openList && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setOpenList(false)}
        >
          <div
            className="w-full max-w-md rounded-lg border border-border bg-card p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold">My Saved Screens</h2>
              <button onClick={() => setOpenList(false)} aria-label="Close">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            {screens.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">
                Belum ada saved screens. Setup filter, klik &quot;Save Current&quot; untuk simpan.
              </p>
            ) : (
              <ul className="space-y-2 max-h-[60vh] overflow-y-auto">
                {screens.map((s) => (
                  <li key={s.id} className="flex items-start gap-2 rounded-md border border-border p-3">
                    <button
                      onClick={() => loadScreen(s)}
                      className="flex-1 text-left"
                    >
                      <div className="font-semibold">{s.name}</div>
                      {s.description && (
                        <div className="mt-0.5 text-[11px] text-muted-foreground">{s.description}</div>
                      )}
                      <div className="mt-1 flex flex-wrap gap-1">
                        {Object.entries(s.filters).slice(0, 5).map(([k, v]) => (
                          <span key={k} className="rounded bg-muted px-1 py-0.5 text-[9px] font-mono">
                            {k}={String(v)}
                          </span>
                        ))}
                      </div>
                    </button>
                    <button
                      onClick={() => deleteScreen(s.id)}
                      className="text-muted-foreground hover:text-bear"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </>
  );
}
