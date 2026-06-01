"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, Loader2, Trash2, Save, KeyRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const inputCls =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60";

/**
 * Form edit profil — ubah nama tampilan. Data awal dari Server Component (props),
 * per-request & TIDAK di-cache lintas user. Email read-only.
 */
export function ProfileForm({ initialName, email }: { initialName: string; email: string }) {
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const dirty = name.trim() !== initialName.trim();
  const canSave = dirty && name.trim().length >= 2 && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const res = await fetch("/api/account/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: name.trim() }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        toast.error(json?.error?.message ?? "Gagal menyimpan nama.");
        return;
      }
      toast.success("Nama berhasil diperbarui.");
      router.refresh();
    } catch {
      toast.error("Terjadi kesalahan saat menyimpan.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="profile-name" className="text-sm font-medium">
          Nama tampilan
        </label>
        <input
          id="profile-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          placeholder="Nama kamu"
          className={inputCls}
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="profile-email" className="text-sm font-medium">
          Email
        </label>
        <input id="profile-email" value={email} readOnly disabled className={inputCls} />
        <p className="text-xs text-muted-foreground">Email tidak dapat diubah.</p>
      </div>
      <Button onClick={handleSave} disabled={!canSave}>
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
        Simpan perubahan
      </Button>
    </div>
  );
}

/** Form ganti password (akun email/password). User Google-only akan dapat pesan jelas. */
export function ChangePasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  const canSave =
    current.length >= 1 && next.length >= 8 && confirm.length >= 1 && !saving;

  const handleSave = async () => {
    if (next !== confirm) {
      toast.error("Konfirmasi password tidak cocok.");
      return;
    }
    if (next.length < 8) {
      toast.error("Password baru minimal 8 karakter.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/account/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        toast.error(json?.error?.message ?? "Gagal mengubah password.");
        return;
      }
      toast.success("Password berhasil diubah. Sesi lain telah dikeluarkan.");
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch {
      toast.error("Terjadi kesalahan saat mengubah password.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="pw-current" className="text-sm font-medium">Password saat ini</label>
        <input id="pw-current" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} className={inputCls} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="pw-new" className="text-sm font-medium">Password baru</label>
          <input id="pw-new" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} className={inputCls} />
          <p className="text-xs text-muted-foreground">Minimal 8 karakter.</p>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="pw-confirm" className="text-sm font-medium">Ulangi password baru</label>
          <input id="pw-confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputCls} />
        </div>
      </div>
      <Button onClick={handleSave} disabled={!canSave}>
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
        Ubah password
      </Button>
    </div>
  );
}

/** Tombol "Ekspor data saya" — mengunduh dump JSON dari /api/account/export. */
export function ExportDataButton() {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/account/export", { method: "GET" });
      if (!res.ok) {
        let message = "Gagal mengekspor data.";
        try {
          const json = await res.json();
          message = json?.error?.message ?? message;
        } catch {
          /* non-JSON error */
        }
        toast.error(message);
        return;
      }
      const blob = await res.blob();
      const disposition = res.headers.get("content-disposition") ?? "";
      const match = /filename="?([^"]+)"?/.exec(disposition);
      const filename = match?.[1] ?? "nubuat-data-export.json";

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Data berhasil diekspor.");
    } catch {
      toast.error("Terjadi kesalahan saat mengekspor data.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" onClick={handleExport} disabled={loading}>
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Download className="mr-2 h-4 w-4" />
      )}
      Ekspor data saya
    </Button>
  );
}

/** Tombol "Hapus akun" dengan dialog konfirmasi → POST /api/account/delete. */
export function DeleteAccountButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        toast.error(json?.error?.message ?? "Gagal menghapus akun.");
        return;
      }
      toast.success(
        json?.data?.message ??
          "Akun dijadwalkan untuk dihapus. Kamu akan keluar otomatis.",
      );
      // Sesi sudah dicabut server-side; arahkan ke halaman publik.
      router.push("/");
      router.refresh();
    } catch {
      toast.error("Terjadi kesalahan saat menghapus akun.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" disabled={loading}>
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="mr-2 h-4 w-4" />
          )}
          Hapus akun
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus akun kamu?</AlertDialogTitle>
          <AlertDialogDescription>
            Akun akan dinonaktifkan sekarang dan dihapus permanen setelah 30 hari
            (masa tenggang). Selama masa tenggang, kamu bisa membatalkan dengan
            login kembali. Setelah 30 hari, seluruh data kamu akan dihapus dan
            tidak dapat dipulihkan.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Batal</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              void handleDelete();
            }}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Ya, hapus akun saya
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
