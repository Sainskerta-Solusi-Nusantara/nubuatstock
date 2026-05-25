"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ShieldCheck, ShieldAlert, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  userId: string;
  email: string;
  currentRole: string;
}

export function UsersRoleEditor({ userId, email, currentRole }: Props) {
  const [role, setRole] = useState(currentRole);
  const [saving, setSaving] = useState(false);

  async function update(newRole: string) {
    if (newRole === role) return;
    const confirmed = confirm(
      `Ubah role ${email} dari "${role}" → "${newRole}"?\n\nPerubahan akan dicatat di audit log.`,
    );
    if (!confirmed) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/superadmin/users/${userId}/role`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data?.error?.message ?? "Gagal");
      setRole(newRole);
      toast.success(`Role ${email} → ${newRole}`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="inline-flex items-center gap-1">
      <Button
        size="sm"
        variant={role === "user" ? "default" : "ghost"}
        disabled={saving}
        onClick={() => update("user")}
        title="Set sebagai User"
      >
        <UserIcon className="h-3 w-3" />
      </Button>
      <Button
        size="sm"
        variant={role === "admin" ? "default" : "ghost"}
        disabled={saving}
        onClick={() => update("admin")}
        title="Promote ke Admin"
      >
        <ShieldCheck className="h-3 w-3" />
      </Button>
      <Button
        size="sm"
        variant={role === "superadmin" ? "destructive" : "ghost"}
        disabled={saving}
        onClick={() => update("superadmin")}
        title="Promote ke Super Admin (HATI-HATI)"
      >
        <ShieldAlert className="h-3 w-3" />
      </Button>
    </div>
  );
}
