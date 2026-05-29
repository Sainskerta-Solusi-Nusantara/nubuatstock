import type { Metadata } from "next";
import { Suspense } from "react";

import { requireSession } from "@/lib/auth/server";
import { getUserTier } from "@/lib/billing/entitlements";
import { TIER_RANK } from "@/lib/types/billing";
import { logger } from "@/lib/logger";
import { ProUpsell } from "@/components/backtest/pro-upsell";
import { WorkspaceGrid } from "@/components/workspace/WorkspaceGrid";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Terminal Pro — Workspace Multi-Chart",
  description:
    "Workspace multi-chart ala Bloomberg: pantau beberapa emiten sekaligus, simpan & bagikan layout lewat URL, plus function code cepat.",
};

export default async function WorkspacePage() {
  const session = await requireSession();

  let isPro = false;
  try {
    const tier = await getUserTier(session.userId);
    isPro = (TIER_RANK[tier] ?? 0) >= TIER_RANK.pro;
  } catch (err) {
    logger.warn({ err, userId: session.userId }, "workspace tier check failed");
    isPro = false;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Terminal Pro</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Workspace multi-chart: pantau beberapa emiten sekaligus, atur layout
          1/2/4 pane, lalu bagikan lewat URL. Ketik function code (mis.{" "}
          <span className="font-mono">BBRI DES</span>) buat lompat cepat.
        </p>
      </div>

      {isPro ? (
        <Suspense
          fallback={
            <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
              Memuat workspace...
            </div>
          }
        >
          <WorkspaceGrid />
        </Suspense>
      ) : (
        <ProUpsell feature="Workspace multi-chart tersedia mulai tier Pro" />
      )}
    </div>
  );
}
