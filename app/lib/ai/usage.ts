import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { aiUsageLog } from "@/db/schema/ai";
import { getConfig } from "@/lib/config";
import { logger } from "@/lib/logger";

/**
 * Increment daily aggregate untuk satu user/model/provider.
 *
 * Cost estimate (IDR) dibaca dari `app_config.ai.{provider}.price.{tier}` —
 * fallback 0 kalau pricing belum di-set (jangan throw, jangan blok request).
 */
export interface UsageDelta {
  userId: string;
  provider: string;
  model: string;
  tokensInput: number;
  tokensOutput: number;
  tokensCached: number;
  latencyMs: number;
  toolCalls: number;
}

export async function recordUsage(delta: UsageDelta): Promise<void> {
  const today = todayJakartaIso();
  const costEstimate = await estimateCostIdr(delta);

  // UPSERT pattern: insert kalau belum ada, else increment.
  try {
    await db
      .insert(aiUsageLog)
      .values({
        userId: delta.userId,
        date: today,
        provider: delta.provider,
        model: delta.model,
        tokensInputTotal: delta.tokensInput,
        tokensOutputTotal: delta.tokensOutput,
        tokensCachedTotal: delta.tokensCached,
        requestsCount: 1,
        toolCallsCount: delta.toolCalls,
        costEstimateIdr: costEstimate,
        avgLatencyMs: delta.latencyMs,
      })
      .onConflictDoUpdate({
        target: [aiUsageLog.userId, aiUsageLog.date, aiUsageLog.provider, aiUsageLog.model],
        set: {
          tokensInputTotal: sql`${aiUsageLog.tokensInputTotal} + ${delta.tokensInput}`,
          tokensOutputTotal: sql`${aiUsageLog.tokensOutputTotal} + ${delta.tokensOutput}`,
          tokensCachedTotal: sql`${aiUsageLog.tokensCachedTotal} + ${delta.tokensCached}`,
          requestsCount: sql`${aiUsageLog.requestsCount} + 1`,
          toolCallsCount: sql`${aiUsageLog.toolCallsCount} + ${delta.toolCalls}`,
          costEstimateIdr: sql`${aiUsageLog.costEstimateIdr} + ${costEstimate}`,
          avgLatencyMs: sql`((${aiUsageLog.avgLatencyMs} * ${aiUsageLog.requestsCount}) + ${delta.latencyMs}) / (${aiUsageLog.requestsCount} + 1)`,
          updatedAt: sql`now()`,
        },
      });
  } catch (err) {
    logger.warn({ err, delta: { ...delta, userId: "[redacted]" } }, "Failed to record AI usage");
  }
}

async function estimateCostIdr(delta: UsageDelta): Promise<number> {
  try {
    const inputPricePer1k = await getConfig<number>(
      `ai.${delta.provider}.price.input_per_1k_idr`,
      { defaultValue: 0 },
    );
    const outputPricePer1k = await getConfig<number>(
      `ai.${delta.provider}.price.output_per_1k_idr`,
      { defaultValue: 0 },
    );
    const inputCost = (delta.tokensInput / 1000) * inputPricePer1k;
    const outputCost = (delta.tokensOutput / 1000) * outputPricePer1k;
    return Math.round(inputCost + outputCost);
  } catch {
    return 0;
  }
}

function todayJakartaIso(): string {
  const now = new Date();
  const offsetMs = 7 * 60 * 60 * 1000;
  const wib = new Date(now.getTime() + offsetMs);
  return wib.toISOString().slice(0, 10);
}

export async function getUserDailyUsage(
  userId: string,
  date?: string,
): Promise<{ requestsCount: number; tokensInput: number; tokensOutput: number }> {
  const d = date ?? todayJakartaIso();
  const rows = await db
    .select({
      requestsCount: sql<number>`COALESCE(SUM(${aiUsageLog.requestsCount}), 0)::int`,
      tokensInput: sql<number>`COALESCE(SUM(${aiUsageLog.tokensInputTotal}), 0)::int`,
      tokensOutput: sql<number>`COALESCE(SUM(${aiUsageLog.tokensOutputTotal}), 0)::int`,
    })
    .from(aiUsageLog)
    .where(and(eq(aiUsageLog.userId, userId), eq(aiUsageLog.date, d)));
  const r = rows[0];
  return {
    requestsCount: r?.requestsCount ?? 0,
    tokensInput: r?.tokensInput ?? 0,
    tokensOutput: r?.tokensOutput ?? 0,
  };
}
