import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getConfig } from "@/lib/config";
import { getPickById } from "@/lib/picks/service";
import { requireSession } from "@/lib/picks/cross-deps";
import { FactorBreakdownChart } from "@/components/picks/FactorBreakdown";
import { PickChartOverlay } from "@/components/picks/PickChartOverlay";
import { NotFoundError } from "@/lib/errors";
import { pickIdParamSchema } from "@/lib/types/picks";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * /picks/[id] — detail satu pick. Chart overlay + factor breakdown + narrative.
 *
 * OHLCV untuk chart di-load dari `@/lib/market-data` kalau tersedia, fallback
 * ke chart empty state (Agent 5 dependency).
 */
export default async function PickDetailPage({ params }: PageProps) {
  await requireSession();
  const resolved = await params;
  const parsed = pickIdParamSchema.safeParse(resolved);
  if (!parsed.success) notFound();

  let pick;
  try {
    pick = await getPickById(parsed.data.id);
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }

  const [disclaimer, ohlcv] = await Promise.all([
    getConfig<string>("app.disclaimer_text", { defaultValue: "" }),
    loadChartOhlcv(pick.companyKode).catch(() => []),
  ]);

  return (
    <div className="space-y-6 p-6">
      <header className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">{pick.tradeDate}</p>
            <h1 className="text-3xl font-bold tracking-tight">{pick.companyKode}</h1>
            {pick.namaPerusahaan ? (
              <p className="text-sm text-muted-foreground">{pick.namaPerusahaan}</p>
            ) : null}
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant="secondary" className="text-sm">
              {pick.setupType}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {pick.timeHorizon.replace(/_/g, " ")}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              Bukan ajakan jual/beli
            </Badge>
          </div>
        </div>
        {disclaimer ? (
          <p className="rounded-md border border-yellow-500/30 bg-yellow-500/10 p-3 text-xs leading-relaxed text-yellow-900 dark:text-yellow-100">
            <strong>Disclaimer:</strong> {disclaimer}
          </p>
        ) : null}
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Chart & Level</CardTitle>
            </CardHeader>
            <CardContent>
              <PickChartOverlay
                ohlcv={ohlcv}
                entryZoneLow={pick.entryZoneLow}
                entryZoneHigh={pick.entryZoneHigh}
                stopLoss={pick.stopLoss}
                tp1={pick.tp1}
                tp2={pick.tp2}
                tp3={pick.tp3}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Narasi</CardTitle>
            </CardHeader>
            <CardContent>
              {pick.narrativeText ? (
                <div className="space-y-2 text-sm leading-relaxed">
                  <p className="whitespace-pre-wrap">{pick.narrativeText}</p>
                  {pick.narrativeGeneratedBy ? (
                    <p className="text-[10px] text-muted-foreground">
                      Dihasilkan oleh: {pick.narrativeGeneratedBy}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm italic text-muted-foreground">
                  Narasi belum tersedia. Admin perlu konfigurasi AI provider di /admin/config
                  untuk mengaktifkan generation otomatis.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Level Trading</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="Entry zone">
                {format(pick.entryZoneLow)} – {format(pick.entryZoneHigh)}
              </Row>
              <Row label="Stop Loss" tone="bear">
                {format(pick.stopLoss)}
              </Row>
              <Separator className="my-2" />
              <Row label="TP1" tone="bull">
                {format(pick.tp1)}
              </Row>
              <Row label="TP2" tone="bull">
                {pick.tp2 === null ? "—" : format(pick.tp2)}
              </Row>
              <Row label="TP3" tone="bull">
                {pick.tp3 === null ? "—" : format(pick.tp3)}
              </Row>
              <Separator className="my-2" />
              <Row label="ATR(14)">{format(pick.atr14, 4)}</Row>
              <Row label="R/R">{pick.rewardRiskRatio.toFixed(2)}x</Row>
              <Row label="Score">{pick.score.toFixed(1)} / 100</Row>
              <Row label="Confidence">{pick.confidence}</Row>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Factor Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <FactorBreakdownChart factors={pick.factorBreakdown} />
            </CardContent>
          </Card>
        </aside>
      </div>

      <footer className="border-t pt-4 text-[11px] leading-relaxed text-muted-foreground">
        {disclaimer ? <p>{disclaimer}</p> : null}
      </footer>
    </div>
  );
}

function Row({
  label,
  children,
  tone,
}: {
  label: string;
  children: React.ReactNode;
  tone?: "bull" | "bear";
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className={
          tone === "bull"
            ? "font-semibold tabular-nums text-bull"
            : tone === "bear"
              ? "font-semibold tabular-nums text-bear"
              : "font-semibold tabular-nums"
        }
      >
        {children}
      </span>
    </div>
  );
}

function format(n: number, frac = 2): string {
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: frac,
    maximumFractionDigits: frac,
  }).format(n);
}

/**
 * Best-effort load OHLCV bars dari Agent 5 (`@/lib/market-data`). Kalau modul
 * belum tersedia / function tidak ada → return []. Chart akan render empty state.
 */
async function loadChartOhlcv(companyKode: string): Promise<
  { time: string; open: number; high: number; low: number; close: number }[]
> {
  const mod: unknown = await import("@/lib/market-data").catch(() => null);
  if (!mod) return [];
  const fn = (mod as {
    getOhlcv?: (
      code: string,
      opts?: { range?: string; interval?: string },
    ) => Promise<
      { date: string; open: string | number; high: string | number; low: string | number; close: string | number }[]
    >;
  }).getOhlcv;
  if (typeof fn !== "function") return [];
  try {
    const bars = await fn(companyKode, { range: "6mo", interval: "1d" });
    return bars.map((b) => ({
      time: b.date,
      open: typeof b.open === "string" ? Number.parseFloat(b.open) : b.open,
      high: typeof b.high === "string" ? Number.parseFloat(b.high) : b.high,
      low: typeof b.low === "string" ? Number.parseFloat(b.low) : b.low,
      close: typeof b.close === "string" ? Number.parseFloat(b.close) : b.close,
    }));
  } catch {
    return [];
  }
}
