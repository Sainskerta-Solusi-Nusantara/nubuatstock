"use client";

import { useState } from "react";
import { toast } from "sonner";

const TIERS = ["free", "starter", "pro", "elite", "institutional"] as const;
type Tier = (typeof TIERS)[number];

interface Props {
  userId: string;
  email: string;
  /** Tier aktif saat ini; null kalau belum punya subscription (anggap free). */
  currentTier: string | null;
}

export function UserTierEditor({ userId, email, currentTier }: Props) {
  const [tier, setTier] = useState<Tier>((currentTier as Tier) ?? "free");
  const [saving, setSaving] = useState(false);

  async function update(newTier: Tier) {
    if (newTier === tier) return;
    const confirmed = confirm(
      `Ubah tier ${email} dari "${tier}" → "${newTier}"?\n\nIni override manual tanpa pembayaran. Tercatat di audit log.`,
    );
    if (!confirmed) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/superadmin/users/${userId}/tier`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: newTier, reason: "Superadmin override (Users & Roles)" }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data?.error?.message ?? "Gagal");
      setTier(newTier);
      toast.success(`Tier ${email} → ${newTier}`);
    } catch (err) {
      toast.error((err as Error).message);
    }
    setSaving(false);
  }

  return (
    <select
      value={tier}
      disabled={saving}
      onChange={(e) => update(e.target.value as Tier)}
      aria-label={`Ubah tier ${email}`}
      className="h-8 rounded-md border border-input bg-background px-2 text-xs font-medium uppercase disabled:opacity-50"
    >
      {TIERS.map((t) => (
        <option key={t} value={t}>
          {t}
        </option>
      ))}
    </select>
  );
}
