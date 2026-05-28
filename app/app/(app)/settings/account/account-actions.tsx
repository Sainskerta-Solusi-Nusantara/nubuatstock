"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, Loader2, Trash2 } from "lucide-react";

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
          "Akun dijadwalkan untuk dihapus. Anda akan keluar otomatis.",
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
          <AlertDialogTitle>Hapus akun Anda?</AlertDialogTitle>
          <AlertDialogDescription>
            Akun akan dinonaktifkan sekarang dan dihapus permanen setelah 30 hari
            (masa tenggang). Selama masa tenggang, Anda bisa membatalkan dengan
            login kembali. Setelah 30 hari, seluruh data Anda akan dihapus dan
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
