import Link from "next/link";
import { Compass, TrendingUp, TrendingDown, Activity, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RotationChart } from "@/components/rotation/RotationChart";
import { getSectorRotation, getEmittenRotation, type Quadrant } from "@/lib/rotation/service";
import { formatCompactIDR } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Rotation Chart — Nubuat",
  description:
    "Relative Rotation Graph (RRG) 4-kuadran: Leading / Weakening / Lagging / Improving. Identifikasi rotasi modal antar sektor & emiten.",
};

interface PageProps {
  searchParams: Promise<{ scope?: "sector" | "ticker"; sectorKode?: string }>;
}

const QUADRANT_META: Record<Quadrant, { bg: string; fg: string; description: string; emoji: string }> = {
  Leading: {
    bg: "bg-bull-soft",
    fg: "text-bull",
    emoji: "🟢",
    description: "Outperforming benchmark + masih akselerasi. Sweet spot — pertimbangkan add/hold.",
  },
  Weakening: {
    bg: "bg-orange-500/15",
    fg: "text-orange-700 dark:text-orange-300",
    emoji: "🟠",
    description: "Outperforming tapi momentum melambat. Waspada — siap reduce / take profit.",
  },
  Lagging: {
    bg: "bg-bear-soft",
    fg: "text-bear",
    emoji: "🔴",
    description: "Underperforming + decelerating. Hindari atau short candidate.",
  },
  Improving: {
    bg: "bg-blue-500/15",
    fg: "text-blue-700 dark:text-blue-300",
    emoji: "🔵",
    description: "Underperforming tapi momentum naik. Early entry zone — siapkan posisi.",
  },
};

export default async function RotationPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const scope = sp.scope ?? "sector";
  const sectorFilter = sp.sectorKode;

  const entities =
    scope === "sector"
      ? await getSectorRotation()
      : await getEmittenRotation(sectorFilter, 25);

  const byQuadrant = {
    Leading: entities.filter((e) => e.currentQuadrant === "Leading"),
    Improving: entities.filter((e) => e.currentQuadrant === "Improving"),
    Weakening: entities.filter((e) => e.currentQuadrant === "Weakening"),
    Lagging: entities.filter((e) => e.currentQuadrant === "Lagging"),
  };

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-2">
          <Compass className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Rotation Chart (RRG)</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Relative Rotation Graph 4-kuadran: Leading (perform + akselerasi), Weakening (perform tapi melambat),
          Lagging (lemah + lambat), Improving (lemah tapi akselerasi). Identifikasi rotasi modal antar sektor &amp; emiten
          relatif terhadap proxy IHSG.
        </p>
      </header>

      {/* Scope switcher */}
      <div className="flex items-center gap-2 rounded-md border border-border bg-card p-1 w-fit">
        <Link
          href="/rotation?scope=sector"
          className={cn(
            "rounded px-3 py-1 text-xs font-medium transition",
            scope === "sector" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          Per Sektor (11)
        </Link>
        <Link
          href="/rotation?scope=ticker"
          className={cn(
            "rounded px-3 py-1 text-xs font-medium transition",
            scope === "ticker" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          Per Emiten (top 25)
        </Link>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Rotation Chart — {scope === "sector" ? "Sektor" : "Emiten"} vs IHSG proxy
          </CardTitle>
        </CardHeader>
        <CardContent>
          {entities.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Data rotation belum cukup. Pastikan EOD bars sudah ter-ingest minimal 30 hari.
            </p>
          ) : (
            <RotationChart entities={entities} variant={scope === "sector" ? "sector" : "ticker"} />
          )}
        </CardContent>
      </Card>

      {/* Quadrant breakdown */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {(["Leading", "Improving", "Weakening", "Lagging"] as const).map((q) => {
          const list = byQuadrant[q];
          const meta = QUADRANT_META[q];
          return (
            <Card key={q} className={cn("border", meta.bg.replace("-soft", "/30").replace("/15", "/30"))}>
              <CardHeader className="pb-2">
                <CardTitle className={cn("flex items-center justify-between text-sm", meta.fg)}>
                  <span className="flex items-center gap-2">
                    <span>{meta.emoji}</span>
                    {q} ({list.length})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className={cn("mb-3 text-[11px] leading-relaxed", meta.fg, "opacity-90")}>
                  {meta.description}
                </p>
                {list.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Tidak ada {scope === "sector" ? "sektor" : "emiten"} di kuadran ini saat ini.</p>
                ) : (
                  <ul className="space-y-1 text-xs">
                    {list.slice(0, 8).map((e) => (
                      <li key={e.kode} className="flex items-center justify-between">
                        <Link
                          href={scope === "sector" ? `/screener?sector=${e.kode}` : `/ticker/${e.kode}`}
                          className="hover:underline"
                        >
                          <span className="font-semibold">{e.kode}</span>
                          {scope === "ticker" && (
                            <span className="ml-1 text-[10px] text-muted-foreground line-clamp-1 inline-block max-w-[150px] truncate align-bottom">
                              {e.name}
                            </span>
                          )}
                        </Link>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          RS {e.currentRs.toFixed(1)} • M {e.currentMomentum.toFixed(1)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="rounded-md border border-border bg-card/40 p-3 text-xs leading-relaxed text-muted-foreground">
        <strong>Cara baca:</strong> RRG plot 2 metrik per entity. RS-Ratio &gt; 100 = outperform benchmark.
        RS-Momentum &gt; 100 = mempercepat (relatif). Trail menunjukkan pergerakan beberapa minggu terakhir.
        Rotasi tipikal: <strong>Improving → Leading → Weakening → Lagging → Improving</strong> (searah jarum jam).
        Benchmark = synthetic IHSG dari weighted average top 30 emiten by market cap.
      </p>
    </div>
  );
}
