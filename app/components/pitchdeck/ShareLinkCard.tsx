"use client";

import * as React from "react";
import { Copy, Check, ExternalLink, Share2 } from "lucide-react";

/**
 * Kartu berbagi pitchdeck (di dashboard superadmin). Menampilkan link publik
 * mode slide 16:9 yang aman dibagikan — penerima HANYA bisa membuka pitchdeck,
 * tidak ada akses lain.
 */
export function ShareLinkCard({ url }: { url: string }) {
  const [copied, setCopied] = React.useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* abaikan — beberapa browser blok clipboard tanpa gesture */
    }
  }

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 print:hidden">
      <div className="flex items-center gap-2 text-sm font-semibold text-primary">
        <Share2 className="h-4 w-4" />
        Bagikan Pitchdeck (mode slide 16:9)
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Link publik di bawah hanya membuka <strong>pitchdeck mode presentasi</strong> — bisa
        navigasi pakai panah keyboard (←/→) dan diunduh ke PDF. Penerima tidak bisa mengakses
        bagian lain aplikasi.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          className="h-9 flex-1 rounded-md border border-border bg-background px-3 font-mono text-xs"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={copy}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-sm font-medium hover:bg-accent"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-bull" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Tersalin" : "Salin"}
          </button>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Buka
          </a>
        </div>
      </div>
    </div>
  );
}
