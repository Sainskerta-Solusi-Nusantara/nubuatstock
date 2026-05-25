"use client";

import { useState } from "react";
import { Save, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Entry {
  key: string;
  value: unknown;
  type: string;
  description: string | null;
}

interface Props {
  entries: Entry[];
}

export function LandingEditor({ entries }: Props) {
  const groups = groupByPrefix(entries);

  return (
    <div className="space-y-6">
      {Object.entries(groups).map(([section, items]) => (
        <Card key={section}>
          <CardHeader>
            <CardTitle className="capitalize">{section.replace("_", " ")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((entry) => (
              <EntryRow key={entry.key} entry={entry} />
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function EntryRow({ entry }: { entry: Entry }) {
  const [value, setValue] = useState<string>(
    entry.type === "json" ? JSON.stringify(entry.value, null, 2) : String(entry.value ?? ""),
  );
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  async function save() {
    setSaving(true);
    try {
      let parsedValue: unknown = value;
      if (entry.type === "json") {
        parsedValue = JSON.parse(value);
      } else if (entry.type === "number") {
        parsedValue = Number(value);
        if (Number.isNaN(parsedValue)) throw new Error("Bukan angka valid");
      } else if (entry.type === "boolean") {
        parsedValue = value === "true";
      }
      const res = await fetch(`/api/superadmin/landing`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: entry.key, value: parsedValue }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data?.error?.message ?? "Gagal simpan");
      toast.success(`Tersimpan: ${entry.key}`);
      setDirty(false);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <label className="block font-mono text-xs font-medium text-foreground">{entry.key}</label>
          {entry.description && (
            <p className="text-[11px] text-muted-foreground">{entry.description}</p>
          )}
        </div>
        <Button
          size="sm"
          variant={dirty ? "default" : "outline"}
          disabled={!dirty || saving}
          onClick={save}
          className="shrink-0"
        >
          {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          <span className="ml-1.5 text-xs">Simpan</span>
        </Button>
      </div>
      {entry.type === "json" ? (
        <textarea
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setDirty(true);
          }}
          rows={Math.min(20, value.split("\n").length + 1)}
          className="w-full rounded-md border border-input bg-background p-3 font-mono text-xs leading-relaxed"
          spellCheck={false}
        />
      ) : entry.type === "boolean" ? (
        <select
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setDirty(true);
          }}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      ) : value.length > 120 ? (
        <textarea
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setDirty(true);
          }}
          rows={3}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setDirty(true);
          }}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      )}
    </div>
  );
}

function groupByPrefix(entries: Entry[]): Record<string, Entry[]> {
  const out: Record<string, Entry[]> = {};
  for (const e of entries) {
    const parts = e.key.split(".");
    const group = parts[1] ?? "general"; // landing.<section>.xxx → section
    if (!out[group]) out[group] = [];
    out[group]!.push(e);
  }
  return out;
}
