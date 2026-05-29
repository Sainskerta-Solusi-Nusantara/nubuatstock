import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicNav } from "@/components/landing/PublicNav";
import {
  getAllGlossarySlugs,
  getGlossaryTermBySlug,
  getGlossaryTermsBySlugs,
} from "@/lib/glossary/service";

// ISR — halaman istilah di-render statis, revalidate tiap 1 jam.
export const revalidate = 3600;
// Slug yang belum di-generate akan dirender on-demand lalu di-cache.
export const dynamicParams = true;

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  try {
    const slugs = await getAllGlossarySlugs();
    return slugs.map((slug) => ({ slug }));
  } catch {
    return [];
  }
}

/** Ringkas definisi jadi meta description (≤ ~155 char, potong di batas kata). */
function toMetaDescription(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= 155) return clean;
  const cut = clean.slice(0, 152);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : 152)}…`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const term = await getGlossaryTermBySlug(slug);
  if (!term) {
    return { title: "Istilah tidak ditemukan", robots: "noindex,follow" };
  }

  const title = `${term.term} — Arti & Penjelasan | Glossary Saham Nubuat`;
  const description = toMetaDescription(term.definition);
  const url = `/glossary/${term.slug}`;

  return {
    title,
    description,
    keywords: [term.term, ...(term.aliases ?? []), "arti", "istilah saham", term.category],
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "article",
      locale: "id_ID",
    },
    twitter: { card: "summary", title, description },
  };
}

export default async function GlossaryTermPage({ params }: PageProps) {
  const { slug } = await params;
  const term = await getGlossaryTermBySlug(slug);
  if (!term) notFound();

  const related = await getGlossaryTermsBySlugs(term.relatedSlugs ?? []);

  // JSON-LD: schema.org DefinedTerm (di dalam DefinedTermSet untuk konteks glossary).
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    name: term.term,
    description: term.definition.replace(/\s+/g, " ").trim(),
    inDefinedTermSet: {
      "@type": "DefinedTermSet",
      name: "Glossary Saham Nubuat",
      url: `${SITE_URL}/glossary`,
    },
    termCode: term.slug,
    url: `${SITE_URL}/glossary/${term.slug}`,
    ...(term.aliases && term.aliases.length > 0
      ? { alternateName: term.aliases }
      : {}),
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <PublicNav />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
          <Link href="/glossary" className="hover:text-foreground">
            Glossary
          </Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">{term.term}</span>
        </nav>

        <article>
          <header className="mb-6">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                {term.term}
              </h1>
              <span className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
                {term.category}
              </span>
            </div>
            {term.aliases && term.aliases.length > 0 && (
              <p className="mt-2 text-sm text-muted-foreground">
                Juga dikenal sebagai:{" "}
                <span className="text-foreground">{term.aliases.join(", ")}</span>
              </p>
            )}
          </header>

          {/* Definition */}
          <div className="space-y-4 text-base leading-relaxed text-foreground">
            {term.definition.split(/\n{2,}/).map((para, i) => (
              <p key={i}>{para.trim()}</p>
            ))}
          </div>
        </article>

        {/* Related terms */}
        {related.length > 0 && (
          <section className="mt-12 border-t border-border pt-8">
            <h2 className="mb-4 text-lg font-semibold text-foreground">
              Istilah terkait
            </h2>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {related.map((r) => (
                <li key={r.slug}>
                  <Link
                    href={`/glossary/${r.slug}`}
                    className="group block rounded-xl border border-border bg-card p-4 transition hover:border-primary"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-foreground group-hover:text-primary">
                        {r.term}
                      </span>
                      <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                        {r.category}
                      </span>
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
                      {r.definition}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Back link */}
        <div className="mt-12">
          <Link
            href="/glossary"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <span aria-hidden="true">←</span> Kembali ke Glossary
          </Link>
        </div>
      </div>
    </main>
  );
}
