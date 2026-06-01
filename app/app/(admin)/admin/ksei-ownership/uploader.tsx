"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UploadCloud, Loader2 } from "lucide-react";

export function KseiUploader() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function upload() {
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/ksei/upload", { method: "POST", body: fd });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        toast.error(json?.error?.message ?? "Gagal mengunggah.");
        return;
      }
      toast.success(`Berhasil! Posisi ${json.data.posDate}: ${json.data.rowCount} emiten tersimpan.`);
      setFile(null);
      router.refresh();
    } catch {
      toast.error("Terjadi kesalahan saat mengunggah.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="file"
          accept=".txt,text/plain"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-neutral-100 file:px-3 file:py-1.5 file:text-sm file:font-medium"
        />
        <button
          type="button"
          onClick={upload}
          disabled={!file || busy}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
          Upload & Proses
        </button>
      </div>
      <p className="text-xs text-neutral-500">
        File <code>BalancePos&lt;tanggal&gt;.txt</code> (pipe-delimited) dari KSEI. Upload ulang
        tanggal sama akan menimpa data lama. Tanggal posisi dibaca otomatis dari isi file.
      </p>
    </div>
  );
}
