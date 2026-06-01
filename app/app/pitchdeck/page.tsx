import type { Metadata } from "next";
import Link from "next/link";
import { Lock } from "lucide-react";
import { verifyShareToken } from "@/lib/pitchdeck/share";
import { buildDeckSlides } from "@/lib/pitchdeck/deck";
import { SlideDeck } from "@/components/pitchdeck/SlideDeck";

export const dynamic = "force-dynamic";

// Halaman ini sengaja TIDAK diindeks — hanya untuk yang punya link share.
export const metadata: Metadata = {
  title: "Pitchdeck",
  robots: { index: false, follow: false },
};

export default async function PublicPitchdeckPage({
  searchParams,
}: {
  searchParams: Promise<{ k?: string }>;
}) {
  const { k } = await searchParams;

  if (!verifyShareToken(k)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0c1117] px-6 text-center text-white">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/5">
          <Lock className="h-6 w-6 text-white/60" />
        </div>
        <h1 className="text-xl font-bold">Link tidak valid</h1>
        <p className="max-w-sm text-sm text-white/60">
          Pitchdeck ini hanya bisa dibuka lewat link berbagi yang sah. Minta link terbaru
          ke tim Nubuat.
        </p>
        <Link href="/" className="mt-2 text-sm font-medium text-primary hover:underline">
          ← Kembali ke beranda
        </Link>
      </div>
    );
  }

  const slides = buildDeckSlides();
  return <SlideDeck slides={slides} />;
}
