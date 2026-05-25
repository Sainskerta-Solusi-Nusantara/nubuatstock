"use client";

import { useState } from "react";
import { toast } from "sonner";

interface EntitlementItem {
  id: string;
  key: string;
  value: unknown;
  description: string | null;
}

interface TierRow {
  kode: string;
  nama: string;
  tagline: string | null;
  priceMonthlyIdr: number;
  priceAnnualIdr: number;
  trialDays: number;
  isPublic: boolean;
  isActive: boolean;
  sortOrder: number;
  features: string[];
  badge: string | null;
  ctaLabel: string | null;
  entitlements: EntitlementItem[];
}

function fmtIdr(n: number): string {
  return new Intl.NumberFormat("id-ID").format(n);
}

export function PricingManager({ tiers }: { tiers: TierRow[] }) {
  const [editingTier, setEditingTier] = useState<TierRow | null>(null);
  const [tierDraft, setTierDraft] = useState<Partial<TierRow>>({});
  const [editingEnt, setEditingEnt] = useState<{ tierKode: string; ent: EntitlementItem } | null>(
    null,
  );
  const [entDraft, setEntDraft] = useState<string>("");
  const [saving, setSaving] = useState(false);

  function openTier(t: TierRow) {
    setEditingTier(t);
    setTierDraft({
      nama: t.nama,
      tagline: t.tagline,
      priceMonthlyIdr: t.priceMonthlyIdr,
      priceAnnualIdr: t.priceAnnualIdr,
      trialDays: t.trialDays,
      isPublic: t.isPublic,
      isActive: t.isActive,
      features: t.features,
      badge: t.badge,
      ctaLabel: t.ctaLabel,
      sortOrder: t.sortOrder,
    });
  }

  async function saveTier() {
    if (!editingTier) return;
    if (!confirm(`Simpan perubahan tier ${editingTier.kode}? Berlaku untuk semua user.`)) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/tiers/${encodeURIComponent(editingTier.kode)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tierDraft),
      });
      const j = (await res.json()) as { ok: boolean; error?: { message?: string } };
      if (!res.ok || !j.ok) throw new Error(j.error?.message ?? `HTTP ${res.status}`);
      toast.success("Tier disimpan.");
      setEditingTier(null);
      if (typeof window !== "undefined") window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  function openEnt(tierKode: string, ent: EntitlementItem) {
    setEditingEnt({ tierKode, ent });
    setEntDraft(JSON.stringify(ent.value, null, 2));
  }

  async function saveEnt() {
    if (!editingEnt) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(entDraft);
    } catch {
      toast.error("Value bukan JSON valid");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(
        `/api/admin/tiers/${encodeURIComponent(editingEnt.tierKode)}/entitlements/${encodeURIComponent(editingEnt.ent.key)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value: parsed }),
        },
      );
      const j = (await res.json()) as { ok: boolean; error?: { message?: string } };
      if (!res.ok || !j.ok) throw new Error(j.error?.message ?? `HTTP ${res.status}`);
      toast.success("Entitlement disimpan.");
      setEditingEnt(null);
      if (typeof window !== "undefined") window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {tiers.map((t) => (
        <section key={t.kode} className="rounded-xl border border-neutral-200 bg-white">
          <header className="p-5 border-b flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="font-semibold capitalize">{t.nama}</h2>
                <span className="text-xs px-2 py-0.5 rounded bg-neutral-100">{t.kode}</span>
                {!t.isPublic ? (
                  <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                    Hidden
                  </span>
                ) : null}
                {!t.isActive ? (
                  <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-800">
                    Inactive
                  </span>
                ) : null}
              </div>
              <div className="text-xs text-neutral-500 mt-1">{t.tagline ?? "—"}</div>
              <div className="text-sm mt-2">
                <span className="font-medium">Rp {fmtIdr(t.priceMonthlyIdr)}</span>
                <span className="text-neutral-500"> /bulan · </span>
                <span className="font-medium">Rp {fmtIdr(t.priceAnnualIdr)}</span>
                <span className="text-neutral-500"> /tahun</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => openTier(t)}
              className="text-sm px-3 py-1.5 rounded-md border border-neutral-300 hover:bg-neutral-50"
            >
              Edit Tier
            </button>
          </header>

          <div className="p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-2">
              Entitlements
            </h3>
            {t.entitlements.length === 0 ? (
              <p className="text-sm text-neutral-500">Belum ada entitlement.</p>
            ) : (
              <div className="divide-y divide-neutral-100">
                {t.entitlements.map((e) => (
                  <div key={e.id} className="py-2 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-mono text-xs font-medium">{e.key}</div>
                      {e.description ? (
                        <div className="text-xs text-neutral-500">{e.description}</div>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-neutral-50 rounded px-2 py-1 max-w-[280px] truncate">
                        {JSON.stringify(e.value)}
                      </code>
                      <button
                        type="button"
                        onClick={() => openEnt(t.kode, e)}
                        className="text-xs px-2 py-1 rounded-md border border-neutral-300 hover:bg-neutral-50"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      ))}

      {editingTier ? (
        <div
          role="dialog"
          aria-modal
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !saving && setEditingTier(null)}
        >
          <div
            className="bg-white rounded-xl w-full max-w-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b">
              <h2 className="font-semibold">Edit Tier: {editingTier.kode}</h2>
            </div>
            <div className="p-5 space-y-3 max-h-[70vh] overflow-auto">
              <Field label="Nama">
                <input
                  className="w-full text-sm border rounded px-2 py-1.5"
                  value={tierDraft.nama ?? ""}
                  onChange={(e) => setTierDraft((d) => ({ ...d, nama: e.target.value }))}
                />
              </Field>
              <Field label="Tagline">
                <input
                  className="w-full text-sm border rounded px-2 py-1.5"
                  value={tierDraft.tagline ?? ""}
                  onChange={(e) => setTierDraft((d) => ({ ...d, tagline: e.target.value }))}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Harga /bulan (IDR)">
                  <input
                    type="number"
                    className="w-full text-sm border rounded px-2 py-1.5"
                    value={tierDraft.priceMonthlyIdr ?? 0}
                    onChange={(e) =>
                      setTierDraft((d) => ({ ...d, priceMonthlyIdr: Number(e.target.value) }))
                    }
                  />
                </Field>
                <Field label="Harga /tahun (IDR)">
                  <input
                    type="number"
                    className="w-full text-sm border rounded px-2 py-1.5"
                    value={tierDraft.priceAnnualIdr ?? 0}
                    onChange={(e) =>
                      setTierDraft((d) => ({ ...d, priceAnnualIdr: Number(e.target.value) }))
                    }
                  />
                </Field>
                <Field label="Trial Days">
                  <input
                    type="number"
                    className="w-full text-sm border rounded px-2 py-1.5"
                    value={tierDraft.trialDays ?? 0}
                    onChange={(e) =>
                      setTierDraft((d) => ({ ...d, trialDays: Number(e.target.value) }))
                    }
                  />
                </Field>
                <Field label="Sort Order">
                  <input
                    type="number"
                    className="w-full text-sm border rounded px-2 py-1.5"
                    value={tierDraft.sortOrder ?? 0}
                    onChange={(e) =>
                      setTierDraft((d) => ({ ...d, sortOrder: Number(e.target.value) }))
                    }
                  />
                </Field>
              </div>
              <Field label="Features (JSON array)">
                <textarea
                  className="w-full text-sm border rounded px-2 py-1.5 font-mono h-24"
                  value={JSON.stringify(tierDraft.features ?? [], null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      if (Array.isArray(parsed)) {
                        setTierDraft((d) => ({ ...d, features: parsed as string[] }));
                      }
                    } catch {
                      /* ignore until valid */
                    }
                  }}
                />
              </Field>
              <div className="flex gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={tierDraft.isPublic ?? true}
                    onChange={(e) => setTierDraft((d) => ({ ...d, isPublic: e.target.checked }))}
                  />
                  Public
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={tierDraft.isActive ?? true}
                    onChange={(e) => setTierDraft((d) => ({ ...d, isActive: e.target.checked }))}
                  />
                  Active
                </label>
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-2 bg-neutral-50">
              <button
                type="button"
                disabled={saving}
                onClick={() => setEditingTier(null)}
                className="text-sm px-3 py-1.5 rounded-md border border-neutral-300 hover:bg-white"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={saveTier}
                className="text-sm px-3 py-1.5 rounded-md bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-50"
              >
                {saving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editingEnt ? (
        <div
          role="dialog"
          aria-modal
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !saving && setEditingEnt(null)}
        >
          <div
            className="bg-white rounded-xl w-full max-w-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b">
              <h2 className="font-semibold font-mono text-sm">{editingEnt.ent.key}</h2>
              <div className="text-xs text-neutral-500 mt-1">Tier: {editingEnt.tierKode}</div>
            </div>
            <div className="p-5">
              <label className="text-xs font-semibold text-neutral-500 uppercase">Value (JSON)</label>
              <textarea
                className="mt-1 w-full h-32 font-mono text-xs border rounded p-2"
                value={entDraft}
                onChange={(e) => setEntDraft(e.target.value)}
              />
            </div>
            <div className="p-4 border-t flex justify-end gap-2 bg-neutral-50">
              <button
                type="button"
                disabled={saving}
                onClick={() => setEditingEnt(null)}
                className="text-sm px-3 py-1.5 rounded-md border border-neutral-300 hover:bg-white"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={saveEnt}
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
        {label}
      </label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
