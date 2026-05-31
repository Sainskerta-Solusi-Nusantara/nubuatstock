import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, desc } from "drizzle-orm";

import { db } from "@/lib/db";
import { companies } from "@/db/schema/companies";
import { companyFundamentals } from "@/db/schema/fundamentals";
import { quotesEod } from "@/db/schema/market";
import { sectors, subSectors, papanListing } from "@/db/schema/reference";

// ISR: regenerate tiap jam — ramah crawler, data tetap segar tanpa render per-request.
export const revalidate = 3600;

type Params = { params: Promise<{ kode: string }> };

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

type CompanyRow = {
  kode: string;
  nama: string;
  sektorNama: string | null;
  subSektorNama: string | null;
  papanNama: string | null;
  logoUrl: string | null;
  deskripsi: string | null;
  website: string | null;
  marketCapIdr: string | null;
  isSyariah: boolean;
};

type FundamentalRow = {
  per: string | null;
  pbv: string | null;
  roe: string | null;
  roa: string | null;
  der: string | null;
  eps: string | null;
  dividendYield: string | null;
  marketCapIdr: string | null;
};

async function getCompanyRow(kode: string): Promise<CompanyRow | null> {
  const rows = await db
    .select({
      kode: companies.kode,
      nama: companies.namaPerusahaan,
      sektorNama: sectors.namaId,
      subSektorNama: subSectors.namaId,
      papanNama: papanListing.nama,
      logoUrl: companies.logoUrl,
      deskripsi: companies.deskripsi,
      website: companies.website,
      marketCapIdr: companies.marketCapIdr,
      isSyariah: companies.isSyariah,
    })
    .from(companies)
    .leftJoin(sectors, eq(companies.sectorKode, sectors.kode))
    .leftJoin(subSectors, eq(companies.subSectorKode, subSectors.kode))
    .leftJoin(papanListing, eq(companies.papanKode, papanListing.kode))
    .where(eq(companies.kode, kode))
    .limit(1);
  return rows[0] ?? null;
}

async function getLatestQuote(kode: string): Promise<{
  last: number | null;
  prev: number | null;
  tradeDate: string | null;
}> {
  const rows = await db
    .select({
      close: quotesEod.close,
      prevClose: quotesEod.prevClose,
      tradeDate: quotesEod.tradeDate,
    })
    .from(quotesEod)
    .where(eq(quotesEod.companyKode, kode))
    .orderBy(desc(quotesEod.tradeDate))
    .limit(1);
  const r = rows[0];
  return {
    last: r?.close != null ? Number(r.close) : null,
    prev: r?.prevClose != null ? Number(r.prevClose) : null,
    tradeDate: r?.tradeDate ?? null,
  };
}

async function getFundamental(kode: string): Promise<FundamentalRow | null> {
  const rows = await db
    .select({
      per: companyFundamentals.peRatioTrailing,
      pbv: companyFundamentals.pbvRatio,
      roe: companyFundamentals.roe,
      roa: companyFundamentals.roa,
      der: companyFundamentals.debtToEquity,
      eps: companyFundamentals.eps,
      dividendYield: companyFundamentals.dividendYield,
      marketCapIdr: companyFundamentals.marketCapIdr,
    })
    .from(companyFundamentals)
    .where(eq(companyFundamentals.companyKode, kode))
    .orderBy(desc(companyFundamentals.fetchedAt))
    .limit(1);
  return rows[0] ?? null;
}

function fmtPrice(n: number | null): string {
  if (n == null) return "-";
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(n);
}

function fmtNum(s: string | null, suffix = ""): string {
  if (s == null) return "-";
  const n = Number(s);
  if (!Number.isFinite(n)) return "-";
  return `${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(n)}${suffix}`;
}

function fmtMarketCap(s: string | null): string {
  if (s == null) return "-";
  const n = Number(s);
  if (!Number.isFinite(n)) return "-";
  if (n >= 1e12) return `Rp ${(n / 1e12).toFixed(2)} T`;
  if (n >= 1e9) return `Rp ${(n / 1e9).toFixed(2)} M`;
  if (n >= 1e6) return `Rp ${(n / 1e6).toFixed(2)} Jt`;
  return `Rp ${fmtPrice(n)}`;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { kode: raw } = await params;
  const kode = raw.toUpperCase();
  const c = await getCompanyRow(kode).catch(() => null);

  if (!c) {
    return { title: `Saham ${kode} — Nubuat` };
  }

  const nama = c.nama;
  const sektor = c.sektorNama ?? "IDX";
  const title = `Analisis Saham ${kode} ${nama} — Harga, Fundamental | Nubuat`;
  const description = `Harga saham ${kode} (${nama}) terkini, fundamental (PER, PBV, ROE, market cap), dan profil emiten sektor ${sektor} di Bursa Efek Indonesia. Pantau pergerakan saham ${kode} di Nubuat.`;
  const url = `/saham/${kode}`;

  return {
    title,
    description,
    keywords: [
      kode,
      `saham ${kode}`,
      `harga saham ${kode}`,
      `analisis saham ${kode}`,
      nama,
      `fundamental ${kode}`,
      c.isSyariah ? `saham syariah ${kode}` : null,
      "saham IDX",
      "Bursa Efek Indonesia",
      "Nubuat",
    ].filter((k): k is string => Boolean(k)),
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      title,
      description: `Harga & fundamental saham ${kode} (${nama}) — sektor ${sektor}.`,
      siteName: "Nubuat",
      locale: "id_ID",
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function PublicSahamPage({ params }: Params) {
  const { kode: raw } = await params;
  const kode = raw.toUpperCase();
  const c = await getCompanyRow(kode);
  if (!c) notFound();

  const [quote, fund] = await Promise.all([
    getLatestQuote(kode),
    getFundamental(kode),
  ]);

  const nama = c.nama;
  const tickerUrl = `${SITE_URL}/saham/${kode}`;

  let change: number | null = null;
  let changePct: number | null = null;
  if (quote.last != null && quote.prev != null && quote.prev !== 0) {
    change = quote.last - quote.prev;
    changePct = (change / quote.prev) * 100;
  }
  const up = change != null && change > 0;
  const down = change != null && change < 0;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Corporation",
        name: nama,
        tickerSymbol: kode,
        url: tickerUrl,
        ...(c.website ? { sameAs: c.website } : {}),
        ...(c.logoUrl ? { logo: c.logoUrl } : {}),
        ...(c.deskripsi ? { description: c.deskripsi } : {}),
        ...(c.sektorNama ? { industry: c.sektorNama } : {}),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Nubuat", item: SITE_URL },
          {
            "@type": "ListItem",
            position: 2,
            name: "Saham IDX",
            item: `${SITE_URL}/saham`,
          },
          { "@type": "ListItem", position: 3, name: kode, item: tickerUrl },
        ],
      },
    ],
  };

  const metrics: Array<{ label: string; value: string }> = [
    { label: "PER", value: fmtNum(fund?.per ?? null, "x") },
    { label: "PBV", value: fmtNum(fund?.pbv ?? null, "x") },
    { label: "ROE", value: fmtNum(fund?.roe ?? null, "%") },
    { label: "ROA", value: fmtNum(fund?.roa ?? null, "%") },
    { label: "DER", value: fmtNum(fund?.der ?? null, "x") },
    { label: "EPS", value: fmtNum(fund?.eps ?? null) },
    { label: "Dividend Yield", value: fmtNum(fund?.dividendYield ?? null, "%") },
    {
      label: "Market Cap",
      value: fmtMarketCap(fund?.marketCapIdr ?? c.marketCapIdr),
    },
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:py-14">
        {/* Breadcrumb */}
        <nav className="mb-6 text-sm text-slate-400" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-slate-200">
            Nubuat
          </Link>
          <span className="mx-2">/</span>
          <Link href="/saham" className="hover:text-slate-200">
            Saham IDX
          </Link>
          <span className="mx-2">/</span>
          <span className="text-slate-200">{kode}</span>
        </nav>

        {/* Header emiten */}
        <header className="flex items-start gap-4">
          {c.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={c.logoUrl}
              alt={`Logo ${nama}`}
              width={64}
              height={64}
              className="h-16 w-16 rounded-lg bg-white object-contain p-1"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-slate-800 text-xl font-bold text-slate-300">
              {kode.slice(0, 2)}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-bold leading-tight sm:text-3xl">
              {kode}{" "}
              <span className="font-medium text-slate-300">{nama}</span>
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              {[c.sektorNama, c.subSektorNama, c.papanNama]
                .filter(Boolean)
                .join(" · ") || "Bursa Efek Indonesia"}
              {c.isSyariah ? " · Syariah" : ""}
            </p>
          </div>
        </header>

        {/* Harga */}
        <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="text-sm text-slate-400">Harga terakhir</div>
          <div className="mt-1 flex flex-wrap items-baseline gap-3">
            <span className="text-4xl font-bold tabular-nums">
              {quote.last != null ? `Rp ${fmtPrice(quote.last)}` : "-"}
            </span>
            {change != null && changePct != null ? (
              <span
                className={`text-lg font-semibold tabular-nums ${
                  up
                    ? "text-emerald-400"
                    : down
                      ? "text-rose-400"
                      : "text-slate-300"
                }`}
              >
                {up ? "+" : ""}
                {fmtPrice(change)} ({up ? "+" : ""}
                {changePct.toFixed(2)}%)
              </span>
            ) : null}
          </div>
          {quote.tradeDate ? (
            <div className="mt-2 text-xs text-slate-500">
              Penutupan{" "}
              {new Date(quote.tradeDate).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </div>
          ) : null}
        </section>

        {/* Fundamental */}
        <section className="mt-8">
          <h2 className="mb-4 text-lg font-semibold">Ringkasan Fundamental</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {metrics.map((m) => (
              <div
                key={m.label}
                className="rounded-lg border border-slate-800 bg-slate-900/40 p-4"
              >
                <div className="text-xs text-slate-400">{m.label}</div>
                <div className="mt-1 text-lg font-semibold tabular-nums">
                  {m.value}
                </div>
              </div>
            ))}
          </div>
          {!fund ? (
            <p className="mt-2 text-xs text-slate-500">
              Data fundamental untuk emiten ini belum lengkap.
            </p>
          ) : null}
        </section>

        {/* Deskripsi */}
        {c.deskripsi ? (
          <section className="mt-8">
            <h2 className="mb-3 text-lg font-semibold">Tentang {nama}</h2>
            <p className="text-sm leading-relaxed text-slate-300">
              {c.deskripsi}
            </p>
            {c.website ? (
              <a
                href={c.website}
                target="_blank"
                rel="nofollow noopener noreferrer"
                className="mt-3 inline-block text-sm text-sky-400 hover:text-sky-300"
              >
                Situs resmi perusahaan
              </a>
            ) : null}
          </section>
        ) : null}

        {/* CTA — pancingan daftar */}
        <section className="mt-10 rounded-xl border border-sky-800/60 bg-gradient-to-br from-sky-950/60 to-slate-900 p-6 sm:p-8">
          <h2 className="text-xl font-bold">
            Lihat analisis lengkap saham {kode}
          </h2>
          <p className="mt-2 text-sm text-slate-300">
            Verdict AI, Elliott Wave count, bandarmology (aliran dana bandar),
            dan sinyal teknikal untuk {nama} tersedia untuk member Nubuat.
          </p>
          <ul className="mt-4 grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
            <li>✓ Verdict beli/jual berbasis AI</li>
            <li>✓ Elliott Wave count + chart</li>
            <li>✓ Bandarmology (akumulasi/distribusi)</li>
            <li>✓ Watchlist & notifikasi harga</li>
          </ul>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="rounded-lg bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-400"
            >
              Daftar gratis
            </Link>
            <Link
              href="/login"
              className="rounded-lg border border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-800"
            >
              Sudah punya akun? Masuk
            </Link>
          </div>
        </section>

        <footer className="mt-12 border-t border-slate-800 pt-6 text-xs text-slate-500">
          <p>
            Data harga & fundamental {kode} bersifat informatif dan bisa
            tertunda. Bukan rekomendasi jual/beli. Jelajahi{" "}
            <Link href="/saham" className="text-slate-400 hover:text-slate-200">
              direktori saham IDX
            </Link>{" "}
            lainnya.
          </p>
        </footer>
      </div>
    </main>
  );
}
