import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Archive } from "lucide-react";
import { Footer } from "@/components/landing/Footer";
import { PickDisclaimer } from "@/components/picks/PickDisclaimer";
import { getArchiveMonth, listArchiveMonths } from "@/lib/picks/archive";
import { MonthBlock } from "../_components";

/**
 * `/picks-archive/[month]` — detail satu bulan ("YYYY-MM").
 * Halaman deep-link SEO untuk track record per bulan. PUBLIK + ISR.
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const revalidate = 3600;
// Bulan baru selesai tiap awal bulan → izinkan param di luar yang di-prerender.
export const dynamicParams = true;

export async function generateStaticParams(): Promise<{ month: string }[]> {
  const months = await listArchiveMonths();
  return months.map((m) => ({ month: m.month }));
}

interface PageProps {
  params: Promise<{ month: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { month } = await params;
  const data = await getArchiveMonth(month);
  if (!data) {
    return { title: "Arsip Daily Picks — Nubuat", robots: "noindex,follow" };
  }
  const title = `Daily Picks ${data.monthLabel} — Hasil & Hit-Rate | Nubuat`;
  const description = `Track record Daily Picks saham IDX periode ${data.monthLabel}: ${data.aggregate.totalPicks} picks dengan return T+1/T+5/T+20 dan hit-rate Take Profit/Stop Loss. Data edukasi, bukan ajakan jual/beli (POJK 5/2024).`;
  return {
    title,
    description,
    alternates: { canonical: `${APP_URL}/picks-archive/${month}` },
    openGraph: {
      title,
      description,
      url: `${APP_URL}/picks-archive/${month}`,
      siteName: "Nubuat",
      locale: "id_ID",
      type: "article",
    },
    twitter: { card: "summary_large_image", title, description },
    robots: "index,follow",
  };
}

export default async function ArchiveMonthPage({ params }: PageProps) {
  const { month } = await params;
  const data = await getArchiveMonth(month);
  if (!data) notFound();

  return (
    <main className="bg-background text-foreground">
      <section className="border-b border-border bg-gradient-to-b from-primary/5 to-transparent py-12">
        <div className="mx-auto max-w-4xl px-4">
          <Link
            href="/picks-archive"
            className="text-xs text-muted-foreground hover:underline"
          >
            ← Semua arsip
          </Link>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <Archive className="h-3.5 w-3.5 text-primary" />
            Arsip Daily Picks
          </div>
          <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">
            Daily Picks — {data.monthLabel}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
            {data.aggregate.totalPicks} pick dipublikasikan pada periode ini, dievaluasi otomatis
            pada T+1, T+5, dan T+20 hari bursa.
          </p>
          <div className="mt-5">
            <PickDisclaimer variant="banner" withLink />
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto max-w-4xl space-y-8 px-4">
          <MonthBlock month={data} />
          <div className="border-t border-border pt-6">
            <PickDisclaimer variant="footer" withLink />
          </div>
        </div>
      </section>

      <Footer
        appName="Nubuat"
        tagline="Nubie Berbuat — pemula yang terus bertumbuh."
        supportEmail="support@nubuat.id"
        disclaimer="Data historis bersifat edukasi — bukan ajakan jual/beli. Kinerja masa lalu bukan jaminan masa depan."
        imageCredits="Image credits: Unsplash"
      />
    </main>
  );
}
