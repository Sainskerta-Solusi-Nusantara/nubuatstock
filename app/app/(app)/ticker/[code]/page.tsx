import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Building2 } from "lucide-react";

import { requireSession } from "@/lib/auth/server";
import { getCompany } from "@/lib/companies";
import { getQuote } from "@/lib/market-data";
import { NotFoundError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { tickerSchema } from "@/lib/types/companies";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Breadcrumb } from "@/components/navigation/Breadcrumb";
import { EmptyState } from "@/components/ui/empty-state";
import { TradeButton } from "@/components/paper-trading/TradeButton";
import {
  changeTone,
  changeSign,
  formatIDR,
  formatNumber,
  formatPercent,
} from "@/lib/utils/format";
import type { CompanyDetailDTO } from "@/lib/types/companies";
import type { Quote } from "@/lib/types/market";

import { OverviewTab } from "@/components/ticker/OverviewTab";
import { TechnicalTab } from "@/components/ticker/TechnicalTab";
import { FundamentalTab } from "@/components/ticker/FundamentalTab";
import { BandarmologyTab } from "@/components/ticker/BandarmologyTab";
import { BrokermologyTab } from "@/components/ticker/BrokermologyTab";
import { NewsTab } from "@/components/ticker/NewsTab";
import { ResearchTab } from "@/components/ticker/ResearchTab";
import { AiTab } from "@/components/ticker/AiTab";

interface PageProps {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { code } = await params;
  const normalized = code.toUpperCase();
  return {
    title: `${normalized}`,
    description: `Analisa saham ${normalized} di Nubuat`,
  };
}

export default async function TickerPage({ params }: PageProps) {
  // Session enforced by `(app)/layout.tsx`; ensure tetap aman walau diakses langsung.
  await requireSession();
  const { code } = await params;
  const parsed = tickerSchema.safeParse(code.toUpperCase());
  if (!parsed.success) notFound();
  const ticker = parsed.data;

  const company = await loadCompany(ticker);
  if (!company) notFound();

  return (
    <div className="space-y-4">
      <Breadcrumb
        items={[
          { href: "/", label: "Dashboard" },
          { href: "/picks", label: "Saham" },
          { label: ticker },
        ]}
      />

      <TickerHeader company={company} />

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex w-full flex-wrap gap-1 overflow-x-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="technical">Technical</TabsTrigger>
          <TabsTrigger value="fundamental">Fundamental</TabsTrigger>
          <TabsTrigger value="bandarmology">Bandarmology</TabsTrigger>
          <TabsTrigger value="brokermology">Brokermology</TabsTrigger>
          <TabsTrigger value="news">News</TabsTrigger>
          <TabsTrigger value="research">Research</TabsTrigger>
          <TabsTrigger value="ai">AI</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Suspense fallback={<ChartSkeleton />}>
            <OverviewTab ticker={ticker} company={company} />
          </Suspense>
        </TabsContent>

        <TabsContent value="technical">
          <Suspense fallback={<ChartSkeleton />}>
            <TechnicalTab ticker={ticker} />
          </Suspense>
        </TabsContent>

        <TabsContent value="fundamental">
          <FundamentalTab company={company} />
        </TabsContent>

        <TabsContent value="bandarmology">
          <BandarmologyTab ticker={ticker} />
        </TabsContent>

        <TabsContent value="brokermology">
          <BrokermologyTab ticker={ticker} />
        </TabsContent>

        <TabsContent value="news">
          <NewsTab ticker={ticker} />
        </TabsContent>

        <TabsContent value="research">
          <ResearchTab />
        </TabsContent>

        <TabsContent value="ai">
          <AiTab ticker={ticker} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// =================== Helpers (server) ===================

async function loadCompany(kode: string): Promise<CompanyDetailDTO | null> {
  try {
    return await getCompany(kode);
  } catch (err) {
    if (err instanceof NotFoundError) return null;
    logger.warn({ err, kode }, "loadCompany failed");
    return null;
  }
}

async function loadQuote(kode: string): Promise<Quote | null> {
  try {
    return await getQuote(kode);
  } catch (err) {
    logger.warn({ err, kode }, "loadQuote failed");
    return null;
  }
}

// =================== UI sections ===================

function TickerHeader({ company }: { company: CompanyDetailDTO }) {
  return (
    <Suspense fallback={<HeaderSkeleton />}>
      <HeaderWithQuote company={company} />
    </Suspense>
  );
}

function HeaderSkeleton() {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
        <Skeleton className="h-12 w-48" />
        <Skeleton className="h-12 w-40" />
      </CardContent>
    </Card>
  );
}

async function HeaderWithQuote({ company }: { company: CompanyDetailDTO }) {
  const quote = await loadQuote(company.kode);
  const tone = quote ? changeTone(quote.changePct) : "neutral";
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <Building2 className="size-6 text-muted-foreground" aria-hidden />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-mono text-2xl font-bold">{company.kode}</h1>
              {company.isSyariah && (
                <Badge variant="secondary">Syariah</Badge>
              )}
              {!company.isActive && (
                <Badge variant="destructive">Suspended</Badge>
              )}
            </div>
            <p className="text-sm font-medium text-foreground">
              {company.namaPerusahaan}
            </p>
            <p className="text-xs text-muted-foreground">
              {company.sectorNamaId ?? company.sectorKode} •{" "}
              {company.papanNama ?? company.papanKode}
            </p>
          </div>
        </div>
        <div className="text-right">
          {quote ? (
            <>
              <p className="font-mono text-3xl font-bold">
                {formatIDR(quote.price)}
              </p>
              <p
                className={
                  "text-sm font-medium " +
                  (tone === "bull"
                    ? "text-bull"
                    : tone === "bear"
                      ? "text-bear"
                      : "text-muted-foreground")
                }
              >
                {changeSign(quote.change)}
                {formatNumber(Math.abs(Number(quote.change)), 0)} (
                {formatPercent(quote.changePct, true)})
              </p>
              <p className="text-xs text-muted-foreground">
                Vendor: {quote.vendor} • {quote.marketState}
              </p>
              <div className="mt-2 flex justify-end gap-2">
                <TradeButton kode={company.kode} defaultSide="buy" variant="compact" />
                <TradeButton kode={company.kode} defaultSide="sell" variant="compact" />
              </div>
            </>
          ) : (
            <EmptyState
              title="Harga belum tersedia"
              description="Konfigurasi vendor data feed di /admin/config."
              action={{ href: "/admin", label: "Buka admin" }}
              className="px-3 py-4 text-left"
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ChartSkeleton() {
  return <Skeleton className="h-[420px] w-full" />;
}
