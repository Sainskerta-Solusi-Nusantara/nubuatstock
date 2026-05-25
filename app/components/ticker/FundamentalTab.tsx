import { Globe } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCompactIDR, formatNumber } from "@/lib/utils/format";
import type { CompanyDetailDTO } from "@/lib/types/companies";

import { loadOhlcv } from "@/components/ticker/shared";

export async function FundamentalTab({ company }: { company: CompanyDetailDTO }) {
  // ===== Multi-method Valuation Suite =====
  const { buildDefaultDcfInputs, runDCF } = await import("@/lib/valuation/dcf");
  const { buildDefaultDdmInputs, runDDM } = await import("@/lib/valuation/ddm");
  const { buildReverseDcfInputs, runReverseDCF } = await import("@/lib/valuation/reverse-dcf");
  const { buildHeuristicsInputs, runGrahamNumber, runLynchFairValue } = await import("@/lib/valuation/graham-lynch");
  const { DCFCard } = await import("@/components/valuation/DCFCard");
  const { ValuationSuite } = await import("@/components/valuation/ValuationSuite");

  let dcfResult: Awaited<ReturnType<typeof runDCF>> | null = null;
  let ddmResult: Awaited<ReturnType<typeof runDDM>> | null = null;
  let reverseDCFResult: Awaited<ReturnType<typeof runReverseDCF>> | null = null;
  let grahamResult: ReturnType<typeof runGrahamNumber> | null = null;
  let lynchResult: ReturnType<typeof runLynchFairValue> | null = null;
  let lastClose = 0;

  try {
    const lastPriceRow = await loadOhlcv(company.kode);
    lastClose = lastPriceRow.length > 0 ? Number(lastPriceRow[lastPriceRow.length - 1]!.close) : 0;

    // DCF
    const dcfInputs = await buildDefaultDcfInputs(company.kode, lastClose);
    if (dcfInputs && dcfInputs.initialFcfIdr > 0 && dcfInputs.sharesOutstanding > 0) {
      dcfResult = runDCF(dcfInputs);
    }

    // DDM (only for dividend payers)
    const ddmInputs = await buildDefaultDdmInputs(company.kode, lastClose);
    if (ddmInputs) {
      ddmResult = runDDM(ddmInputs);
    }

    // Reverse DCF
    const revInputs = await buildReverseDcfInputs(company.kode);
    if (revInputs) {
      reverseDCFResult = runReverseDCF(revInputs);
    }

    // Graham + Lynch
    const heuristics = await buildHeuristicsInputs(company.kode, lastClose);
    if (heuristics) {
      grahamResult = runGrahamNumber({
        eps: heuristics.eps,
        bvps: heuristics.bvps,
        currentPrice: heuristics.currentPrice,
      });
      lynchResult = runLynchFairValue({
        eps: heuristics.eps,
        growthRate: heuristics.growthRate,
        currentPrice: heuristics.currentPrice,
      });
    }
  } catch (err) {
    void err;
  }

  // Build ValuationSuite methods array
  const methods = [
    dcfResult && {
      name: "DCF (Discounted Cash Flow)",
      intrinsicValue: dcfResult.intrinsicValuePerShare,
      marginPct: dcfResult.marginOfSafetyPct,
      recommendation: dcfResult.recommendation,
      applicable: true,
      note: "Two-stage 10yr projection",
    },
    ddmResult && {
      name: "DDM (Dividend Discount Model)",
      intrinsicValue: ddmResult.warnings.length > 1 ? null : ddmResult.totalIntrinsicValue,
      marginPct: ddmResult.warnings.length > 1 ? null : ddmResult.marginOfSafetyPct,
      recommendation: ddmResult.warnings.length > 1 ? null : ddmResult.recommendation,
      applicable: ddmResult.applicability !== "low" && ddmResult.warnings.length <= 1,
      note: ddmResult.applicability === "high" ? "Cocok untuk dividend payer" : "Cocok terbatas",
    },
    grahamResult && {
      name: "Graham Number",
      intrinsicValue: grahamResult.applicable ? grahamResult.intrinsicValue : null,
      marginPct: grahamResult.applicable ? grahamResult.marginOfSafetyPct : null,
      recommendation: grahamResult.applicable ? grahamResult.recommendation : null,
      applicable: grahamResult.applicable,
      note: "√(22.5 × EPS × BVPS) — value classic",
    },
    lynchResult && {
      name: "Lynch Fair Value",
      intrinsicValue: lynchResult.intrinsicValue > 0 ? lynchResult.intrinsicValue : null,
      marginPct: lynchResult.intrinsicValue > 0 ? lynchResult.marginOfSafetyPct : null,
      recommendation: lynchResult.intrinsicValue > 0 ? lynchResult.recommendation : null,
      applicable: lynchResult.intrinsicValue > 0,
      note: lynchResult.pegRatio != null ? `PEG ${lynchResult.pegRatio.toFixed(2)}` : undefined,
    },
  ].filter(Boolean) as Parameters<typeof ValuationSuite>[0]["methods"];

  // Shareholders + Insider activity
  const { getMajorShareholders, getRecentInsiderTransactions, getInsiderBuySellSummary } = await import("@/lib/shareholders/service");
  const { ShareholderCard } = await import("@/components/shareholders/ShareholderCard");
  const [shareholders, insiderTransactions, insiderSummary] = await Promise.all([
    getMajorShareholders(company.kode),
    getRecentInsiderTransactions(company.kode),
    getInsiderBuySellSummary(company.kode),
  ]);
  const hasShareholderData = shareholders.length > 0 || insiderTransactions.length > 0;

  return (
    <div className="space-y-4">
      {hasShareholderData && (
        <ShareholderCard
          shareholders={shareholders}
          insiderTransactions={insiderTransactions}
          insiderSummary={insiderSummary}
        />
      )}

      {methods.length > 0 && (
        <ValuationSuite ticker={company.kode} currentPrice={lastClose} methods={methods} />
      )}

      {reverseDCFResult && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Reverse DCF — Implied Growth Expectation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-4xl font-bold">
                {(reverseDCFResult.impliedGrowthY1to5 * 100).toFixed(1)}%
              </span>
              <span className="text-xs text-muted-foreground">FCF growth/year implied by market</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{reverseDCFResult.comment}</p>
          </CardContent>
        </Card>
      )}

      {dcfResult && <DCFCard result={dcfResult} />}

      <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Profil Emiten</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {company.deskripsi ? (
            <p className="text-muted-foreground">{company.deskripsi}</p>
          ) : (
            <p className="text-xs italic text-muted-foreground">
              Deskripsi belum diisi pada metadata emiten.
            </p>
          )}
          {company.website && (
            <Button asChild variant="outline" size="sm">
              <a
                href={company.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2"
              >
                <Globe className="size-3.5" aria-hidden /> Website resmi
              </a>
            </Button>
          )}
          <Separator />
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
            <div>
              <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Tanggal IPO
              </dt>
              <dd className="font-medium">{company.tanggalIpo ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Shares Out
              </dt>
              <dd className="font-mono">
                {formatNumber(company.sharesOutstanding, 0)}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Market Cap
              </dt>
              <dd className="font-mono">
                {formatCompactIDR(company.marketCapIdr)}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Free Float
              </dt>
              <dd className="font-mono">
                {company.freeFloatPct == null
                  ? "—"
                  : `${formatNumber(company.freeFloatPct, 2)}%`}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Laporan Keuangan</CardTitle>
          <CardDescription>Ringkasan kuartalan &amp; tahunan.</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="Belum ada laporan keuangan"
            description="Modul ingest laporan keuangan belum aktif. Data akan otomatis tersinkron setelah jadwal berjalan."
          />
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
