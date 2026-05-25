"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, Eye, Trash2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ReportSection {
  key: string;
  title: string;
  content: string;
  order: number;
}

export interface ResearchFormData {
  id?: string;
  slug?: string;
  title: string;
  companyKode: string | null;
  reportType: string;
  rating: string;
  timeHorizon: string;
  currentPriceAtPublish: string;
  targetPrice: string;
  summary: string;
  keyHighlights: string[];
  catalysts: string[];
  riskFactors: string[];
  sections: ReportSection[];
  valuationMethod: string;
  tags: string[];
  minTierRequired: string;
  status: string;
}

const EMPTY: ResearchFormData = {
  title: "",
  companyKode: "",
  reportType: "update",
  rating: "buy",
  timeHorizon: "medium_3_12m",
  currentPriceAtPublish: "",
  targetPrice: "",
  summary: "",
  keyHighlights: [],
  catalysts: [],
  riskFactors: [],
  sections: [
    { key: "thesis", title: "Investment Thesis", content: "", order: 1 },
    { key: "valuation", title: "Valuation Detail", content: "", order: 2 },
  ],
  valuationMethod: "",
  tags: [],
  minTierRequired: "free",
  status: "draft",
};

export function ResearchForm({ initial }: { initial?: ResearchFormData }) {
  const router = useRouter();
  const [data, setData] = useState<ResearchFormData>(initial ?? EMPTY);
  const [saving, setSaving] = useState(false);
  const [_isPending, startTransition] = useTransition();

  const isEdit = !!data.id;

  function update<K extends keyof ResearchFormData>(key: K, value: ResearchFormData[K]) {
    setData((prev) => ({ ...prev, [key]: value }));
  }

  async function save(targetStatus?: "draft" | "review" | "published") {
    if (!data.title.trim()) return toast.error("Judul wajib diisi");
    if (!data.summary.trim()) return toast.error("Ringkasan eksekutif wajib diisi");

    setSaving(true);
    try {
      const payload = { ...data, status: targetStatus ?? data.status };
      const url = isEdit ? `/api/admin/research/${data.id}` : "/api/admin/research";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json?.error?.message ?? "Gagal");

      toast.success(isEdit ? "Tersimpan" : "Riset dibuat");
      if (!isEdit) {
        router.push(`/admin/research/${json.data.id}/edit`);
      } else {
        startTransition(() => router.refresh());
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteReport() {
    if (!isEdit) return;
    if (!confirm("Hapus riset ini? Soft-delete (bisa di-restore via DB).")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/research/${data.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json?.error?.message ?? "Gagal");
      toast.success("Riset dihapus");
      router.push("/admin/research");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isEdit ? "Edit Riset" : "Riset Baru"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isEdit ? `Slug: /${data.slug}` : "Slug otomatis di-generate dari judul + ticker."}
          </p>
        </div>
        <div className="flex gap-2">
          {isEdit && data.status === "published" && data.slug && (
            <Button variant="outline" asChild>
              <a href={`/research/${data.slug}`} target="_blank">
                <Eye className="mr-1.5 h-4 w-4" />Live
              </a>
            </Button>
          )}
          <Button variant="outline" disabled={saving} onClick={() => save("draft")}>
            <Save className="mr-1.5 h-4 w-4" />Save Draft
          </Button>
          <Button disabled={saving} onClick={() => save("published")}>
            {saving ? "Saving..." : isEdit ? "Update & Publish" : "Save & Publish"}
          </Button>
          {isEdit && (
            <Button variant="ghost" size="sm" onClick={deleteReport}>
              <Trash2 className="h-4 w-4 text-bear" />
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Main content */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Identitas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Judul (wajib)" required>
                <input
                  value={data.title}
                  onChange={(e) => update("title", e.target.value)}
                  placeholder="Contoh: BBRI · Update Q1 — NIM Solid, Pertahankan BUY"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Ticker (kode emiten)">
                  <input
                    value={data.companyKode ?? ""}
                    onChange={(e) => update("companyKode", e.target.value.toUpperCase() || null)}
                    placeholder="BBRI"
                    maxLength={5}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm uppercase"
                  />
                </Field>
                <Field label="Tipe">
                  <select
                    value={data.reportType}
                    onChange={(e) => update("reportType", e.target.value)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="initiation">Initiation</option>
                    <option value="update">Update</option>
                    <option value="earnings_review">Earnings Review</option>
                    <option value="thematic">Thematic</option>
                    <option value="sector">Sector</option>
                    <option value="macro">Macro</option>
                    <option value="flash">Flash Note</option>
                  </select>
                </Field>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ringkasan & Highlights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Ringkasan Eksekutif (wajib)" required>
                <textarea
                  value={data.summary}
                  onChange={(e) => update("summary", e.target.value)}
                  rows={4}
                  placeholder="1-2 paragraf intisari analisa..."
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </Field>

              <ArrayField
                label="Key Highlights (3-5 bullet poin)"
                items={data.keyHighlights}
                onChange={(v) => update("keyHighlights", v)}
                placeholder="Misal: NIM Q1 stabil di 7.8%, di atas konsensus"
              />

              <ArrayField
                label="Katalis"
                items={data.catalysts}
                onChange={(v) => update("catalysts", v)}
                placeholder="Misal: BI rate cut Q2 2026"
              />

              <ArrayField
                label="Risk Factors"
                items={data.riskFactors}
                onChange={(v) => update("riskFactors", v)}
                placeholder="Misal: NPL spike di segmen mikro"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sections (Body)</CardTitle>
              <p className="text-xs text-muted-foreground">
                Format Markdown. Akan di-render sebagai paragraf di detail page & PDF.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.sections.map((s, idx) => (
                <div key={idx} className="space-y-2 rounded-md border border-border p-3">
                  <div className="flex items-center gap-2">
                    <input
                      value={s.title}
                      onChange={(e) => {
                        const next = [...data.sections];
                        next[idx]!.title = e.target.value;
                        update("sections", next);
                      }}
                      placeholder="Judul section"
                      className="flex-1 rounded-md border border-input bg-background px-2 py-1 text-sm font-semibold"
                    />
                    <input
                      value={s.key}
                      onChange={(e) => {
                        const next = [...data.sections];
                        next[idx]!.key = e.target.value;
                        update("sections", next);
                      }}
                      placeholder="key (slug)"
                      className="w-32 rounded-md border border-input bg-background px-2 py-1 font-mono text-xs"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => update("sections", data.sections.filter((_, i) => i !== idx))}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <textarea
                    value={s.content}
                    onChange={(e) => {
                      const next = [...data.sections];
                      next[idx]!.content = e.target.value;
                      update("sections", next);
                    }}
                    rows={6}
                    placeholder="Markdown content..."
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  update("sections", [
                    ...data.sections,
                    { key: `section-${data.sections.length + 1}`, title: "New Section", content: "", order: data.sections.length + 1 },
                  ])
                }
              >
                <Plus className="mr-1 h-3.5 w-3.5" />Tambah Section
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Valuasi</CardTitle>
            </CardHeader>
            <CardContent>
              <Field label="Metodologi">
                <input
                  value={data.valuationMethod}
                  onChange={(e) => update("valuationMethod", e.target.value)}
                  placeholder="Misal: DCF (WACC 11%), atau Blended P/BV + DDM"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </Field>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Rekomendasi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Field label="Rating">
                <select
                  value={data.rating}
                  onChange={(e) => update("rating", e.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="strong_buy">Strong Buy</option>
                  <option value="buy">Buy</option>
                  <option value="hold">Hold</option>
                  <option value="sell">Sell</option>
                  <option value="strong_sell">Strong Sell</option>
                  <option value="not_rated">Not Rated</option>
                </select>
              </Field>

              <Field label="Time Horizon">
                <select
                  value={data.timeHorizon}
                  onChange={(e) => update("timeHorizon", e.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="short_1_3m">1–3 bulan</option>
                  <option value="medium_3_12m">3–12 bulan</option>
                  <option value="long_12m_plus">12+ bulan</option>
                </select>
              </Field>

              <Field label="Harga Saat Publish (Rp)">
                <input
                  type="number"
                  value={data.currentPriceAtPublish}
                  onChange={(e) => update("currentPriceAtPublish", e.target.value)}
                  placeholder="4700"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm"
                />
              </Field>

              <Field label="Target Price (Rp)">
                <input
                  type="number"
                  value={data.targetPrice}
                  onChange={(e) => update("targetPrice", e.target.value)}
                  placeholder="5400"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm"
                />
              </Field>

              {data.currentPriceAtPublish && data.targetPrice && (
                <div className="rounded-md border border-border bg-accent/30 px-3 py-2 text-xs">
                  <span className="text-muted-foreground">Upside: </span>
                  <span className="font-mono font-semibold">
                    {(((Number(data.targetPrice) - Number(data.currentPriceAtPublish)) / Number(data.currentPriceAtPublish)) * 100).toFixed(2)}%
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Distribusi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Field label="Akses Minimal">
                <select
                  value={data.minTierRequired}
                  onChange={(e) => update("minTierRequired", e.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="free">Free (semua)</option>
                  <option value="starter">Starter+</option>
                  <option value="pro">Pro+</option>
                  <option value="elite">Elite only</option>
                </select>
              </Field>

              <Field label="Tags (pisah dengan koma)">
                <input
                  value={data.tags.join(", ")}
                  onChange={(e) => update("tags", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
                  placeholder="banking, blue-chip, dividend-yielder"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </Field>

              <div>
                <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Status saat ini</div>
                <Badge variant="outline" className="mt-1 capitalize">{data.status}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
        {label} {required && <span className="text-bear">*</span>}
      </label>
      {children}
    </div>
  );
}

function ArrayField({
  label, items, onChange, placeholder,
}: {
  label: string;
  items: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</label>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2">
            <input
              value={item}
              onChange={(e) => {
                const next = [...items];
                next[i] = e.target.value;
                onChange(next);
              }}
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <Button variant="ghost" size="sm" onClick={() => onChange(items.filter((_, j) => j !== i))}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange([...items, ""])}
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          Tambah
        </Button>
        {placeholder && items.length === 0 && (
          <p className="text-[11px] text-muted-foreground italic">{placeholder}</p>
        )}
      </div>
    </div>
  );
}
