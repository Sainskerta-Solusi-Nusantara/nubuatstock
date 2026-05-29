import { and, desc, eq, gte } from "drizzle-orm";
import { db } from "@/lib/db";
import { brokers, brokerSummaryDaily } from "@/db/schema/market";
import {
  analyzeBrokerStalker,
  type BrokerStalkerResult,
  type StalkerBrokerRow,
} from "@/lib/bandarmology/broker-stalker";

/**
 * Broker Stalker service — IMPROVEMENT_PLAN §3.C.2.
 *
 * Query broker summary harian (window N hari terbaru) untuk emiten + join ke
 * tabel `brokers` (kategori → tag smart money), lalu jalankan engine murni
 * `analyzeBrokerStalker`.
 *
 * Graceful degradation: bila tabel kosong / data belum di-ingest (blokir vendor),
 * return null sehingga UI menampilkan empty-state. Tidak pernah melempar karena
 * data kosong. (Pola mengikuti spike-service.ts & four-actor-service.ts.)
 */

export interface BrokerStalkerServiceResult {
  kode: string;
  /** Window N hari yang dianalisis. */
  windowDays: number;
  /** Tanggal trading terbaru dalam window. */
  tradeDate: string;
  /** Tanggal trading terlama dalam window (batas bawah). */
  fromDate: string;
  result: BrokerStalkerResult;
}

/** Default window: 5 hari trading terakhir (~1 minggu bursa). */
const DEFAULT_WINDOW_DAYS = 5;
const MAX_ROWS = 5000;

/**
 * Lacak aktivitas broker untuk emiten `kode` dalam window `windowDays` hari
 * trading terbaru yang tersedia.
 *
 * @returns null bila tidak ada broker summary sama sekali (empty-state di UI).
 */
export async function computeBrokerStalker(
  kode: string,
  windowDays: number = DEFAULT_WINDOW_DAYS,
): Promise<BrokerStalkerServiceResult | null> {
  const k = kode.toUpperCase();
  const win = Math.max(1, Math.floor(windowDays));

  // Ambil daftar tanggal trading terbaru (distinct) untuk emiten ini, batasi window.
  const dates = await db
    .selectDistinct({ tradeDate: brokerSummaryDaily.tradeDate })
    .from(brokerSummaryDaily)
    .where(eq(brokerSummaryDaily.companyKode, k))
    .orderBy(desc(brokerSummaryDaily.tradeDate))
    .limit(win);

  if (dates.length === 0) return null;

  const tradeDate = dates[0]!.tradeDate; // terbaru
  const fromDate = dates[dates.length - 1]!.tradeDate; // terlama dalam window

  // Broker summary window + metadata kategori broker via left join.
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
        gte(brokerSummaryDaily.tradeDate, fromDate),
      ),
    )
    .limit(MAX_ROWS);

  if (rows.length === 0) return null;

  const engineRows: StalkerBrokerRow[] = rows.map((r) => ({
    brokerCode: r.brokerCode,
    brokerName: r.brokerName,
    side: r.side,
    volume: typeof r.volume === "bigint" ? Number(r.volume) : Number(r.volume ?? 0),
    valueIdr: Number(r.valueIdr ?? 0),
    netValueIdr: r.netValueIdr != null ? Number(r.netValueIdr) : null,
    brokerKategori: r.brokerKategori ?? null,
  }));

  return {
    kode: k,
    windowDays: dates.length,
    tradeDate,
    fromDate,
    result: analyzeBrokerStalker(engineRows),
  };
}
