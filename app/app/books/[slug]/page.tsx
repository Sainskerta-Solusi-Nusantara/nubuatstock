import Link from "next/link";
import { BookOpen, ArrowLeft, ArrowRight, Download, Menu } from "lucide-react";
import { PublicNav } from "@/components/landing/PublicNav";
import { Footer } from "@/components/landing/Footer";

const BOOKS_MAP: Record<string, { title: string; file: string; jilid: number; chapters: string[] }> = {
  "1": {
    jilid: 1,
    title: "Basic — Dari Nol Jadi Trader IHSG",
    file: "/jilid-1-basic.pdf",
    chapters: [
      "Pendahuluan: Kenapa IHSG?",
      "Mengenal Pasar Modal Indonesia",
      "Fundamental Analysis Dasar",
      "Technical Analysis Dasar",
      "Pengenalan Bandarmology",
      "Psikologi Trading Pemula",
      "Risk Management 101",
      "Panduan Memulai Trading",
      "Studi Kasus",
      "Kesimpulan & Next Step",
    ],
  },
  "2": {
    jilid: 2,
    title: "Intermediate — Dari Trader Biasa Jadi Profesional",
    file: "/jilid-2-intermediate.pdf",
    chapters: [
      "Review Jilid 1 & Mindset Level Up",
      "Fundamental Analysis Intermediate",
      "Technical Analysis Intermediate",
      "Volume Analysis & Orderflow",
      "Bandarmology Intermediate",
      "Strategi Scalping IHSG",
      "Strategi Swing Trading IHSG",
      "Strategi Investing IHSG",
      "Portofolio Management",
      "Risk Management Intermediate",
      "Market Timing & Siklus",
      "Psikologi Trading Lanjutan",
      "Kesimpulan",
    ],
  },
  "3": {
    jilid: 3,
    title: "Pro — Master Trader IHSG",
    file: "/jilid-3-pro.pdf",
    chapters: [
      "Mindset Master Trader",
      "Institutional Analysis",
      "Advanced Bandarmology",
      "Advance Technical Analysis",
      "Advance Fundamental Analysis",
      "Sistem Trading Profesional",
      "Algorithmic Trading Concepts",
      "Risk Management Profesional",
      "Makro Ekonomi & Geopolitik",
      "Portofolio Institusi",
      "Sektor Deep Dive IHSG",
      "Studi Kasus Master Trader",
      "Membangun NubuatStock",
      "Kesimpulan",
    ],
  },
};

export function generateStaticParams() {
  return [{ slug: "1" }, { slug: "2" }, { slug: "3" }];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const book = BOOKS_MAP[slug];
  if (!book) return { title: "Buku tidak ditemukan — Nubuat" };
  return {
    title: `Baca Jilid ${book.jilid} ${book.title} — Nubuat`,
    description: `Baca online buku trading IHSG jilid ${book.jilid}: ${book.title}`,
  };
}

export default async function BookReaderPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const book = BOOKS_MAP[slug];
  if (!book) {
    return (
      <main className="min-h-screen bg-slate-950 pt-24 text-center">
        <PublicNav />
        <div className="mx-auto max-w-md px-4 py-20">
          <BookOpen className="mx-auto mb-4 h-12 w-12 text-slate-600" />
          <h1 className="mb-2 text-2xl font-bold text-white">Buku Tidak Ditemukan</h1>
          <p className="mb-6 text-slate-400">Jilid yang kamu cari gak ada.</p>
          <Link href="/books" className="text-blue-400 hover:underline">
            ← Kembali ke daftar buku
          </Link>
        </div>
        <Footer />
      </main>
    );
  }

  const prev = book.jilid > 1 ? String(book.jilid - 1) : null;
  const next = book.jilid < 3 ? String(book.jilid + 1) : null;

  return (
    <main className="min-h-screen bg-slate-950">
      <PublicNav />

      {/* Top Bar */}
      <div className="sticky top-0 z-50 border-b border-slate-800 bg-slate-900/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/books" className="text-slate-400 hover:text-white transition">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <p className="text-xs text-blue-400 font-medium">Jilid {book.jilid}</p>
              <p className="text-sm text-white font-medium leading-tight">{book.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={book.file}
              download
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 transition"
            >
              <Download className="h-3.5 w-3.5" />
              Download PDF
            </a>
          </div>
        </div>
      </div>

      {/* Reader */}
      <div className="mx-auto flex max-w-6xl">
        {/* Sidebar — Daftar Isi */}
        <aside className="hidden w-64 shrink-0 border-r border-slate-800 p-4 lg:block">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Daftar Isi</h3>
          <nav className="space-y-1">
            {book.chapters.map((chapter, i) => (
              <button
                key={i}
                className="w-full rounded-lg px-3 py-2 text-left text-xs text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
              >
                <span className="mr-2 text-slate-600">{(i + 1).toString().padStart(2, "0")}</span>
                {chapter}
              </button>
            ))}
          </nav>
        </aside>

        {/* PDF Viewer */}
        <div className="flex-1">
          <div className="h-[calc(100vh-120px)] w-full">
            <iframe
              src={`${book.file}#view=FitH&navpanes=0`}
              className="h-full w-full"
              title={book.title}
            />
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="border-t border-slate-800 bg-slate-900/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div>
            {prev ? (
              <Link
                href={`/books/${prev}`}
                className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition"
              >
                <ArrowLeft className="h-4 w-4" />
                Jilid {prev}: {BOOKS_MAP[prev]?.title?.split(" — ")[0]}
              </Link>
            ) : (
              <div />
            )}
          </div>
          <Link href="/books" className="text-xs text-slate-500 hover:text-slate-300 transition">
            Semua Jilid
          </Link>
          <div>
            {next ? (
              <Link
                href={`/books/${next}`}
                className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition"
              >
                Jilid {next}: {BOOKS_MAP[next]?.title?.split(" — ")[0]}
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <div />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
