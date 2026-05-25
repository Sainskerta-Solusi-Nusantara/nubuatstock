import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { DemoPlayer } from "@/components/demo/DemoPlayer";
import { Footer } from "@/components/landing/Footer";

export const metadata = {
  title: "Demo Interactive Player — Nubuat",
  description: "Walkthrough interaktif 8 scene: dari Morning Brief sampai Paper Trading. Auto-advance dengan narasi bahasa Indonesia.",
};

export default function DemoPlayPage() {
  return (
    <main className="bg-background">
      <section className="border-b border-border bg-gradient-to-b from-primary/5 to-transparent py-8">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link href="/demo" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:underline">
              <ArrowLeft className="h-3 w-3" /> Kembali ke Demo
            </Link>
            <Link
              href="/api/demo/script"
              target="_blank"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <Download className="h-3 w-3" /> Download Script (markdown)
            </Link>
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            🎬 Interactive Walkthrough
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Tur interaktif 8 scene Nubuat — auto-advance dengan narasi. Pause kapan saja, skip ke
            scene yang Anda inginkan, atau klik link untuk coba langsung di app real.
          </p>
        </div>
      </section>

      <section className="py-8">
        <div className="mx-auto max-w-7xl px-4">
          <DemoPlayer />

          <div className="mt-6 rounded-md border border-border bg-card/40 p-4 text-xs text-muted-foreground">
            <p>
              <strong>Catatan:</strong> Ini adalah interactive walkthrough — bukan video MP4.
              Animasi mockup di-render real-time dengan data sample. Untuk versi video record dengan voice-over,
              akan tersedia setelah produksi konten oleh tim marketing. Script lengkap tersedia di tombol Download di atas
              untuk referensi produksi.
            </p>
          </div>
        </div>
      </section>

      <Footer
        appName="Nubuat"
        tagline="Sains di balik setiap trade"
        supportEmail="support@nubuat.id"
        disclaimer="Informasi edukasi — bukan ajakan jual/beli."
        imageCredits="Image credits: Unsplash"
      />
    </main>
  );
}
