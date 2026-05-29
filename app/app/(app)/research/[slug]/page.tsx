import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Download, ChevronLeft, Calendar, User, TrendingUp, TrendingDown, Target, AlertTriangle, Sparkles } from "lucide-react";
import { getResearchBySlug, trackView, RATING_DISPLAY, REPORT_TYPE_LABEL, HORIZON_LABEL } from "@/lib/research/service";
import { getSession } from "@/lib/auth/server";
import { getConfig } from "@/lib/config";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { createHash } from "node:crypto";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/** Ringkas teks jadi meta description (≤ ~160 char, potong di batas kata). */
function toMetaDescription(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= 160) return clean;
  const cut = clean.slice(0, 157);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : 157)}…`;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const data = await getResearchBySlug(slug);
  if (!data) {
    return { title: "Riset tidak ditemukan", robots: "noindex,follow" };
  }
  const { report, companyName } = data;
  const ratingLabel = RATING_DISPLAY[report.rating]?.label ?? null;
  const description = toMetaDescription(
    report.metaDescription ??
      [report.companyKode && companyName ? `${report.companyKode} (${companyName}).` : null, report.summary]
        .filter(Boolean)
        .join(" "),
  );
  const url = `/research/${report.slug}`;
  const title = report.title;
  const keywords = [
    report.companyKode,
    companyName,
    ratingLabel ? `rekomendasi ${ratingLabel}` : null,
    REPORT_TYPE_LABEL[report.reportType] ?? null,
    "riset saham",
    "analisis saham",
    "IDX",
    "Nubuat",
    ...(report.tags ?? []),
  ].filter((k): k is string => Boolean(k));

  return {
    title,
    description,
    keywords,
    authors: report.authorName ? [{ name: report.authorName }] : undefined,
    alternates: { canonical: url },
    openGraph: {
      title: `${title} | Nubuat`,
      description,
      url,
      type: "article",
      locale: "id_ID",
      siteName: "Nubuat",
      publishedTime: report.publishedAt ? new Date(report.publishedAt).toISOString() : undefined,
      modifiedTime: report.updatedAt ? new Date(report.updatedAt).toISOString() : undefined,
      authors: report.authorName ? [report.authorName] : undefined,
      tags: report.tags ?? undefined,
      ...(report.coverImageUrl ? { images: [{ url: report.coverImageUrl }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | Nubuat`,
      description,
    },
  };
}

export default async function ResearchDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getResearchBySlug(slug);
  if (!data) notFound();
  const { report, companyName, companyLogoUrl } = data;

  // Track view (best-effort)
  const session = await getSession();
  const h = await headers();
  const referer = h.get("referer");
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const ipHash = ip ? createHash("sha256").update(ip).digest("hex").slice(0, 32) : null;
  trackView(report.id, session?.userId ?? null, ipHash, referer);

  const disclaimer = await getConfig<string>("app.disclaimer_text", {
    defaultValue: "Informasi edukasi semata, bukan ajakan jual/beli.",
  });
  const rating = RATING_DISPLAY[report.rating] ?? RATING_DISPLAY.not_rated!;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: report.title,
    description: toMetaDescription(report.metaDescription ?? report.summary),
    url: `${SITE_URL}/research/${report.slug}`,
    mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE_URL}/research/${report.slug}` },
    author: report.authorName ? { "@type": "Person", name: report.authorName } : undefined,
    publisher: {
      "@type": "Organization",
      name: "Nubuat",
      logo: { "@type": "ImageObject", url: `${SITE_URL}/icon` },
    },
    datePublished: report.publishedAt ? new Date(report.publishedAt).toISOString() : undefined,
    dateModified: report.updatedAt ? new Date(report.updatedAt).toISOString() : undefined,
    ...(report.coverImageUrl ? { image: [report.coverImageUrl] } : {}),
    ...(report.tags && report.tags.length > 0 ? { keywords: report.tags.join(", ") } : {}),
    ...(report.companyKode
      ? { about: { "@type": "Corporation", name: companyName ?? report.companyKode, tickerSymbol: report.companyKode } }
      : {}),
  };

  const upsidePct = report.upsideDownsidePct != null ? Number(report.upsideDownsidePct) : null;
  const upsideNorm = upsidePct != null ? (Math.abs(upsidePct) < 5 ? upsidePct * 100 : upsidePct) : null;
  const targetUp = upsideNorm != null && upsideNorm >= 0;

  return (
    <article className="mx-auto max-w-4xl space-y-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div>
        <Link
          href="/research"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Kembali ke daftar
        </Link>
      </div>

      {/* Header */}
      <header className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
            {REPORT_TYPE_LABEL[report.reportType] ?? report.reportType}
          </Badge>
          <Badge className={cn("text-[10px] uppercase tracking-wider", rating.color, "bg-transparent border border-current")}>
            {rating.label}
          </Badge>
          {report.minTierRequired !== "free" && (
            <Badge variant="outline" className="text-[10px] uppercase tracking-wider text-primary border-primary/40">
              <Sparkles className="mr-1 h-3 w-3" /> {report.minTierRequired}
            </Badge>
          )}
        </div>

        <div className="flex items-start gap-4">
          {companyLogoUrl ? (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white">
              <Image src={companyLogoUrl} alt="" width={56} height={56} className="h-full w-full object-contain" unoptimized />
            </div>
          ) : report.companyKode ? (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-primary text-2xl font-bold text-primary-foreground">
              {report.companyKode.slice(0, 1)}
            </div>
          ) : null}
          <div>
            {report.companyKode && (
              <div className="flex items-center gap-2">
                <span className="font-mono text-xl font-bold tracking-wider">{report.companyKode}</span>
                {companyName && <span className="text-sm text-muted-foreground">· {companyName}</span>}
              </div>
            )}
            <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">{report.title}</h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" /> {report.authorName}</span>
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {report.publishedAt ? new Date(report.publishedAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "—"}
          </span>
          <a
            href={`/api/research/${report.id}/pdf`}
            className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition hover:brightness-110"
            download
          >
            <Download className="h-3.5 w-3.5" />
            Download PDF
          </a>
        </div>
      </header>

      {/* Recommendation strip */}
      <div className="grid gap-3 sm:grid-cols-4">
        <RecoCard icon={Target} label="Rating" value={rating.label} valueClass={rating.color} />
        <RecoCard
          label="Target Price"
          value={report.targetPrice ? `Rp ${new Intl.NumberFormat("id-ID").format(Number(report.targetPrice))}` : "—"}
        />
        <RecoCard
          icon={targetUp ? TrendingUp : TrendingDown}
          label="Upside"
          value={upsideNorm != null ? `${upsideNorm >= 0 ? "+" : ""}${upsideNorm.toFixed(2)}%` : "—"}
          valueClass={upsideNorm != null ? (upsideNorm >= 0 ? "text-bull" : "text-bear") : ""}
        />
        <RecoCard label="Horizon" value={HORIZON_LABEL[report.timeHorizon] ?? "—"} />
      </div>

      <Separator />

      {/* Executive Summary */}
      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-primary">Ringkasan Eksekutif</h2>
        <p className="text-base leading-relaxed">{report.summary}</p>
        {report.keyHighlights.length > 0 && (
          <ul className="mt-4 space-y-2">
            {report.keyHighlights.map((h, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <span className="text-primary">•</span>
                <span>{h}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Catalysts */}
      {report.catalysts.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-primary">Katalis</h2>
          <ul className="space-y-2">
            {report.catalysts.map((c, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <span className="text-bull">▸</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Body sections */}
      {report.sections.map((s) => (
        <section key={s.key}>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-primary">{s.title}</h2>
          <div className="space-y-3 text-base leading-relaxed whitespace-pre-wrap">{s.content}</div>
        </section>
      ))}

      {/* Valuation */}
      {report.valuationMethod && (
        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-primary">Metodologi Valuasi</h2>
          <p className="text-sm">
            Metode: <strong>{report.valuationMethod}</strong>
          </p>
          {report.valuationDetail?.description && (
            <p className="mt-2 text-sm text-muted-foreground">{report.valuationDetail.description}</p>
          )}
        </section>
      )}

      {/* Financial Snapshot */}
      {report.financialSnapshot && Object.values(report.financialSnapshot).some((v) => v != null) && (
        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-primary">Snapshot Finansial</h2>
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <tbody>
                  <FinTableRow label="Revenue (TTM)" value={fmtIdr(report.financialSnapshot.revenue)} />
                  <FinTableRow label="Revenue Growth YoY" value={fmtPct(report.financialSnapshot.revenueGrowth)} />
                  <FinTableRow label="Net Income (TTM)" value={fmtIdr(report.financialSnapshot.netIncome)} />
                  <FinTableRow label="Net Income Growth YoY" value={fmtPct(report.financialSnapshot.netIncomeGrowth)} />
                  <FinTableRow label="EPS" value={fmtIdr(report.financialSnapshot.eps)} />
                  <FinTableRow label="P/E Ratio" value={fmtMul(report.financialSnapshot.pe)} />
                  <FinTableRow label="P/BV" value={fmtMul(report.financialSnapshot.pbv)} />
                  <FinTableRow label="ROE" value={fmtPct(report.financialSnapshot.roe)} />
                  <FinTableRow label="DER" value={fmtMul(report.financialSnapshot.debtToEquity)} />
                  <FinTableRow label="Dividend Yield" value={fmtPct(report.financialSnapshot.dividendYield)} />
                </tbody>
              </table>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Risk */}
      {report.riskFactors.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-primary">Faktor Risiko</h2>
          <ul className="space-y-2">
            {report.riskFactors.map((r, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-bear" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Disclaimer */}
      <footer className="rounded-md border border-border bg-card/40 p-4 text-xs leading-relaxed text-muted-foreground">
        <strong className="text-foreground">Disclaimer.</strong> {disclaimer}
      </footer>
    </article>
  );
}

function RecoCard({
  icon: Icon, label, value, valueClass,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          {Icon && <Icon className="h-3 w-3" />}
          {label}
        </div>
        <div className={cn("mt-1.5 font-mono text-lg font-bold", valueClass)}>{value}</div>
      </CardContent>
    </Card>
  );
}

function FinTableRow({ label, value }: { label: string; value: string }) {
  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-4 py-2 text-muted-foreground">{label}</td>
      <td className="px-4 py-2 text-right font-mono font-semibold">{value}</td>
    </tr>
  );
}

function fmtIdr(n?: number | null): string {
  if (n == null) return "—";
  return `Rp ${new Intl.NumberFormat("id-ID").format(n)}`;
}
function fmtPct(n?: number | null): string {
  if (n == null) return "—";
  return `${(n * (Math.abs(n) < 5 ? 100 : 1)).toFixed(2)}%`;
}
function fmtMul(n?: number | null): string {
  if (n == null) return "—";
  return `${n.toFixed(2)}x`;
}
