"use client";

import { useState } from "react";
import { toast } from "sonner";

interface GlossaryItem {
  id: string;
  slug: string;
  term: string;
  definition: string;
  category: string;
  aliases: string[];
  relatedSlugs: string[];
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

interface FormState {
  id: string | null; // null = create mode
  term: string;
  slug: string;
  definition: string;
  category: string;
  aliases: string; // comma-separated in the form
  relatedSlugs: string; // comma-separated in the form
  published: boolean;
}

function emptyForm(defaultCategory: string): FormState {
  return {
    id: null,
    term: "",
    slug: "",
    definition: "",
    category: defaultCategory,
    aliases: "",
    relatedSlugs: "",
    published: true,
  };
}

function toForm(item: GlossaryItem): FormState {
  return {
    id: item.id,
    term: item.term,
    slug: item.slug,
    definition: item.definition,
    category: item.category,
    aliases: item.aliases.join(", "),
    relatedSlugs: item.relatedSlugs.join(", "),
    published: item.published,
  };
}

function splitList(s: string): string[] {
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

export function GlossaryManager({
  items,
  categories,
}: {
  items: GlossaryItem[];
  categories: string[];
}) {
  const [form, setForm] = useState<FormState | null>(null);
  const [busy, setBusy] = useState(false);

  function openCreate() {
    setForm(emptyForm(categories[0] ?? "Umum"));
  }

  function openEdit(item: GlossaryItem) {
    setForm(toForm(item));
  }

  async function save() {
    if (!form) return;
    if (!form.term.trim() || !form.definition.trim()) {
      toast.error("Term dan definisi wajib diisi");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        term: form.term.trim(),
        definition: form.definition.trim(),
        category: form.category,
        slug: form.slug.trim() || undefined,
        aliases: splitList(form.aliases),
        relatedSlugs: splitList(form.relatedSlugs),
        published: form.published,
      };

      const isEdit = form.id !== null;
      const url = isEdit ? `/api/admin/glossary/${form.id}` : `/api/admin/glossary`;
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = (await res.json()) as { ok: boolean; error?: { message?: string } };
      if (!res.ok || !j.ok) throw new Error(j.error?.message ?? `HTTP ${res.status}`);
      toast.success(isEdit ? "Istilah diperbarui." : "Istilah ditambahkan.");
      setForm(null);
      if (typeof window !== "undefined") window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setBusy(false);
    }
  }

  async function togglePublished(item: GlossaryItem) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/glossary/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: !item.published }),
      });
      const j = (await res.json()) as { ok: boolean; error?: { message?: string } };
      if (!res.ok || !j.ok) throw new Error(j.error?.message ?? `HTTP ${res.status}`);
      toast.success(item.published ? "Disembunyikan (draft)." : "Dipublikasikan.");
      if (typeof window !== "undefined") window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengubah status");
    } finally {
      setBusy(false);
    }
  }

  async function remove(item: GlossaryItem) {
    if (!confirm(`Hapus istilah "${item.term}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/glossary/${item.id}`, { method: "DELETE" });
      const j = (await res.json()) as { ok: boolean; error?: { message?: string } };
      if (!res.ok || !j.ok) throw new Error(j.error?.message ?? `HTTP ${res.status}`);
      toast.success("Istilah dihapus.");
      if (typeof window !== "undefined") window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-500">{items.length} istilah</p>
        <button
          type="button"
          onClick={openCreate}
          className="text-sm px-3 py-1.5 rounded-md bg-neutral-900 text-white hover:bg-neutral-800"
        >
          + Tambah istilah
        </button>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs uppercase text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-semibold">Term</th>
              <th className="px-4 py-3 font-semibold">Slug</th>
              <th className="px-4 py-3 font-semibold">Kategori</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {items.map((item) => (
              <tr key={item.id} className="align-top">
                <td className="px-4 py-3">
                  <div className="font-medium text-neutral-900">{item.term}</div>
                  {item.aliases.length > 0 ? (
                    <div className="text-xs text-neutral-400 mt-0.5">
                      alias: {item.aliases.join(", ")}
                    </div>
                  ) : null}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-neutral-500">{item.slug}</td>
                <td className="px-4 py-3 text-neutral-600">{item.category}</td>
                <td className="px-4 py-3">
                  {item.published ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                      Published
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600">
                      Draft
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => togglePublished(item)}
                      className="text-xs px-2 py-1 rounded-md border border-neutral-300 hover:bg-neutral-50 disabled:opacity-50"
                    >
                      {item.published ? "Unpublish" : "Publish"}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => openEdit(item)}
                      className="text-xs px-2 py-1 rounded-md border border-neutral-300 hover:bg-neutral-50 disabled:opacity-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => remove(item)}
                      className="text-xs px-2 py-1 rounded-md border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      Hapus
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-neutral-500">
                  Belum ada istilah. Klik &ldquo;Tambah istilah&rdquo;.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {form ? (
        <div
          role="dialog"
          aria-modal
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !busy && setForm(null)}
        >
          <div
            className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b">
              <h2 className="font-semibold">
                {form.id ? "Edit istilah" : "Tambah istilah"}
              </h2>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs font-semibold text-neutral-500 uppercase">Term</label>
                <input
                  className="mt-1 w-full text-sm border rounded px-2 py-1.5"
                  value={form.term}
                  onChange={(e) => setForm({ ...form, term: e.target.value })}
                  placeholder="ARA"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-neutral-500 uppercase">
                  Slug (opsional — otomatis dari term bila kosong)
                </label>
                <input
                  className="mt-1 w-full text-sm border rounded px-2 py-1.5 font-mono"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="ara"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-neutral-500 uppercase">
                  Kategori
                </label>
                <select
                  className="mt-1 w-full text-sm border rounded px-2 py-1.5 bg-white"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-neutral-500 uppercase">
                  Definisi
                </label>
                <textarea
                  className="mt-1 w-full h-40 text-sm border rounded p-2"
                  value={form.definition}
                  onChange={(e) => setForm({ ...form, definition: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-neutral-500 uppercase">
                  Aliases (pisah dengan koma)
                </label>
                <input
                  className="mt-1 w-full text-sm border rounded px-2 py-1.5"
                  value={form.aliases}
                  onChange={(e) => setForm({ ...form, aliases: e.target.value })}
                  placeholder="Auto Reject Atas, batas atas"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-neutral-500 uppercase">
                  Related slugs (pisah dengan koma)
                </label>
                <input
                  className="mt-1 w-full text-sm border rounded px-2 py-1.5 font-mono"
                  value={form.relatedSlugs}
                  onChange={(e) => setForm({ ...form, relatedSlugs: e.target.value })}
                  placeholder="arb, auto-rejection"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-neutral-700">
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={(e) => setForm({ ...form, published: e.target.checked })}
                />
                Published (tampil di halaman publik)
              </label>
            </div>
            <div className="p-4 border-t flex justify-end gap-2 bg-neutral-50">
              <button
                type="button"
                disabled={busy}
                onClick={() => setForm(null)}
                className="text-sm px-3 py-1.5 rounded-md border border-neutral-300 hover:bg-white"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={save}
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
