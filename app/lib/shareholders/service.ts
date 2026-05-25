import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { insiderTransactions, majorShareholders } from "@/db/schema/shareholders";

export interface ShareholderRow {
  id: string;
  holderName: string;
  holderType: "individual" | "institution" | "government" | "mutual_fund" | "foreign" | "related_party";
  sharesOwned: number;
  ownershipPct: number;
  recordDate: string;
  source: string;
}

export interface InsiderTxRow {
  id: string;
  insiderName: string;
  insiderRole: string;
  side: "buy" | "sell";
  sharesTransacted: number;
  pricePerShareIdr: number | null;
  totalValueIdr: number | null;
  transactionDate: string;
  ownershipPctAfter: number | null;
  filingDate: string | null;
}

export async function getMajorShareholders(kode: string): Promise<ShareholderRow[]> {
  // Get latest record_date per holder, sort by ownership %
  const rows = await db
    .select()
    .from(majorShareholders)
    .where(eq(majorShareholders.companyKode, kode.toUpperCase()))
    .orderBy(desc(majorShareholders.recordDate));

  // Dedupe by holderName — keep latest only
  const byHolder = new Map<string, typeof rows[number]>();
  for (const r of rows) {
    const existing = byHolder.get(r.holderName);
    if (!existing || r.recordDate > existing.recordDate) {
      byHolder.set(r.holderName, r);
    }
  }

  return Array.from(byHolder.values())
    .sort((a, b) => Number(b.ownershipPct) - Number(a.ownershipPct))
    .map((r) => ({
      id: r.id,
      holderName: r.holderName,
      holderType: r.holderType as ShareholderRow["holderType"],
      sharesOwned: Number(r.sharesOwned),
      ownershipPct: Number(r.ownershipPct),
      recordDate: r.recordDate,
      source: r.source,
    }));
}

export async function getRecentInsiderTransactions(
  kode: string,
  windowDays = 180,
): Promise<InsiderTxRow[]> {
  const cutoff = new Date(Date.now() - windowDays * 86400000).toISOString().slice(0, 10);
  const rows = await db
    .select()
    .from(insiderTransactions)
    .where(
      and(
        eq(insiderTransactions.companyKode, kode.toUpperCase()),
        gte(insiderTransactions.transactionDate, cutoff),
      ),
    )
    .orderBy(desc(insiderTransactions.transactionDate))
    .limit(50);

  return rows.map((r) => ({
    id: r.id,
    insiderName: r.insiderName,
    insiderRole: r.insiderRole,
    side: r.side as "buy" | "sell",
    sharesTransacted: Number(r.sharesTransacted),
    pricePerShareIdr: r.pricePerShareIdr != null ? Number(r.pricePerShareIdr) : null,
    totalValueIdr: r.totalValueIdr != null ? Number(r.totalValueIdr) : null,
    transactionDate: r.transactionDate,
    ownershipPctAfter: r.ownershipPctAfter != null ? Number(r.ownershipPctAfter) : null,
    filingDate: r.filingDate,
  }));
}

export async function getInsiderBuySellSummary(kode: string, windowDays = 90) {
  const cutoff = new Date(Date.now() - windowDays * 86400000).toISOString().slice(0, 10);
  const rows = await db
    .select({
      side: insiderTransactions.side,
      totalShares: sql<number>`sum(${insiderTransactions.sharesTransacted})::bigint`,
      totalValue: sql<number>`coalesce(sum(${insiderTransactions.totalValueIdr}), 0)`,
      count: sql<number>`count(*)::int`,
    })
    .from(insiderTransactions)
    .where(
      and(
        eq(insiderTransactions.companyKode, kode.toUpperCase()),
        gte(insiderTransactions.transactionDate, cutoff),
      ),
    )
    .groupBy(insiderTransactions.side);

  const summary = {
    buy: { count: 0, shares: 0, value: 0 },
    sell: { count: 0, shares: 0, value: 0 },
    netSentiment: "neutral" as "bullish" | "bearish" | "neutral",
  };
  for (const r of rows) {
    const side = r.side as "buy" | "sell";
    summary[side] = {
      count: r.count,
      shares: Number(r.totalShares),
      value: Number(r.totalValue),
    };
  }
  // Net sentiment
  if (summary.buy.value > summary.sell.value * 1.5) summary.netSentiment = "bullish";
  else if (summary.sell.value > summary.buy.value * 1.5) summary.netSentiment = "bearish";
  return summary;
}
