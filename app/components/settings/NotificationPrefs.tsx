"use client";

import * as React from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface Prefs {
  inAppEnabled: boolean;
  emailEnabled: boolean;
  whatsappEnabled: boolean;
  whatsappConsentAt: string | null;
  alertsEnabled: boolean;
  dailyPicksEnabled: boolean;
  newsEnabled: boolean;
  quietHoursStart: number | null;
  quietHoursEnd: number | null;
  dailyCap: number;
}

export function NotificationPrefs({
  initial,
  phone,
}: {
  initial: Prefs;
  phone: string | null;
}) {
  const [prefs, setPrefs] = React.useState<Prefs>(initial);
  const [saving, setSaving] = React.useState(false);

  async function save(patch: Partial<Prefs>) {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    setSaving(true);
    try {
      const res = await fetch("/api/notifications/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data?.error?.message ?? "Gagal menyimpan");
      setPrefs((p) => ({ ...p, ...data.data }));
    } catch (err) {
      toast.error((err as Error).message);
      setPrefs(prefs); // revert
    }
    setSaving(false);
  }

  function Row({
    label,
    desc,
    checked,
    onChange,
    disabled,
  }: {
    label: string;
    desc?: string;
    checked: boolean;
    onChange: (v: boolean) => void;
    disabled?: boolean;
  }) {
    return (
      <div className="flex items-start justify-between gap-4 py-3">
        <div className="min-w-0">
          <Label className="text-sm font-medium">{label}</Label>
          {desc && <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>}
        </div>
        <Switch checked={checked} onCheckedChange={onChange} disabled={disabled || saving} />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifikasi & WhatsApp</CardTitle>
        <CardDescription>
          Atur kanal & jenis notifikasi. Alert WhatsApp dikirim hanya kalau kamu opt-in —
          tanpa spam, hormati jam tenang & batas harian.
        </CardDescription>
      </CardHeader>
      <CardContent className="divide-y divide-border">
        {/* Kanal */}
        <div className="pb-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kanal</p>
        </div>
        <Row
          label="Dalam aplikasi"
          desc="Notifikasi di lonceng & feed aplikasi."
          checked={prefs.inAppEnabled}
          onChange={(v) => save({ inAppEnabled: v })}
        />
        <Row
          label="Email"
          desc="Kirim ke email akunmu."
          checked={prefs.emailEnabled}
          onChange={(v) => save({ emailEnabled: v })}
        />
        <div className="py-3">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Label className="text-sm font-medium">WhatsApp</Label>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {phone
                  ? `Kirim alert ke ${phone}. Dengan mengaktifkan, kamu setuju menerima notifikasi WhatsApp dari Nubuat.`
                  : "Nomor WhatsApp belum ada — lengkapi di Pengaturan Akun dulu."}
              </p>
            </div>
            <Switch
              checked={prefs.whatsappEnabled}
              onCheckedChange={(v) => save({ whatsappEnabled: v })}
              disabled={!phone || saving}
            />
          </div>
        </div>

        {/* Jenis notifikasi */}
        <div className="pb-2 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Jenis notifikasi
          </p>
        </div>
        <Row
          label="Alert harga"
          desc="Saat alert yang kamu pasang ter-trigger."
          checked={prefs.alertsEnabled}
          onChange={(v) => save({ alertsEnabled: v })}
        />
        <Row
          label="Daily Picks"
          desc="Saham pilihan harian."
          checked={prefs.dailyPicksEnabled}
          onChange={(v) => save({ dailyPicksEnabled: v })}
        />
        <Row
          label="Berita"
          desc="Berita penting emiten di watchlist."
          checked={prefs.newsEnabled}
          onChange={(v) => save({ newsEnabled: v })}
        />

        {/* Anti-spam */}
        <div className="pb-2 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Anti-spam
          </p>
        </div>
        <div className="grid gap-4 py-3 sm:grid-cols-3">
          <div>
            <Label className="text-xs text-muted-foreground">Jam tenang mulai (WIB)</Label>
            <HourSelect
              value={prefs.quietHoursStart}
              onChange={(v) => save({ quietHoursStart: v })}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Jam tenang selesai (WIB)</Label>
            <HourSelect value={prefs.quietHoursEnd} onChange={(v) => save({ quietHoursEnd: v })} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Maks alert WA/hari</Label>
            <input
              type="number"
              min={0}
              max={100}
              value={prefs.dailyCap}
              onChange={(e) => save({ dailyCap: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })}
              disabled={saving}
              className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
          </div>
        </div>
        <p className="pt-2 text-xs text-muted-foreground">
          Jam tenang: notifikasi WhatsApp ditahan di rentang jam ini. Set sama (mis. 0 & 0) untuk
          menonaktifkan. Batas harian 0 = tanpa batas.
        </p>
      </CardContent>
    </Card>
  );
}

function HourSelect({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
      className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
    >
      <option value="">—</option>
      {Array.from({ length: 24 }, (_, h) => (
        <option key={h} value={h}>
          {String(h).padStart(2, "0")}:00
        </option>
      ))}
    </select>
  );
}
