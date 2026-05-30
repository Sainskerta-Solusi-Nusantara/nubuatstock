import Link from "next/link";
import { BookOpen, Download, Layers, TrendingUp, Shield, BarChart3, BookOpenText } from "lucide-react";
import { Footer } from "@/components/layout/Footer";
import { PublicNav } from "@/components/landing/PublicNav";

export const metadata = {
  title: "Buku Trading IHSG — Nubuat",
  description: "Unduh 3 jilid buku trading IHSG gratis: Basic, Intermediate, Pro. Lengkap fundamental, teknikal, bandarmology, scalping, swing, investing.",
};

const BOOKS = [
  {
    id: 1,
    title: "Basic",
    subtitle: "Dari Nol Jadi Trader IHSG",
    file: "/jilid-1-basic.pdf",
    icon: BookOpen,
    color: "from-green-500 to-emerald-700",
    badgeColor: "bg-green-600",
    pages: "10 Bab",
    level: "Pemula",
    desc: "Candlestick, S/R, MA, Volume, Fundamental Dasar (PER/PBV/DER), Bandarmology Dasar, Risk Management 1% Rule, Psikologi Pemula",
    topics: ["Candlestick", "Support & Resistance", "Moving Average", "PER/PBV/DER", "Risk Management"],
  },
  {
    id: 2,
    title: "Intermediate",
    subtitle: "Dari Trader Biasa Jadi Profesional",
    file: "/jilid-2-intermediate.pdf",
    icon: TrendingUp,
    color: "from-blue-500 to-blue-700",
    badgeColor: "bg-blue-600",
    pages: "13 Bab",
    level: "Intermediate",
    desc: "Chart Pattern, RSI/MACD/Bollinger, Ichimoku, Fibonacci, Volume Profile/VSA, Orderflow, Strategi Scalping/Swing/Investing",
    topics: ["Chart Pattern", "Indikator Lanjutan", "Volume Analysis", "Bandarmology", "Strategi Trading"],
  },
  {
    id: 3,
    title: "Pro",
    subtitle: "Master Trader IHSG",
    file: "/jilid-3-pro.pdf",
    icon: Shield,
    color: "from-purple-500 to-purple-800",
    badgeColor: "bg-purple-600",
    pages: "14 Bab",
    level: "Mahir",
    desc: "Institutional Analysis, Market Microstructure, Wyckoff, Orderflow, Elliott Wave, Harmonic Patterns, DCF, Sistem Trading Profesional",
    topics: ["Institutional", "Wyckoff Method", "Elliott Wave", "Sistem Trading", "Risk Pro"],
  },
];

export default function BooksPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <PublicNav />

      {/* Hero */}
      <section className="relative overflow-hidden pt-24 pb-16">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-6xl px-4 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-sm text-blue-300">
            <BookOpen className="h-4 w-4" />
            NubuatStock — 3 Jilid Buku Trading IHSG
          </div>
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Kuasai IHSG Dari Nol Sampai Pro
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-slate-400">
            Fundamental Analysis, Technical Analysis, Bandarmology, Scalping, Swing, Investing —
            semua lengkap dalam 3 jilid buku gratis.
          </p>
        </div>
      </section>

      {/* Books Grid */}
      <section className="pb-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid gap-8 md:grid-cols-3">
            {BOOKS.map((book) => (
              <div
                key={book.id}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur transition hover:border-slate-700 hover:shadow-xl hover:shadow-blue-500/5"
              >
                {/* Header */}
                <div className={`bg-gradient-to-br ${book.color} p-6`}>
                  <div className="mb-2 flex items-center justify-between">
                    <book.icon className="h-8 w-8 text-white/80" />
                    <span className={`rounded-full px-3 py-0.5 text-xs font-medium text-white ${book.badgeColor}`}>
                      {book.level}
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold text-white">Jilid {book.id}</h2>
                  <p className="text-sm text-white/70">{book.subtitle}</p>
                </div>

                {/* Body */}
                <div className="flex flex-1 flex-col p-6">
                  <div className="mb-4 flex items-center gap-4 text-sm text-slate-500">
                    <span className="flex items-center gap-1">
                      <Layers className="h-3.5 w-3.5" />
                      {book.pages}
                    </span>
                  </div>
                  <p className="mb-4 text-sm text-slate-400">{book.desc}</p>

                  {/* Topics */}
                  <div className="mb-6 flex flex-wrap gap-2">
                    {book.topics.map((topic) => (
                      <span
                        key={topic}
                        className="rounded-full border border-slate-700 bg-slate-800/50 px-2.5 py-0.5 text-xs text-slate-400"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>

                  {/* Spacer */}
                  <div className="flex-1" />

                  {/* Buttons */}
                  <div className="flex flex-col gap-2">
                    <Link
                      href={`/books/${book.id}`}
                      className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-500 active:scale-[0.98]"
                    >
                      <BookOpenText className="h-4 w-4" />
                      Baca Online
                    </Link>
                    <Link
                      href={book.file}
                      download
                      className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800 active:scale-[0.98]"
                    >
                      <Download className="h-4 w-4" />
                      Download PDF
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
