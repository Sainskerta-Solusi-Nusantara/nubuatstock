import type { Metadata } from "next";
import Link from "next/link";
import { Archive } from "lucide-react";
import { Footer } from "@/components/landing/Footer";
import { PublicNav } from "@/components/landing/PublicNav";
import { PickDisclaimer } from "@/components/picks/PickDisclaimer";
import { getArchivePage } from "@/lib/picks/archive";
import { MonthBlock } from "./_components";

/**
 * `/picks-archive` — Arsip Daily Picks PUBLIK (IMPROVEMENT_PLAN §8.4 #28).
 *
 * Transparansi = trust: menampilkan picks bulan-bulan lampau beserta outcome
 * T+1 / T+5 / T+20 (return %, hit TP/SL) + agregat hit-rate per bulan.
 * Halaman ini PUBLIK & SEO-friendly (ISR), TANPA auth.
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const MONTHS_PER_PAGE = 3;

// ISR — refresh tiap jam; outcome di-update worker batch harian.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Arsip Daily Picks — Track Record Transparan | Nubuat",
  description:
    "Arsip lengkap Daily Picks saham IDX bulan-bulan lampau beserta hasilnya: return T+1/T+5/T+20, hit-rate Take Profit & Stop Loss. Transparansi penuh — kinerja masa lalu bukan jaminan masa depan. Data edukasi, bukan ajakan jual/beli (POJK 5/2024).",
  keywords: [
    "track record daily picks",
    "arsip rekomendasi saham",
    "hit rate saham IDX",
    "transparansi sinyal saham",
    "hasil daily picks nubuat",
    "return saham historis",
  ],
  alternates: { canonical: `${APP_URL}/picks-archive` },
  openGraph: {
    title: "Arsip Daily Picks — Track Record Transparan | Nubuat",
    description:
      "Lihat hasil Daily Picks bulan-bulan lampau: return T+1/T+5/T+20 & hit-rate TP/SL. Transparan apa adanya.",
    url: `${APP_URL}/picks-archive`,
    siteName: "Nubuat",
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Arsip Daily Picks — Track Record Transparan | Nubuat",
    description:
      "Hasil Daily Picks historis: return T+1/T+5/T+20 & hit-rate TP/SL. Transparan apa adanya.",
  },
  robots: "index,follow",
};

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function PicksArchivePage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const { months, hasMore, totalMonths } = await getArchivePage({
    page,
    monthsPerPage: MONTHS_PER_PAGE,
  });

  return (
    <main className="bg-background text-foreground">
      <PublicNav />
      <section className="border-b border-border bg-gradient-to-b from-primary/5 to-transparent py-14">
        <div className="mx-auto max-w-4xl px-4">
          <Link href="/" className="text-xs text-muted-foreground hover:underline">
            ← Kembali ke Beranda
          </Link>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <Archive className="h-3.5 w-3.5 text-primary" />
            Arsip Daily Picks
          </div>
          <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">
            Track record kami, apa adanya.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
            Setiap Daily Picks yang pernah kami publikasikan kami evaluasi otomatis pada{" "}
            <strong className="text-foreground">T+1, T+5, dan T+20</strong> hari bursa. Di bawah ini
            kamu bisa melihat hasilnya — return realisasi, kena Take Profit atau Stop Loss — beserta
            agregat hit-rate per bulan. Tanpa filter, tanpa cherry-picking.
          </p>
          <div className="mt-5">
            <PickDisclaimer variant="banner" withLink />
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto max-w-4xl space-y-12 px-4">
          {months.length === 0 ? (
            <div className="rounded-lg border border-border bg-card p-10 text-center">
              <p className="text-sm text-muted-foreground">
                Belum ada arsip Daily Picks lampau yang dapat ditampilkan. Cek lagi nanti, ya.
              </p>
            </div>
          ) : (
            months.map((m) => <MonthBlock key={m.month} month={m} withLink />)
          )}

          {/* Pagination by-month */}
          {totalMonths > MONTHS_PER_PAGE ? (
            <nav className="flex items-center justify-between border-t border-border pt-6 text-sm">
              {page > 1 ? (
                <Link
                  href={`/picks-archive?page=${page - 1}`}
                  className="font-medium text-primary hover:underline"
                >
                  ← Lebih baru
                </Link>
              ) : (
                <span />
              )}
              <span className="text-xs text-muted-foreground">Halaman {page}</span>
              {hasMore ? (
                <Link
                  href={`/picks-archive?page=${page + 1}`}
                  className="font-medium text-primary hover:underline"
                >
                  Lebih lama →
                </Link>
              ) : (
                <span />
              )}
            </nav>
          ) : null}

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
