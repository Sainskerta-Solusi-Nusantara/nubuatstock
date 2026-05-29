import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { brokerSummaryDaily } from "@/db/schema/market";
import { analyzeSpike, type BrokerSummaryRow, type SpikeResult } from "@/lib/bandarmology/spike";

/**
 * Spike / Frequency Analyzer service — IMPROVEMENT_PLAN §3.C.4.
 *
 * Query broker summary harian dari DB lalu jalankan engine murni `analyzeSpike`.
 * Graceful degradation: kalau tabel kosong / data belum di-ingest (blokir vendor),
 * return null sehingga UI bisa menampilkan empty-state.
 */

export interface SpikeServiceResult {
  kode: string;
  tradeDate: string;
  result: SpikeResult;
}

/**
 * Ambil broker summary untuk tanggal terbaru yang tersedia bagi emiten `kode`,
 * lalu hitung konsentrasi transaksi.
 *
 * @returns null bila tidak ada data sama sekali (empty-state di UI).
 */
export async function computeSpike(kode: string): Promise<SpikeServiceResult | null> {
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

  const rows = await db
    .select({
      brokerCode: brokerSummaryDaily.brokerCode,
      brokerName: brokerSummaryDaily.brokerName,
      side: brokerSummaryDaily.side,
      volume: brokerSummaryDaily.volume,
      valueIdr: brokerSummaryDaily.valueIdr,
      netValueIdr: brokerSummaryDaily.netValueIdr,
    })
    .from(brokerSummaryDaily)
    .where(
      and(
        eq(brokerSummaryDaily.companyKode, k),
        eq(brokerSummaryDaily.tradeDate, tradeDate),
      ),
    )
    .limit(2000);

  if (rows.length === 0) return null;

  const engineRows: BrokerSummaryRow[] = rows.map((r) => ({
    brokerCode: r.brokerCode,
    brokerName: r.brokerName,
    side: r.side,
    volume: typeof r.volume === "bigint" ? Number(r.volume) : Number(r.volume ?? 0),
    valueIdr: Number(r.valueIdr ?? 0),
    netValueIdr: r.netValueIdr != null ? Number(r.netValueIdr) : null,
  }));

  return {
    kode: k,
    tradeDate,
    result: analyzeSpike(engineRows),
  };
}
