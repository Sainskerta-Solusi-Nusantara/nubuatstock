import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { foreignFlowDaily, brokerSummaryDaily, quotesEod } from "@/db/schema/market";
import {
  analyzeMarketSummary,
  type FlowPoint,
  type FlowSource,
  type MarketSummaryResult,
} from "@/lib/bandarmology/market-summary";

/**
 * Market Summary time-window service — IMPROVEMENT_PLAN §2 (NeoBDM signature).
 *
 * Strategi sumber data (graceful, mengikuti ketersediaan):
 *   1. foreign_flow_daily.net_value  (source="foreign") — paling representatif.
 *   2. broker_summary_daily net agg  (source="broker")  — bila foreign kosong.
 *   3. quotes_eod proxy volume×arah   (source="proxy")  — fallback terakhir.
 *
 * Bila ketiganya kosong (blokir vendor → tabel belum di-ingest), return null
 * supaya UI menampilkan empty-state tanpa dummy data.
 *
 * Mengambil ~30 hari trading terakhir (cukup untuk W4 yang butuh indeks 13..17).
 */

const LOOKBACK_DAYS = 30;

export interface MarketSummaryServiceResult {
  kode: string;
  /** Tanggal terbaru yang dipakai (D1). */
  latestTradeDate: string;
  result: MarketSummaryResult;
}

export async function computeMarketSummary(
  kode: string,
): Promise<MarketSummaryServiceResult | null> {
  const k = kode.toUpperCase();

  let points: FlowPoint[] = [];
  let source: FlowSource = "foreign";

  // 1. Foreign flow daily.
  points = await loadForeignFlow(k);

  // 2. Broker summary net (fallback).
  if (points.length === 0) {
    points = await loadBrokerNet(k);
    source = "broker";
  }

  // 3. Quotes EoD proxy (fallback terakhir).
  if (points.length === 0) {
    points = await loadQuotesProxy(k);
    source = "proxy";
  }

  if (points.length === 0) return null;

  const latestTradeDate = points.reduce(
    (max, p) => (p.tradeDate > max ? p.tradeDate : max),
    points[0]!.tradeDate,
  );

  return {
    kode: k,
    latestTradeDate,
    result: analyzeMarketSummary(points, { source }),
  };
}

// ============================== Loaders ==============================

async function loadForeignFlow(k: string): Promise<FlowPoint[]> {
  const rows = await db
    .select({
      tradeDate: foreignFlowDaily.tradeDate,
      netValue: foreignFlowDaily.netValue,
    })
    .from(foreignFlowDaily)
    .where(eq(foreignFlowDaily.companyKode, k))
    .orderBy(desc(foreignFlowDaily.tradeDate))
    .limit(LOOKBACK_DAYS);

  return rows.map((r) => ({ tradeDate: r.tradeDate, value: Number(r.netValue ?? 0) }));
}

async function loadBrokerNet(k: string): Promise<FlowPoint[]> {
  // Agregasi net per hari: SUM(net_value_idr) bila ada; jika null, pakai
  // SUM(value buy) - SUM(value sell) berdasarkan kolom side.
  const rows = await db
    .select({
      tradeDate: brokerSummaryDaily.tradeDate,
      net: sql<string>`COALESCE(
        SUM(${brokerSummaryDaily.netValueIdr}),
        SUM(
          CASE
            WHEN ${brokerSummaryDaily.side} = 'buy' THEN ${brokerSummaryDaily.valueIdr}
            WHEN ${brokerSummaryDaily.side} = 'sell' THEN -${brokerSummaryDaily.valueIdr}
            ELSE 0
          END
        ),
        0
      )`,
    })
    .from(brokerSummaryDaily)
    .where(eq(brokerSummaryDaily.companyKode, k))
    .groupBy(brokerSummaryDaily.tradeDate)
    .orderBy(desc(brokerSummaryDaily.tradeDate))
    .limit(LOOKBACK_DAYS);

  return rows.map((r) => ({ tradeDate: r.tradeDate, value: Number(r.net ?? 0) }));
}

async function loadQuotesProxy(k: string): Promise<FlowPoint[]> {
  // Proxy momentum: volume × arah harga (close - prevClose).
  // Naik = inflow (+volume×value), turun = outflow (-volume×value).
  // Pakai value_idr (nominal) supaya skalanya sebanding dengan flow IDR.
  const rows = await db
    .select({
      tradeDate: quotesEod.tradeDate,
      close: quotesEod.close,
      prevClose: quotesEod.prevClose,
      open: quotesEod.open,
      valueIdr: quotesEod.valueIdr,
    })
    .from(quotesEod)
    .where(eq(quotesEod.companyKode, k))
    .orderBy(asc(quotesEod.tradeDate))
    .limit(LOOKBACK_DAYS + 1);

  // Iterasi ascending agar bisa pakai close hari sebelumnya saat prevClose null.
  const points: FlowPoint[] = [];
  let prev: number | null = null;
  for (const r of rows) {
    const close = Number(r.close ?? 0);
    const value = Number(r.valueIdr ?? 0);
    const ref = r.prevClose != null ? Number(r.prevClose) : prev ?? Number(r.open ?? close);
    const direction = close >= ref ? 1 : -1;
    points.push({ tradeDate: r.tradeDate, value: direction * value });
    prev = close;
  }

  // Engine mengurutkan sendiri; kembalikan apa adanya (tail ke LOOKBACK_DAYS).
  return points.slice(-LOOKBACK_DAYS);
}
