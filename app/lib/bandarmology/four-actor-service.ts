import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { brokers, brokerSummaryDaily, foreignFlowDaily } from "@/db/schema/market";
import {
  classifyActors,
  type ActorBrokerRow,
  type ForeignFlowInput,
  type FourActorResult,
} from "@/lib/bandarmology/four-actor";

/**
 * 4-Pelaku Classification service — IMPROVEMENT_PLAN §3.C.3.
 *
 * Query broker summary (+ foreign flow + metadata broker) tanggal terbaru untuk
 * emiten lalu jalankan engine murni `classifyActors`.
 *
 * Graceful degradation: bila tabel kosong / data belum di-ingest (blokir vendor),
 * return null sehingga UI menampilkan empty-state. Tidak pernah melempar karena
 * data kosong.
 */

export interface FourActorServiceResult {
  kode: string;
  tradeDate: string;
  result: FourActorResult;
}

/**
 * Klasifikasikan 4 pelaku untuk tanggal trading terbaru emiten `kode`.
 *
 * @returns null bila tidak ada broker summary sama sekali (empty-state di UI).
 */
export async function computeFourActor(kode: string): Promise<FourActorServiceResult | null> {
  const k = kode.toUpperCase();

  // Tanggal trading terbaru yang punya broker summary untuk emiten ini.
  const latest = await db
    .select({ tradeDate: brokerSummaryDaily.tradeDate })
    .from(brokerSummaryDaily)
    .where(eq(brokerSummaryDaily.companyKode, k))
    .orderBy(desc(brokerSummaryDaily.tradeDate))
    .limit(1);

  const tradeDate = latest[0]?.tradeDate;
  if (!tradeDate) return null;

  // Broker summary + metadata broker (kategori) via left join ke tabel brokers.
  const rows = await db
    .select({
      brokerCode: brokerSummaryDaily.brokerCode,
      brokerName: brokerSummaryDaily.brokerName,
      side: brokerSummaryDaily.side,
      volume: brokerSummaryDaily.volume,
      valueIdr: brokerSummaryDaily.valueIdr,
      netValueIdr: brokerSummaryDaily.netValueIdr,
      brokerKategori: brokers.kategori,
    })
    .from(brokerSummaryDaily)
    .leftJoin(brokers, eq(brokers.kode, brokerSummaryDaily.brokerCode))
    .where(
      and(
        eq(brokerSummaryDaily.companyKode, k),
        eq(brokerSummaryDaily.tradeDate, tradeDate),
      ),
    )
    .limit(2000);

  if (rows.length === 0) return null;

  const engineRows: ActorBrokerRow[] = rows.map((r) => ({
    brokerCode: r.brokerCode,
    brokerName: r.brokerName,
    side: r.side,
    volume: typeof r.volume === "bigint" ? Number(r.volume) : Number(r.volume ?? 0),
    valueIdr: Number(r.valueIdr ?? 0),
    netValueIdr: r.netValueIdr != null ? Number(r.netValueIdr) : null,
    brokerKategori: r.brokerKategori ?? null,
    // Skema `brokers` belum punya flag underwriter; biarkan null sampai vendor
    // menyediakan metadata. Engine memperlakukan null sebagai "bukan underwriter".
    isUnderwriter: null,
  }));

  // Foreign flow harian (otoritatif untuk pelaku FOREIGN) bila tersedia.
  const ff = await db
    .select({
      foreignBuyValue: foreignFlowDaily.foreignBuyValue,
      foreignSellValue: foreignFlowDaily.foreignSellValue,
      netValue: foreignFlowDaily.netValue,
    })
    .from(foreignFlowDaily)
    .where(
      and(
        eq(foreignFlowDaily.companyKode, k),
        eq(foreignFlowDaily.tradeDate, tradeDate),
      ),
    )
    .limit(1);

  const foreignFlow: ForeignFlowInput | null = ff[0]
    ? {
        foreignBuyValue: Number(ff[0].foreignBuyValue ?? 0),
        foreignSellValue: Number(ff[0].foreignSellValue ?? 0),
        netValue: Number(ff[0].netValue ?? 0),
      }
    : null;

  return {
    kode: k,
    tradeDate,
    result: classifyActors(engineRows, foreignFlow),
  };
}
