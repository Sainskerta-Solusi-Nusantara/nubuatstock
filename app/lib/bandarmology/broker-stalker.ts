/**
 * Broker Stalker — IMPROVEMENT_PLAN §3.C.2 (NeoBDM-inspired).
 *
 * Tujuan: LACAK aktivitas per-broker pada suatu emiten dalam window N hari.
 * Pertanyaan kunci bandarmology:
 *  - Broker mana yang NET-BUY (akumulator) vs NET-SELL (distributor) belakangan ini?
 *  - Apakah "smart money" (broker asing/institusi) sedang akumulasi atau distribusi?
 *  - Apakah ritel sedang melawan smart money (sinyal contrarian)?
 *
 * "Smart money bias" = perbandingan NET (akumulasi bersih) broker
 * foreign/institusi VS broker ritel. Bila smart money net-buy & ritel net-sell
 * → bias BULLISH (smart money mengakumulasi sementara ritel panik jual =
 * peluang contrarian). Sebaliknya bila smart money net-sell & ritel net-buy →
 * bias BEARISH (distribusi terselubung; ritel jadi "exit liquidity").
 *
 * Engine ini MURNI (pure): input = baris broker summary (window N hari) +
 * metadata kategori broker, output = ranking + tag + bias. Tidak ada I/O.
 * Pola mengikuti lib/bandarmology/spike.ts & four-actor.ts (jangan edit file itu).
 *
 * ASUMSI & DISCLAIMER:
 *  - Tag "smart money" adalah ADAPTASI HEURISTIK dari kategori broker
 *    (foreign/domestic/local), BUKAN klaim identitas pasti pemodal. IDX tidak
 *    mengungkap identitas di balik kode broker.
 *  - Konfigurable via opsi supaya bisa dikalibrasi saat data real masuk
 *    (saat ini placeholder karena blokir vendor).
 */

import type { BrokerSummaryRow } from "@/lib/bandarmology/spike";

// ============================== Input types ==============================

/**
 * Baris broker summary diperkaya metadata kategori untuk tagging smart money.
 * Superset dari `BrokerSummaryRow` (spike.ts) — service mengisi `brokerKategori`
 * dari join ke tabel `brokers`. Window N hari = banyak baris per broker.
 */
export interface StalkerBrokerRow extends BrokerSummaryRow {
  /** Kategori broker dari tabel `brokers`: "foreign" | "domestic" | "local". */
  brokerKategori?: string | null;
}

export interface BrokerStalkerOptions {
  /**
   * Basis ranking & net: "value" (IDR) atau "volume" (lembar). Default "value"
   * — lebih representatif untuk smart money (nominal besar).
   */
  basis?: "value" | "volume";
  /** Jumlah broker teratas yang dikembalikan per ranking (akumulator/distributor). Default 5. */
  topN?: number;
  /**
   * Ambang magnitudo bias (0..1) terhadap total gross untuk dianggap signifikan.
   * |smartNet - retailNet| / totalGross >= ambang → bias kuat. Default 0.05.
   */
  biasThreshold?: number;
}

// ============================== Taxonomy ==============================

/** Tag pelaku per-broker untuk pewarnaan UI & agregasi smart-money. */
export type BrokerTag = "foreign" | "institusi" | "retail";

export const BROKER_TAGS: BrokerTag[] = ["foreign", "institusi", "retail"];

/** Label manusiawi (UI badge, Bahasa Indonesia). */
export const BROKER_TAG_TEXT: Record<BrokerTag, string> = {
  foreign: "Foreign (Asing)",
  institusi: "Institusi",
  retail: "Ritel",
};

/** Deskripsi singkat per tag (tooltip/legend). */
export const BROKER_TAG_DESC: Record<BrokerTag, string> = {
  foreign: "Broker asing — aliran dana lintas-negara, sering penggerak tren (smart money).",
  institusi: "Sekuritas institusi domestik — pemain serius non-ritel (smart money).",
  retail: "Broker ritel/lokal — baseline noise pasar, dipakai sinyal contrarian.",
};

/** True bila tag tergolong "smart money" (foreign + institusi). */
export function isSmartMoney(tag: BrokerTag): boolean {
  return tag === "foreign" || tag === "institusi";
}

/** Map kategori broker (dari tabel `brokers`) ke tag pelaku. */
export function tagFromKategori(kategori: string | null | undefined): BrokerTag {
  const k = kategori ? String(kategori).toLowerCase() : "";
  if (k === "foreign") return "foreign";
  if (k === "domestic") return "institusi";
  // "local" / null / unknown → ritel (default contrarian baseline).
  return "retail";
}

// ============================== Output types ==============================

/** Agregat aktivitas satu broker sepanjang window. */
export interface BrokerActivity {
  brokerCode: string;
  brokerName: string | null;
  tag: BrokerTag;
  /** Total amount sisi BELI (basis terpilih). */
  buyAmount: number;
  /** Total amount sisi JUAL (basis terpilih). */
  sellAmount: number;
  /** Net = buy - sell (basis terpilih). Positif = net-buy (akumulasi). */
  netAmount: number;
  /** Total amount (buy + sell) — aktivitas kotor. */
  grossAmount: number;
  /** Jumlah hari (baris setelah rollup sisi) broker ini muncul. */
  days: number;
}

export type SmartMoneyBias = "bullish" | "bearish" | "netral" | "tidak_ada_data";

export const SMART_MONEY_BIAS_TEXT: Record<SmartMoneyBias, string> = {
  bullish: "Smart Money Akumulasi",
  bearish: "Smart Money Distribusi",
  netral: "Netral / Campur",
  tidak_ada_data: "Tidak Ada Data",
};

export interface SmartMoneySummary {
  bias: SmartMoneyBias;
  /** Net akumulasi smart money (foreign + institusi), basis terpilih. */
  smartNet: number;
  /** Net akumulasi ritel, basis terpilih. */
  retailNet: number;
  /** Net khusus foreign. */
  foreignNet: number;
  /** Net khusus institusi. */
  institusiNet: number;
  /** True bila smart money & ritel bergerak berlawanan (kandidat contrarian). */
  contrarian: boolean;
  /** Skor keyakinan bias 0..100 (magnitudo relatif terhadap total gross). */
  score: number;
}

export interface BrokerStalkerResult {
  /** true bila ada aktivitas broker sama sekali. */
  hasData: boolean;
  basis: "value" | "volume";
  /** Top akumulator (net-buy terbesar, desc), maksimal topN. */
  topAccumulators: BrokerActivity[];
  /** Top distributor (net-sell terbesar, desc by |net|), maksimal topN. */
  topDistributors: BrokerActivity[];
  /** Net per tag (foreign/institusi/retail) untuk ringkasan. */
  netByTag: Record<BrokerTag, number>;
  /** Total gross seluruh broker (basis terpilih). */
  totalGross: number;
  /** Jumlah broker unik aktif sepanjang window. */
  brokerCount: number;
  smartMoney: SmartMoneySummary;
  /** Penjelasan ringkas untuk UI / AI narrative (Bahasa Indonesia). */
  summary: string;
}

// ============================== Defaults ==============================

const DEFAULTS: Required<BrokerStalkerOptions> = {
  basis: "value",
  topN: 5,
  biasThreshold: 0.05,
};

function emptyResult(basis: "value" | "volume"): BrokerStalkerResult {
  return {
    hasData: false,
    basis,
    topAccumulators: [],
    topDistributors: [],
    netByTag: { foreign: 0, institusi: 0, retail: 0 },
    totalGross: 0,
    brokerCount: 0,
    smartMoney: {
      bias: "tidak_ada_data",
      smartNet: 0,
      retailNet: 0,
      foreignNet: 0,
      institusiNet: 0,
      contrarian: false,
      score: 0,
    },
    summary: "Belum ada data aktivitas broker untuk dianalisis.",
  };
}

// ============================== Core helpers ==============================

function amountOf(r: BrokerSummaryRow, basis: "value" | "volume"): number {
  return basis === "volume" ? Math.abs(r.volume) : Math.abs(r.valueIdr);
}

interface BrokerRollup {
  code: string;
  name: string | null;
  kategori: string | null;
  buyAmount: number;
  sellAmount: number;
  netAmount: number;
  days: number;
}

/**
 * Rollup baris mentah (window N hari) per broker, memisahkan sisi buy & sell.
 * side "both" dipisah berdasarkan tanda netValueIdr (konsisten dengan spike.ts
 * & four-actor.ts).
 */
function rollupByBroker(
  rows: StalkerBrokerRow[],
  basis: "value" | "volume",
): Map<string, BrokerRollup> {
  const map = new Map<string, BrokerRollup>();

  const ensure = (r: StalkerBrokerRow): BrokerRollup => {
    let cur = map.get(r.brokerCode);
    if (!cur) {
      cur = {
        code: r.brokerCode,
        name: r.brokerName ?? null,
        kategori: r.brokerKategori ? String(r.brokerKategori).toLowerCase() : null,
        buyAmount: 0,
        sellAmount: 0,
        netAmount: 0,
        days: 0,
      };
      map.set(r.brokerCode, cur);
    } else {
      if (!cur.name && r.brokerName) cur.name = r.brokerName;
      if (!cur.kategori && r.brokerKategori) {
        cur.kategori = String(r.brokerKategori).toLowerCase();
      }
    }
    return cur;
  };

  for (const r of rows) {
    const amount = amountOf(r, basis);
    if (amount <= 0) continue;
    const cur = ensure(r);
    cur.days += 1;
    const side = String(r.side).toLowerCase();
    const net = Number(r.netValueIdr ?? 0);

    if (side === "buy") {
      cur.buyAmount += amount;
      cur.netAmount += amount;
    } else if (side === "sell") {
      cur.sellAmount += amount;
      cur.netAmount -= amount;
    } else {
      // "both" / unknown: klasifikasi sisi dari tanda net.
      if (net > 0) {
        cur.buyAmount += amount;
        cur.netAmount += amount;
      } else if (net < 0) {
        cur.sellAmount += amount;
        cur.netAmount -= amount;
      } else {
        cur.buyAmount += amount;
        cur.netAmount += amount;
      }
    }
  }

  return map;
}

function classifyBias(
  smartNet: number,
  retailNet: number,
  totalGross: number,
  threshold: number,
): { bias: SmartMoneyBias; score: number } {
  if (totalGross <= 0) return { bias: "tidak_ada_data", score: 0 };
  // Magnitudo relatif: seberapa besar divergensi smart vs ritel terhadap pasar.
  const magnitude = Math.abs(smartNet) / totalGross;
  const score = Math.round(Math.min(1, magnitude) * 100);

  if (magnitude < threshold) return { bias: "netral", score };
  if (smartNet > 0) return { bias: "bullish", score };
  if (smartNet < 0) return { bias: "bearish", score };
  return { bias: "netral", score };
}

// ============================== Public engine ==============================

/**
 * Lacak aktivitas per-broker pada satu emiten dalam window N hari.
 *
 * Pure function — deterministik, tanpa I/O. Aman di server/client.
 *
 * @param rows  Baris broker summary window (boleh kosong).
 * @param options heuristik konfigurable (basis, topN, ambang bias).
 */
export function analyzeBrokerStalker(
  rows: StalkerBrokerRow[],
  options: BrokerStalkerOptions = {},
): BrokerStalkerResult {
  const opts = { ...DEFAULTS, ...options };

  if (!rows || rows.length === 0) return emptyResult(opts.basis);

  const rollups = rollupByBroker(rows, opts.basis);
  if (rollups.size === 0) return emptyResult(opts.basis);

  const activities: BrokerActivity[] = Array.from(rollups.values()).map((b) => {
    const tag = tagFromKategori(b.kategori);
    return {
      brokerCode: b.code,
      brokerName: b.name,
      tag,
      buyAmount: b.buyAmount,
      sellAmount: b.sellAmount,
      netAmount: b.netAmount,
      grossAmount: b.buyAmount + b.sellAmount,
      days: b.days,
    };
  });

  const totalGross = activities.reduce((a, b) => a + b.grossAmount, 0);

  const netByTag: Record<BrokerTag, number> = { foreign: 0, institusi: 0, retail: 0 };
  for (const a of activities) netByTag[a.tag] += a.netAmount;

  // Ranking. Akumulator = net > 0 desc; distributor = net < 0, urut paling negatif dulu.
  const topAccumulators = activities
    .filter((a) => a.netAmount > 0)
    .sort((a, b) => b.netAmount - a.netAmount)
    .slice(0, opts.topN);

  const topDistributors = activities
    .filter((a) => a.netAmount < 0)
    .sort((a, b) => a.netAmount - b.netAmount)
    .slice(0, opts.topN);

  const smartNet = netByTag.foreign + netByTag.institusi;
  const retailNet = netByTag.retail;
  const { bias, score } = classifyBias(smartNet, retailNet, totalGross, opts.biasThreshold);

  // Contrarian: smart money & ritel bergerak berlawanan arah (tanda berbeda).
  const contrarian =
    (smartNet > 0 && retailNet < 0) || (smartNet < 0 && retailNet > 0);

  const smartMoney: SmartMoneySummary = {
    bias,
    smartNet,
    retailNet,
    foreignNet: netByTag.foreign,
    institusiNet: netByTag.institusi,
    contrarian,
    score,
  };

  return {
    hasData: true,
    basis: opts.basis,
    topAccumulators,
    topDistributors,
    netByTag,
    totalGross,
    brokerCount: activities.length,
    smartMoney,
    summary: buildSummary(smartMoney, topAccumulators, topDistributors),
  };
}

function buildSummary(
  sm: SmartMoneySummary,
  accumulators: BrokerActivity[],
  distributors: BrokerActivity[],
): string {
  if (sm.bias === "tidak_ada_data") {
    return "Belum ada data aktivitas broker untuk dianalisis.";
  }

  const topAcc = accumulators[0];
  const topDist = distributors[0];
  const parts: string[] = [];

  switch (sm.bias) {
    case "bullish":
      parts.push(
        "Smart money (broker asing/institusi) sedang mengakumulasi bersih pada window ini.",
      );
      break;
    case "bearish":
      parts.push(
        "Smart money (broker asing/institusi) sedang distribusi bersih pada window ini.",
      );
      break;
    case "netral":
      parts.push("Aktivitas smart money relatif seimbang (net mendekati nol).");
      break;
    default:
      break;
  }

  if (topAcc) {
    parts.push(`Akumulator teratas: ${topAcc.brokerCode} (${BROKER_TAG_TEXT[topAcc.tag]}).`);
  }
  if (topDist) {
    parts.push(`Distributor teratas: ${topDist.brokerCode} (${BROKER_TAG_TEXT[topDist.tag]}).`);
  }
  if (sm.contrarian) {
    parts.push(
      sm.smartNet > 0
        ? "Ritel melawan arah (net-sell) sementara smart money beli — sinyal contrarian bullish."
        : "Ritel melawan arah (net-buy) sementara smart money jual — waspada, ritel jadi exit liquidity.",
    );
  }
  parts.push("Catatan: tag broker adalah heuristik adaptasi, bukan identitas pasti pemodal.");
  return parts.join(" ");
}
