"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function TickerError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Server-side error sudah di-log via Pino. Di client biar browser console
    // expose stack untuk DX (production akan tetap tampilkan, tidak ada PII).
    // eslint-disable-next-line no-console
    console.error("Ticker page error:", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-2xl space-y-4 py-10">
      <Alert variant="destructive">
        <AlertTriangle aria-hidden />
        <AlertTitle>Gagal memuat halaman ticker</AlertTitle>
        <AlertDescription>
          Terjadi kesalahan saat mengambil data. Coba muat ulang atau kembali ke
          beranda.
          {error.digest && (
            <span className="ml-2 font-mono text-xs opacity-70">
              ref: {error.digest}
            </span>
          )}
        </AlertDescription>
      </Alert>
      <div className="flex gap-2">
        <Button onClick={reset}>Coba lagi</Button>
        <Button asChild variant="outline">
          <Link href="/">Kembali ke Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
