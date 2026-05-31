import type { Metadata } from "next";
import Link from "next/link";
import { eq, asc } from "drizzle-orm";

import { db } from "@/lib/db";
import { companies } from "@/db/schema/companies";
import { sectors } from "@/db/schema/reference";

// ISR harian — direktori jarang berubah.
export const revalidate = 86400;

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Daftar Saham IDX — Harga & Analisis Emiten | Nubuat",
    description:
      "Direktori lengkap saham Bursa Efek Indonesia (IDX). Cari emiten per sektor, lihat harga terkini, fundamental, dan analisis saham di Nubuat.",
    keywords: [
      "daftar saham idx",
      "daftar emiten bursa",
      "saham indonesia",
      "kode saham idx",
      "analisis saham",
      "Bursa Efek Indonesia",
      "Nubuat",
    ],
    alternates: { canonical: "/saham" },
    openGraph: {
      type: "website",
      url: "/saham",
      title: "Daftar Saham IDX | Nubuat",
      description:
        "Direktori emiten Bursa Efek Indonesia dengan harga dan analisis saham.",
      siteName: "Nubuat",
      locale: "id_ID",
    },
  };
}

type Row = { kode: string; nama: string; sektorNama: string | null };

export default async function SahamIndexPage() {
  let rows: Row[] = [];
  try {
    rows = await db
      .select({
        kode: companies.kode,
        nama: companies.namaPerusahaan,
        sektorNama: sectors.namaId,
      })
      .from(companies)
      .leftJoin(sectors, eq(companies.sectorKode, sectors.kode))
      .where(eq(companies.isActive, true))
      .orderBy(asc(companies.kode))
      .limit(2000);
  } catch {
    rows = [];
  }

  // Grup per sektor (sektor kosong -> "Lainnya")
  const bySektor = new Map<string, Row[]>();
  for (const r of rows) {
    const key = r.sektorNama && r.sektorNama.trim() ? r.sektorNama : "Lainnya";
    const arr = bySektor.get(key);
    if (arr) arr.push(r);
    else bySektor.set(key, [r]);
  }
  const sektorKeys = Array.from(bySektor.keys()).sort((a, b) =>
    a.localeCompare(b, "id"),
  );

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Daftar Saham IDX",
    url: `${SITE_URL}/saham`,
    description:
      "Direktori emiten Bursa Efek Indonesia dengan harga dan analisis saham di Nubuat.",
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:py-14">
        <nav className="mb-6 text-sm text-slate-400" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-slate-200">
            Nubuat
          </Link>
          <span className="mx-2">/</span>
          <span className="text-slate-200">Saham IDX</span>
        </nav>

        <header>
          <h1 className="text-2xl font-bold sm:text-3xl">Daftar Saham IDX</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Jelajahi {rows.length.toLocaleString("id-ID")} emiten Bursa Efek
            Indonesia. Klik kode saham untuk melihat harga terkini, ringkasan
            fundamental, dan profil perusahaan.
          </p>
        </header>

        {sektorKeys.length === 0 ? (
          <p className="mt-10 text-slate-400">Data emiten belum tersedia.</p>
        ) : (
          <div className="mt-10 space-y-10">
            {sektorKeys.map((sektor) => {
              const items = bySektor.get(sektor)!;
              return (
                <section key={sektor}>
                  <h2 className="mb-4 border-b border-slate-800 pb-2 text-lg font-semibold">
                    {sektor}{" "}
                    <span className="text-sm font-normal text-slate-500">
                      ({items.length})
                    </span>
                  </h2>
                  <ul className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3 lg:grid-cols-4">
                    {items.map((r) => (
                      <li key={r.kode}>
                        <Link
                          href={`/saham/${r.kode}`}
                          className="group block rounded-md px-2 py-1.5 hover:bg-slate-900"
                          title={`Analisis saham ${r.kode} ${r.nama}`}
                        >
                          <span className="font-semibold text-sky-400 group-hover:text-sky-300">
                            {r.kode}
                          </span>
                          <span className="ml-2 truncate text-xs text-slate-400">
                            {r.nama}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )}

        <footer className="mt-12 border-t border-slate-800 pt-6 text-xs text-slate-500">
          <p>
            Ingin Verdict AI, Elliott Wave, dan bandarmology per emiten?{" "}
            <Link href="/signup" className="text-sky-400 hover:text-sky-300">
              Daftar gratis di Nubuat
            </Link>
            .
          </p>
        </footer>
      </div>
    </main>
  );
}
