import type { Metadata } from "next";
import Link from "next/link";
import {
  GLOSSARY_CATEGORIES,
  GLOSSARY_PAGE_SIZE,
  getGlossaryLetterCounts,
  listGlossaryTerms,
} from "@/lib/glossary/service";
import { GlossarySearch } from "./GlossarySearch";
import { PublicNav } from "@/components/landing/PublicNav";

// ISR — konten dari DB, di-render statis & di-revalidate tiap 1 jam.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Glossary Saham — Kamus Istilah Trading & Investasi | Nubuat",
  description:
    "Kamus istilah saham Indonesia paling lengkap: IHSG, ARA, ARB, cut loss, dividen, PER, PBV, RSI, MACD, Elliott Wave, bandarmologi, foreign flow, dan ratusan istilah trading & investasi lain. Dijelaskan singkat, jelas, dan ramah untuk pemula.",
  keywords: [
    "kamus saham",
    "istilah saham",
    "glossary saham",
    "istilah trading",
    "belajar saham",
    "IHSG",
    "ARA ARB",
    "bandarmologi",
    "analisis teknikal",
  ],
  alternates: { canonical: "/glossary" },
  openGraph: {
    title: "Glossary Saham — Kamus Istilah Trading & Investasi | Nubuat",
    description:
      "Kamus istilah saham Indonesia: dari IHSG, ARA/ARB, cut loss, sampai Elliott Wave & bandarmologi. Singkat, jelas, ramah pemula.",
    url: "/glossary",
    type: "website",
    locale: "id_ID",
    siteName: "Nubuat",
  },
  twitter: {
    card: "summary_large_image",
    title: "Glossary Saham — Kamus Istilah Trading & Investasi | Nubuat",
    description:
      "Kamus istilah saham Indonesia, dijelaskan singkat dan ramah pemula.",
  },
};

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// JSON-LD: DefinedTermSet (kamus istilah) + BreadcrumbList untuk konteks.
const GLOSSARY_JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "DefinedTermSet",
      name: "Glossary Saham Nubuat",
      description:
        "Kamus istilah trading & investasi saham Indonesia: IHSG, ARA, ARB, bandarmologi, analisis teknikal, dan ratusan istilah lain.",
      url: `${SITE_URL}/glossary`,
      inLanguage: "id-ID",
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Beranda", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Glossary", item: `${SITE_URL}/glossary` },
      ],
    },
  ],
};

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

interface PageProps {
  searchParams: Promise<{
    q?: string;
    huruf?: string;
    kategori?: string;
    page?: string;
  }>;
}

function buildHref(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "" && v !== null) sp.set(k, String(v));
  }
  const qs = sp.toString();
  return qs ? `/glossary?${qs}` : "/glossary";
}

export default async function GlossaryPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const q = sp.q?.trim() || undefined;
  const letter = sp.huruf?.trim().toUpperCase() || undefined;
  const category = sp.kategori?.trim() || undefined;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const [result, letterCounts] = await Promise.all([
    listGlossaryTerms({ q, letter, category, page, pageSize: GLOSSARY_PAGE_SIZE }),
    getGlossaryLetterCounts(),
  ]);

  const { items, total, totalPages } = result;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(GLOSSARY_JSON_LD) }}
      />
      <PublicNav />
      <div className="mx-auto max-w-5xl px-6 py-12 sm:py-16">
        {/* Header */}
        <header className="mb-8">
          <p className="mb-2 text-sm font-medium text-primary">Edukasi</p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Glossary Saham
          </h1>
          <p className="mt-3 max-w-2xl text-base text-muted-foreground">
            Kamus istilah trading &amp; investasi saham Indonesia. Cari istilah
            yang bikin kamu bingung, dari ARA/ARB sampai bandarmologi — semua
            dijelaskan singkat dan ramah.
          </p>
        </header>

        {/* Search */}
        <div className="mb-6">
          <GlossarySearch initialQuery={q ?? ""} />
        </div>

        {/* Category filter */}
        <nav aria-label="Filter kategori" className="mb-6 flex flex-wrap gap-2">
          <FilterChip
            href={buildHref({ q })}
            active={!category}
            label="Semua kategori"
          />
          {GLOSSARY_CATEGORIES.map((cat) => (
            <FilterChip
              key={cat}
              href={buildHref({ q, kategori: cat })}
              active={category === cat}
              label={cat}
            />
          ))}
        </nav>

        {/* A–Z index */}
        {!q && (
          <nav aria-label="Indeks huruf" className="mb-8 flex flex-wrap gap-1.5">
            <FilterChip
              href={buildHref({ kategori: category })}
              active={!letter}
              label="Semua"
            />
            {ALPHABET.map((ch) => {
              const count = letterCounts[ch] ?? 0;
              const disabled = count === 0;
              return disabled ? (
                <span
                  key={ch}
                  aria-disabled="true"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border/50 text-sm text-muted-foreground/40"
                >
                  {ch}
                </span>
              ) : (
                <Link
                  key={ch}
                  href={buildHref({ huruf: ch, kategori: category })}
                  className={
                    "inline-flex h-8 w-8 items-center justify-center rounded-md border text-sm font-medium transition " +
                    (letter === ch
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-foreground hover:border-primary hover:text-primary")
                  }
                >
                  {ch}
                </Link>
              );
            })}
          </nav>
        )}

        {/* Result meta */}
        <div className="mb-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {total === 0
              ? "Tidak ada istilah yang cocok"
              : `${total} istilah${q ? ` untuk "${q}"` : ""}`}
          </span>
          {totalPages > 1 && (
            <span>
              Halaman {result.page} dari {totalPages}
            </span>
          )}
        </div>

        {/* List */}
        {items.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-10 text-center">
            <p className="text-foreground">Belum ada istilah yang cocok.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Coba kata kunci lain atau{" "}
              <Link href="/glossary" className="text-primary hover:underline">
                lihat semua istilah
              </Link>
              .
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {items.map((item) => (
              <li key={item.slug}>
                <Link
                  href={`/glossary/${item.slug}`}
                  className="group block h-full rounded-xl border border-border bg-card p-5 transition hover:border-primary hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-lg font-semibold text-foreground group-hover:text-primary">
                      {item.term}
                    </h2>
                    <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                      {item.category}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                    {item.definition}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <Pagination
            currentPage={result.page}
            totalPages={totalPages}
            makeHref={(p) =>
              buildHref({ q, huruf: letter, kategori: category, page: p === 1 ? undefined : p })
            }
          />
        )}
      </div>
    </main>
  );
}

function FilterChip({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={
        "inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition " +
        (active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border text-muted-foreground hover:border-primary hover:text-foreground")
      }
    >
      {label}
    </Link>
  );
}

function Pagination({
  currentPage,
  totalPages,
  makeHref,
}: {
  currentPage: number;
  totalPages: number;
  makeHref: (page: number) => string;
}) {
  const pages: number[] = [];
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, currentPage + 2);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <nav
      aria-label="Navigasi halaman"
      className="mt-10 flex items-center justify-center gap-1.5"
    >
      {currentPage > 1 && (
        <Link
          href={makeHref(currentPage - 1)}
          rel="prev"
          className="inline-flex h-9 items-center rounded-md border border-border px-3 text-sm text-foreground transition hover:border-primary hover:text-primary"
        >
          Sebelumnya
        </Link>
      )}
      {start > 1 && (
        <>
          <PageLink href={makeHref(1)} label="1" active={false} />
          {start > 2 && <span className="px-1 text-muted-foreground">…</span>}
        </>
      )}
      {pages.map((p) => (
        <PageLink
          key={p}
          href={makeHref(p)}
          label={String(p)}
          active={p === currentPage}
        />
      ))}
      {end < totalPages && (
        <>
          {end < totalPages - 1 && (
            <span className="px-1 text-muted-foreground">…</span>
          )}
          <PageLink href={makeHref(totalPages)} label={String(totalPages)} active={false} />
        </>
      )}
      {currentPage < totalPages && (
        <Link
          href={makeHref(currentPage + 1)}
          rel="next"
          className="inline-flex h-9 items-center rounded-md border border-border px-3 text-sm text-foreground transition hover:border-primary hover:text-primary"
        >
          Berikutnya
        </Link>
      )}
    </nav>
  );
}

function PageLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={
        "inline-flex h-9 min-w-9 items-center justify-center rounded-md border px-3 text-sm font-medium transition " +
        (active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border text-foreground hover:border-primary hover:text-primary")
      }
    >
      {label}
    </Link>
  );
}
