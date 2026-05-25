"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const CURRENT_VERSION = "v1";
const LS_KEY = `nubuat.disclaimer.${CURRENT_VERSION}.accepted`;

/**
 * Gate full-page yang muncul saat first login (atau setelah disclaimer version up).
 * User WAJIB centang dan klik Setuju sebelum bisa pakai dashboard.
 *
 * Fast path: localStorage cek versi accepted. Audit trail: POST ke
 * /api/legal/accept yang catat ke user_legal_acceptances table.
 *
 * Strategi server-side check: dilakukan di (app)/layout.tsx via
 * `hasAcceptedDisclaimer(userId)` helper. Komponen ini render kalau belum.
 */
export function AcceptDisclaimerGate({
  appName,
  disclaimer,
}: {
  appName: string;
  disclaimer: string;
}) {
  const [agree1, setAgree1] = useState(false);
  const [agree2, setAgree2] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Quick localStorage check on mount — kalau sudah accept di session ini, gate tidak muncul
  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem(LS_KEY) === "1") {
      // Sudah accept di browser ini — refresh untuk hilangkan gate (server-side cookie check akan resolve)
      // Server tetap re-prompt kalau DB belum punya record — pattern fail-safe.
    }
  }, []);

  async function handleAccept() {
    if (!agree1 || !agree2) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/legal/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version: CURRENT_VERSION, documents: ["disclaimer", "terms", "privacy"] }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data?.error?.message ?? "Gagal");
      localStorage.setItem(LS_KEY, "1");
      toast.success("Terima kasih. Selamat datang di " + appName);
      window.location.reload();
    } catch (err) {
      toast.error((err as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-background/95 backdrop-blur-sm">
      <div className="my-8 w-full max-w-2xl space-y-6 rounded-xl border border-border bg-card p-8 shadow-elevated">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-bear-soft text-bear">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Disclaimer & Persetujuan</h2>
            <p className="text-xs text-muted-foreground">Wajib dibaca sebelum mengakses {appName}</p>
          </div>
        </div>

        <div className="max-h-72 overflow-y-auto rounded-md border border-border bg-background p-4 text-sm leading-relaxed text-foreground/90">
          <p>{disclaimer}</p>
          <p className="mt-3">
            Untuk versi lengkap, baca:{" "}
            <Link href="/disclaimer" target="_blank" className="text-primary underline">Disclaimer Pasar Modal</Link> ·{" "}
            <Link href="/privacy" target="_blank" className="text-primary underline">Privacy Policy</Link> ·{" "}
            <Link href="/terms" target="_blank" className="text-primary underline">Syarat & Ketentuan</Link>
          </p>
        </div>

        <div className="space-y-3 text-sm">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agree1}
              onChange={(e) => setAgree1(e.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 rounded border-border accent-primary"
            />
            <span>
              Saya memahami bahwa semua analisa, Daily Picks, dan output AI di {appName} bersifat <strong>informasi & edukasi</strong>, <strong>bukan ajakan jual/beli efek</strong>, dan keputusan investasi sepenuhnya tanggung jawab saya pribadi.
            </span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agree2}
              onChange={(e) => setAgree2(e.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 rounded border-border accent-primary"
            />
            <span>
              Saya menyetujui <Link href="/terms" target="_blank" className="text-primary underline">Syarat & Ketentuan</Link>{" "}
              dan <Link href="/privacy" target="_blank" className="text-primary underline">Kebijakan Privasi</Link> Nubuat termasuk pemrosesan data pribadi saya sesuai UU PDP 27/2022.
            </span>
          </label>
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <Link
            href="/api/auth/sign-out"
            className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-secondary px-4 text-sm font-medium hover:bg-accent"
          >
            Tidak setuju, logout
          </Link>
          <Button
            disabled={!agree1 || !agree2 || submitting}
            onClick={handleAccept}
            className="h-10 px-6"
          >
            {submitting ? "Memproses..." : "Saya Setuju & Lanjut"}
          </Button>
        </div>
      </div>
    </div>
  );
}
