import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Compass,
  Bot,
  Activity,
  TrendingUp,
  Landmark,
  Eye,
  ListChecks,
  Search,
  GraduationCap,
  HeartHandshake,
  Sprout,
  ShieldAlert,
} from "lucide-react";
import { Footer } from "@/components/landing/Footer";
import { PublicNav } from "@/components/landing/PublicNav";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  title: "Tentang Nubuat — Teman Bertumbuh Trader Ritel Indonesia",
  description:
    "Nubuat hadir bukan cuma kasih sinyal beli/jual, tapi jadi teman seperjalanan kamu bertumbuh jadi trader & investor yang disiplin dan paham. Analisis multi-lensa (Technical, Fundamental, Bandarmology), AI Copilot berbahasa Indonesia, Elliott Wave otomatis, dan Daily Picks transparan untuk saham IDX.",
  keywords: [
    "tentang nubuat",
    "aplikasi analisis saham indonesia",
    "trader ritel indonesia",
    "elliott wave otomatis",
    "AI copilot saham",
    "analisis teknikal fundamental bandarmology",
    "daily picks saham IDX",
    "belajar saham disiplin",
  ],
  alternates: { canonical: `${APP_URL}/about` },
  openGraph: {
    title: "Tentang Nubuat — Teman Bertumbuh Trader Ritel Indonesia",
    description:
      "Nubie (pemula) harus Berbuat, harus terus tumbuh. Nubuat jadi teman seperjalanan kamu: analisis multi-lensa, AI Copilot berbahasa Indonesia, Elliott Wave otomatis, dan Daily Picks transparan.",
    url: `${APP_URL}/about`,
    siteName: "Nubuat",
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tentang Nubuat — Teman Bertumbuh Trader Ritel Indonesia",
    description:
      "Bukan sekadar sinyal beli/jual. Nubuat adalah teman seperjalanan kamu bertumbuh jadi trader & investor yang disiplin dan paham.",
  },
  robots: "index,follow",
};

interface Advantage {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  badge?: string;
}

const ADVANTAGES: Advantage[] = [
  {
    icon: Eye,
    title: "Analisis Multi-Lensa",
    description:
      "Satu emiten kamu lihat dari tiga sudut sekaligus: Technical (struktur harga & momentum), Fundamental (kesehatan & valuasi bisnis), dan Bandarmology (jejak akumulasi/distribusi pemain besar). Keputusan jadi lebih utuh, bukan cuma tebak-tebakan dari satu indikator.",
  },
  {
    icon: Bot,
    title: "AI Copilot Berbahasa Indonesia",
    description:
      "Copilot yang menjelaskan keputusannya dengan bahasa yang kamu pahami — bukan jargon yang bikin pusing. Tanya kenapa sebuah saham dapat verdict tertentu, dan kamu dapat alasannya, bukan sekadar angka.",
  },
  {
    icon: TrendingUp,
    title: "Elliott Wave Otomatis",
    description:
      "Wave count yang dihitung otomatis lengkap dengan target Fibonacci — diferensiator yang belum dimiliki kompetitor. Kamu bisa membaca struktur gelombang harga tanpa harus jago menggambar manual.",
    badge: "DIFERENSIATOR",
  },
  {
    icon: ListChecks,
    title: "Daily Picks Transparan",
    description:
      "Rekomendasi harian dengan Support/Resistance, Stop Loss, dan Take Profit yang jelas di depan. Kamu tahu persis di mana batas risikomu sebelum masuk — bukan sekadar disuruh beli lalu ditinggal.",
  },
  {
    icon: Search,
    title: "Screener yang Membumi",
    description:
      "Saring ratusan emiten IDX dengan filter teknikal dan fundamental untuk menemukan kandidat yang sesuai gayamu. Discovery jadi terarah, bukan asal scroll watchlist orang lain.",
  },
  {
    icon: GraduationCap,
    title: "Fokus Edukasi & Transparansi",
    description:
      "Kami tidak jualan mimpi cepat kaya. Setiap analisis dibuka alasannya supaya kamu belajar pola pikirnya, bukan cuma menyalin hasilnya. Tujuannya satu: kamu jadi makin paham, makin mandiri.",
  },
];

const PROBLEMS = [
  "Nyangkut di harga atas karena masuk tanpa rencana keluar.",
  "Telat cut loss — berharap balik modal, malah makin dalam.",
  "Ikut pom-pom grup dan influencer tanpa tahu dasarnya.",
  "Trauma dan kapok, padahal yang kurang cuma proses & disiplin.",
];

function OrganizationJsonLd() {
  const json = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Nubuat",
    url: APP_URL,
    description:
      "Aplikasi analisis saham Indonesia (IDX) untuk trader & investor ritel. Analisis multi-lensa (Technical, Fundamental, Bandarmology), AI Copilot berbahasa Indonesia, Elliott Wave otomatis, dan Daily Picks transparan.",
    slogan: "Nubie Berbuat — pemula yang terus bertumbuh.",
    email: "support@nubuat.id",
    foundingLocation: {
      "@type": "Country",
      name: "Indonesia",
    },
    areaServed: "ID",
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}

export default function AboutPage() {
  return (
    <main className="bg-background text-foreground">
      <PublicNav />
      <OrganizationJsonLd />

      {/* Hero / Visi */}
      <section className="border-b border-border bg-gradient-to-b from-primary/5 to-transparent py-20">
        <div className="mx-auto max-w-4xl px-4">
          <Link href="/" className="text-xs text-muted-foreground hover:underline">
            ← Kembali ke Beranda
          </Link>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <Compass className="h-3.5 w-3.5 text-primary" />
            Tentang Nubuat
          </div>
          <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">
            Teman seperjalanan kamu bertumbuh di pasar saham.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Nama <strong className="text-foreground">Nubuat</strong> lahir dari satu keyakinan
            sederhana: <em>Nubie (pemula) harus Berbuat, harus terus tumbuh.</em> Kami bukan
            sekadar mesin pemberi sinyal beli/jual — kami ingin jadi tempat kamu belajar, berproses,
            dan jadi trader serta investor yang disiplin dan paham.
          </p>
        </div>
      </section>

      {/* Masalah */}
      <section className="border-b border-border py-16">
        <div className="mx-auto max-w-4xl px-4">
          <div className="flex items-center gap-2 text-bear">
            <ShieldAlert className="h-5 w-5" />
            <span className="text-sm font-semibold uppercase tracking-wide">Masalahnya</span>
          </div>
          <h2 className="mt-3 text-3xl font-bold tracking-tight">
            Mayoritas trader ritel Indonesia kalah — dan banyak yang trauma.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
            Secara statistik, sebagian besar trader dan investor ritel di Indonesia berakhir rugi.
            Bukan karena mereka tidak pintar, tapi karena pola yang berulang terus menerus:
          </p>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {PROBLEMS.map((p) => (
              <li
                key={p}
                className="flex items-start gap-3 rounded-lg border border-border bg-card p-4 text-sm leading-relaxed text-muted-foreground"
              >
                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-bear/10 text-xs font-bold text-bear">
                  !
                </span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground">
            Akhirnya banyak yang kapok dan berhenti — padahal yang sebenarnya kurang bukan
            keberanian, melainkan proses dan teman yang menemani belajar.
          </p>
        </div>
      </section>

      {/* Solusi / Kehadiran Nubuat */}
      <section className="border-b border-border bg-card/40 py-16">
        <div className="mx-auto max-w-4xl px-4">
          <div className="flex items-center gap-2 text-primary">
            <HeartHandshake className="h-5 w-5" />
            <span className="text-sm font-semibold uppercase tracking-wide">Kehadiran Nubuat</span>
          </div>
          <h2 className="mt-3 text-3xl font-bold tracking-tight">
            Bukan dukun sinyal. Teman bertumbuh.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
            Banyak layanan menjanjikan sinyal beli/jual instan, lalu meninggalkan kamu sendirian saat
            harga bergerak melawan. Nubuat memilih jalan yang berbeda. Kami percaya kamu pantas tahu{" "}
            <strong className="text-foreground">kenapa</strong> sebuah keputusan diambil — supaya
            lama-lama kamu bisa mengambil keputusanmu sendiri dengan percaya diri.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-background p-6">
              <Sprout className="h-6 w-6 text-primary" />
              <h3 className="mt-3 text-lg font-bold">Tempat untuk terus bertumbuh</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Setiap fitur dirancang agar kamu makin paham — bukan makin tergantung. Dari pemula
                yang sering nyangkut, menuju trader yang punya rencana dan disiplin.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-background p-6">
              <Landmark className="h-6 w-6 text-primary" />
              <h3 className="mt-3 text-lg font-bold">Berpijak pada data, bukan hype</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Kami merangkai Technical, Fundamental, dan Bandarmology jadi gambaran utuh, lalu
                menjelaskannya dengan jujur — termasuk saat sinyalnya memang tidak meyakinkan.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Keunggulan */}
      <section className="border-b border-border py-16">
        <div className="mx-auto max-w-5xl px-4">
          <div className="flex items-center gap-2 text-primary">
            <Activity className="h-5 w-5" />
            <span className="text-sm font-semibold uppercase tracking-wide">Yang kami bawa</span>
          </div>
          <h2 className="mt-3 text-3xl font-bold tracking-tight">
            Alat yang membuat kamu lebih paham, bukan lebih bingung.
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ADVANTAGES.map((a) => {
              const Icon = a.icon;
              return (
                <div
                  key={a.title}
                  className="rounded-lg border border-border bg-card p-5 transition hover:border-primary/40 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    {a.badge && (
                      <span className="rounded-full bg-bull px-2 py-0.5 text-[9px] font-bold text-white">
                        {a.badge}
                      </span>
                    )}
                  </div>
                  <h3 className="mt-3 text-lg font-bold">{a.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {a.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-b border-border bg-primary/5 py-16">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-3xl font-bold tracking-tight">Yuk, tumbuh bareng.</h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Kamu tidak harus jalan sendirian lagi. Mulai dari satu emiten, satu analisis, satu
            keputusan yang lebih sadar — dan biarkan prosesnya membentukmu jadi trader yang lebih
            tenang dan disiplin.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              href="/signup?trial=starter"
              className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
            >
              Mulai Tumbuh Bareng <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/features"
              className="inline-flex h-11 items-center rounded-md border border-border bg-background px-6 text-sm font-semibold transition hover:bg-accent"
            >
              Lihat Fitur
            </Link>
          </div>
          <p className="mx-auto mt-8 max-w-xl text-xs leading-relaxed text-muted-foreground">
            Catatan: seluruh analisis di Nubuat bersifat edukasi dan bukan ajakan untuk membeli atau
            menjual efek. Keputusan investasi sepenuhnya ada di tangan kamu.
          </p>
        </div>
      </section>

      <Footer
        appName="Nubuat"
        tagline="Nubie Berbuat — pemula yang terus bertumbuh."
        supportEmail="support@nubuat.id"
        disclaimer="Informasi edukasi — bukan ajakan jual/beli."
        imageCredits="Image credits: Unsplash"
      />
    </main>
  );
}
