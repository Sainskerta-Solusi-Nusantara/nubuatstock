"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  userId: string;
  email: string;
  name: string | null;
  whatsapp: string | null;
  telegram: string | null;
  isSelf: boolean;
}

export function UserRowActions({ userId, email, name, whatsapp, telegram, isSelf }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: name ?? "",
    whatsapp: whatsapp ?? "",
    telegram: telegram ?? "",
  });

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/superadmin/users/${userId}/profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data?.error?.message ?? "Gagal menyimpan");
      toast.success(`Profil ${email} tersimpan`);
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    }
    setSaving(false);
  }

  async function remove() {
    if (
      !confirm(
        `Hapus user ${email}? Akun di-nonaktifkan (soft-delete) & sesinya dicabut. Tindakan tercatat di audit log.`,
      )
    )
      return;
    try {
      const res = await fetch(`/api/superadmin/users/${userId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data?.error?.message ?? "Gagal menghapus");
      toast.success(`User ${email} dihapus`);
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <div className="inline-flex items-center gap-1">
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)} title="Edit profil">
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={remove}
        disabled={isSelf}
        title={isSelf ? "Tidak bisa hapus akun sendiri" : "Hapus user"}
        className="text-destructive hover:text-destructive disabled:opacity-40"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription className="truncate font-mono text-xs">{email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Field label="Nama">
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </Field>
            <Field label="Nomor WhatsApp">
              <input
                value={form.whatsapp}
                onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value }))}
                placeholder="08xxxxxxxxxx"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </Field>
            <Field label="Telegram (opsional)">
              <input
                value={form.telegram}
                onChange={(e) => setForm((f) => ({ ...f, telegram: e.target.value }))}
                placeholder="@username"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
              Batal
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Menyimpan…" : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
