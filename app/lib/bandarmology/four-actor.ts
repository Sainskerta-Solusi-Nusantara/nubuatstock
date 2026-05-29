/**
 * 4-Pelaku Classification Engine — IMPROVEMENT_PLAN §3.C.3
 *
 * Adaptasi Nubuat dari bandarmology (NeoBDM-inspired): mengklasifikasikan
 * aktivitas broker/flow harian ke EMPAT PELAKU pasar untuk satu emiten/hari,
 * lalu mengagregasi net buy/sell + pangsa (share) per pelaku dan menentukan
 * pelaku dominan.
 *
 * Taksonomi (DIFFERENSIATOR Nubuat):
 *  1. FOREIGN ("Asing")        — flow asing (dari foreign_flow_daily) atau broker
 *                                berkategori "foreign". Smart money lintas-negara.
 *  2. NON_RETAIL ("Institusi") — broker besar / sekuritas institusi domestik
 *                                (kategori "domestic" non-foreign) dengan tiket
 *                                rata-rata besar. Bukan ritel.
 *  3. SULTAN ("Sultanmologi")  — RITEL KAKAP: broker ritel/lokal namun dengan
 *                                NILAI transaksi sangat besar & terkonsentrasi
 *                                (whale ritel). Pola "ritel tapi bukan retail biasa".
 *  4. ZOMBI ("Zombimologi")    — bandar IPO / underwriter / market-maker:
 *                                broker yang ditandai underwriter ATAU pola tiket
 *                                kecil masif (churn/penjaga harga). "Zombie" karena
 *                                aktivitas tinggi tapi tidak meninggalkan jejak
 *                                akumulasi bersih.
 *  + RETAIL ("Ritel")          — sisa: broker kecil tersebar, tiket kecil,
 *                                noise ritel biasa. (Bukan salah satu dari 4 pelaku
 *                                utama, tapi tetap diagregasi sebagai baseline.)
 *
 * ASUMSI & DISCLAIMER (PENTING):
 *  - Taksonomi ini adalah ADAPTASI HEURISTIK, BUKAN klaim identitas pasti.
 *    IDX tidak mengungkap identitas pemodal di balik kode broker; klasifikasi
 *    didasarkan pada (a) metadata broker (kategori, flag underwriter) bila ada,
 *    dan (b) pola statistik transaksi (nilai, konsentrasi, avg ticket).
 *  - Heuristik konfigurable via `FourActorOptions` supaya bisa dikalibrasi saat
 *    data real masuk (saat ini placeholder karena blokir vendor).
 *  - Engine MURNI (pure): input = snapshot baris broker + (opsional) flow asing,
 *    output = agregasi per pelaku. Tidak ada I/O. Aman di server/client.
 *
 * Catatan integrasi: input baris broker reuse bentuk `BrokerSummaryRow`
 * dari spike.ts agar service layer bisa pakai query yang sama, ditambah field
 * metadata opsional (`brokerKategori`, `isUnderwriter`).
 */

import type { BrokerSummaryRow } from "@/lib/bandarmology/spike";

// ============================== Input types ==============================

/**
 * Baris broker summary diperkaya metadata untuk klasifikasi pelaku.
 * Superset dari `BrokerSummaryRow` (spike.ts) — service boleh mengisi metadata
 * dari join ke tabel `brokers` bila tersedia.
 */
export interface ActorBrokerRow extends BrokerSummaryRow {
  /** Kategori broker dari tabel `brokers`: "foreign" | "domestic" | "local". */
  brokerKategori?: string | null;
  /** True bila broker dikenal sebagai underwriter/penjamin emisi (pola Zombimologi). */
  isUnderwriter?: boolean | null;
}

/**
 * Agregat foreign flow harian (dari foreign_flow_daily). Opsional — bila tersedia
 * dipakai sebagai sumber otoritatif untuk pelaku FOREIGN (lebih akurat daripada
 * menebak dari kategori broker).
 */
export interface ForeignFlowInput {
  foreignBuyValue: number;
  foreignSellValue: number;
  /** net = buy - sell (positif = inflow). */
  netValue: number;
}

export interface FourActorOptions {
  /** Basis pangsa: "value" (IDR) atau "volume" (lembar). Default "value". */
  basis?: "value" | "volume";
  /**
   * Ambang nilai transaksi (IDR) agar broker ritel/lokal dipromosikan ke
   * SULTAN ("ritel kakap"). Default 5e9 (Rp5 miliar) — whale ritel.
   */
  sultanValueThreshold?: number;
  /**
   * Ambang pangsa (0..1) broker ritel/lokal terhadap total agar dianggap SULTAN
   * (terkonsentrasi, bukan tersebar). Default 0.15 (>=15% dari satu sisi total).
   */
  sultanShareThreshold?: number;
  /**
   * Ambang rata-rata nilai per "tiket" (value / max(volume,1) tidak dipakai;
   * di sini avg ticket = value per baris) agar broker domestik dianggap
   * NON_RETAIL institusi. Default 1e9 (Rp1 miliar avg ticket).
   *
   * Catatan: dengan data broker summary harian (1 baris agregat/broker/side),
   * avg ticket = total value broker tsb. Heuristik ini berguna saat granular
   * trade-level tersedia; untuk daily agregat, kategori broker jadi sinyal utama.
   */
  nonRetailAvgTicketThreshold?: number;
}

// ============================== Taxonomy ==============================

export type ActorClass =
  | "foreign"
  | "non_retail"
  | "sultan"
  | "zombi"
  | "retail";

/** Empat pelaku utama (differensiator) + retail baseline. */
export const ACTOR_CLASSES: ActorClass[] = [
  "foreign",
  "non_retail",
  "sultan",
  "zombi",
  "retail",
];

/** Label manusiawi (UI badge & AI narrative, Bahasa Indonesia). */
export const ACTOR_LABEL_TEXT: Record<ActorClass, string> = {
  foreign: "Foreign (Asing)",
  non_retail: "Non-Retail (Institusi)",
  sultan: "Sultanmologi (Ritel Kakap)",
  zombi: "Zombimologi (Bandar IPO)",
  retail: "Ritel",
};

/** Deskripsi singkat tiap pelaku untuk tooltip/legend. */
export const ACTOR_DESC_TEXT: Record<ActorClass, string> = {
  foreign:
    "Aliran dana asing (foreign flow / broker asing). Sering jadi penggerak tren jangka menengah.",
  non_retail:
    "Sekuritas institusi domestik dengan tiket besar. Pemain serius non-ritel.",
  sultan:
    "Ritel kakap (whale): broker ritel/lokal dengan nilai transaksi sangat besar & terkonsentrasi.",
  zombi:
    "Bandar IPO / underwriter / market-maker: aktivitas tinggi tanpa jejak akumulasi bersih.",
  retail:
    "Ritel biasa: broker kecil tersebar, tiket kecil — baseline noise pasar.",
};

// ============================== Output types ==============================

export interface ActorAggregate {
  actor: ActorClass;
  /** Total amount sisi BELI (basis terpilih). */
  buyAmount: number;
  /** Total amount sisi JUAL (basis terpilih). */
  sellAmount: number;
  /** Net = buy - sell (basis terpilih). Positif = akumulasi bersih. */
  netAmount: number;
  /** Total amount (buy + sell) — dipakai untuk pangsa aktivitas. */
  grossAmount: number;
  /** Pangsa aktivitas (gross) terhadap total pasar hari itu (0..1). */
  share: number;
  /** Jumlah broker unik yang masuk pelaku ini. */
  brokerCount: number;
}

export interface FourActorResult {
  /** Agregasi per pelaku (selalu 5 entri, urut ACTOR_CLASSES). */
  actors: ActorAggregate[];
  /** Pelaku dengan pangsa aktivitas (gross) terbesar; null bila tidak ada data. */
  dominantActor: ActorClass | null;
  /** Pelaku dengan net buy (akumulasi) terbesar; null bila tidak ada/semua <=0. */
  topAccumulator: ActorClass | null;
  /** Pelaku dengan net sell (distribusi) terbesar; null bila tidak ada/semua >=0. */
  topDistributor: ActorClass | null;
  /** Total gross amount seluruh pasar hari itu (basis terpilih). */
  totalGross: number;
  basis: "value" | "volume";
  /** true bila ada data sama sekali. */
  hasData: boolean;
  /** Penjelasan ringkas untuk UI/AI (Bahasa Indonesia). */
  summary: string;
}

// ============================== Defaults ==============================

const DEFAULTS: Required<FourActorOptions> = {
  basis: "value",
  sultanValueThreshold: 5_000_000_000,
  sultanShareThreshold: 0.15,
  nonRetailAvgTicketThreshold: 1_000_000_000,
};

function emptyAggregate(actor: ActorClass): ActorAggregate {
  return {
    actor,
    buyAmount: 0,
    sellAmount: 0,
    netAmount: 0,
    grossAmount: 0,
    share: 0,
    brokerCount: 0,
  };
}

// ============================== Classification heuristics ==============================

/** Per-broker rollup (kedua sisi) sebelum klasifikasi. */
interface BrokerRollup {
  code: string;
  kategori: string | null;
  isUnderwriter: boolean;
  buyAmount: number;
  sellAmount: number;
  /** Net dalam basis amount (buy - sell). */
  netAmount: number;
}

function amountOf(r: BrokerSummaryRow, basis: "value" | "volume"): number {
  return basis === "volume" ? Math.abs(r.volume) : Math.abs(r.valueIdr);
}

/**
 * Rollup baris mentah per broker, memisahkan sisi buy & sell.
 * side "both" dipisah berdasarkan tanda netValueIdr (konsisten dengan spike.ts).
 */
function rollupByBroker(rows: ActorBrokerRow[], basis: "value" | "volume"): Map<string, BrokerRollup> {
  const map = new Map<string, BrokerRollup>();

  const ensure = (r: ActorBrokerRow): BrokerRollup => {
    let cur = map.get(r.brokerCode);
    if (!cur) {
      cur = {
        code: r.brokerCode,
        kategori: r.brokerKategori ? String(r.brokerKategori).toLowerCase() : null,
        isUnderwriter: Boolean(r.isUnderwriter),
        buyAmount: 0,
        sellAmount: 0,
        netAmount: 0,
      };
      map.set(r.brokerCode, cur);
    } else {
      // Lengkapi metadata bila baris lain membawa info.
      if (!cur.kategori && r.brokerKategori) cur.kategori = String(r.brokerKategori).toLowerCase();
      if (!cur.isUnderwriter && r.isUnderwriter) cur.isUnderwriter = true;
    }
    return cur;
  };

  for (const r of rows) {
    const amount = amountOf(r, basis);
    if (amount <= 0) continue;
    const cur = ensure(r);
    const side = String(r.side).toLowerCase();
    const net = Number(r.netValueIdr ?? 0);

    if (side === "buy") {
      cur.buyAmount += amount;
      cur.netAmount += amount;
    } else if (side === "sell") {
      cur.sellAmount += amount;
      cur.netAmount -= amount;
    } else {
      // "both"/unknown: klasifikasi sisi dari tanda net.
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

/**
 * Klasifikasikan satu broker ke pelaku berdasarkan metadata + pola statistik.
 *
 * Urutan prioritas (deterministik):
 *  1. FOREIGN   — kategori broker "foreign".
 *  2. ZOMBI     — flag underwriter.
 *  3. NON_RETAIL— kategori "domestic" (sekuritas institusi).
 *  4. SULTAN    — kategori "local"/null TAPI gross value sangat besar &
 *                 terkonsentrasi (>= ambang nilai & pangsa) -> ritel kakap.
 *  5. RETAIL    — sisanya.
 *
 * `gross` & `share` diteruskan agar promosi SULTAN bisa menilai skala.
 */
function classifyBroker(
  b: BrokerRollup,
  gross: number,
  share: number,
  opts: Required<FourActorOptions>,
): ActorClass {
  if (b.kategori === "foreign") return "foreign";
  if (b.isUnderwriter) return "zombi";
  if (b.kategori === "domestic") {
    // Sekuritas institusi domestik. Bila tiket besar -> non-retail tegas;
    // tetap non-retail walau kecil (kategori sudah menandakan institusi).
    return "non_retail";
  }
  // kategori "local" / null / unknown: kandidat ritel.
  // Promosi ke SULTAN bila nilai besar & terkonsentrasi (whale ritel).
  if (gross >= opts.sultanValueThreshold && share >= opts.sultanShareThreshold) {
    return "sultan";
  }
  return "retail";
}

// ============================== Public engine ==============================

/**
 * Klasifikasikan aktivitas broker/flow satu emiten/hari ke 4 pelaku + retail.
 *
 * @param rows  Baris broker summary (boleh kosong).
 * @param foreignFlow  (opsional) agregat foreign flow harian — bila ada, dipakai
 *   sebagai sumber otoritatif pelaku FOREIGN (menggantikan/menambah broker asing).
 * @param options heuristik konfigurable.
 */
export function classifyActors(
  rows: ActorBrokerRow[],
  foreignFlow?: ForeignFlowInput | null,
  options: FourActorOptions = {},
): FourActorResult {
  const opts = { ...DEFAULTS, ...options };

  const hasBrokerRows = Boolean(rows && rows.length > 0);
  const hasForeign = Boolean(
    foreignFlow &&
      (foreignFlow.foreignBuyValue !== 0 ||
        foreignFlow.foreignSellValue !== 0 ||
        foreignFlow.netValue !== 0),
  );

  if (!hasBrokerRows && !hasForeign) {
    return {
      actors: ACTOR_CLASSES.map(emptyAggregate),
      dominantActor: null,
      topAccumulator: null,
      topDistributor: null,
      totalGross: 0,
      basis: opts.basis,
      hasData: false,
      summary: "Belum ada data broker summary / foreign flow untuk diklasifikasi.",
    };
  }

  // Inisialisasi akumulator per pelaku.
  const agg = new Map<ActorClass, ActorAggregate>();
  for (const c of ACTOR_CLASSES) agg.set(c, emptyAggregate(c));

  const rollups = hasBrokerRows ? rollupByBroker(rows, opts.basis) : new Map<string, BrokerRollup>();

  // Total gross pasar (untuk share). Dihitung sebelum klasifikasi.
  const marketGross = Array.from(rollups.values()).reduce(
    (a, b) => a + b.buyAmount + b.sellAmount,
    0,
  );

  for (const b of rollups.values()) {
    const grossBroker = b.buyAmount + b.sellAmount;
    const shareBroker = marketGross > 0 ? grossBroker / marketGross : 0;
    const cls = classifyBroker(b, grossBroker, shareBroker, opts);
    const a = agg.get(cls)!;
    a.buyAmount += b.buyAmount;
    a.sellAmount += b.sellAmount;
    a.netAmount += b.netAmount;
    a.grossAmount += grossBroker;
    a.brokerCount += 1;
  }

  // Foreign flow otoritatif: kalau disediakan & basis value, override/tambah FOREIGN.
  // Catatan: foreign_flow_daily hanya punya VALUE (IDR), jadi diabaikan saat
  // basis "volume" agar tidak mencampur satuan (kecuali volume juga disediakan).
  if (hasForeign && foreignFlow && opts.basis === "value") {
    const f = agg.get("foreign")!;
    // Bila ada broker asing yang sudah diklasifikasi, foreign flow dianggap
    // sumber lebih lengkap -> pakai nilai dari flow (replace), supaya tidak dobel.
    f.buyAmount = Math.abs(foreignFlow.foreignBuyValue);
    f.sellAmount = Math.abs(foreignFlow.foreignSellValue);
    f.netAmount = foreignFlow.netValue;
    f.grossAmount = f.buyAmount + f.sellAmount;
    if (f.brokerCount === 0 && f.grossAmount > 0) f.brokerCount = 1;
  }

  // Total gross final (termasuk foreign flow yang mungkin di-override).
  const totalGross = ACTOR_CLASSES.reduce((sum, c) => sum + agg.get(c)!.grossAmount, 0);

  // Hitung share final.
  for (const c of ACTOR_CLASSES) {
    const a = agg.get(c)!;
    a.share = totalGross > 0 ? a.grossAmount / totalGross : 0;
  }

  const actors = ACTOR_CLASSES.map((c) => agg.get(c)!);

  // Dominan = pangsa aktivitas terbesar di antara yang punya gross > 0.
  let dominantActor: ActorClass | null = null;
  let topAccumulator: ActorClass | null = null;
  let topDistributor: ActorClass | null = null;
  let maxGross = 0;
  let maxNet = 0;
  let minNet = 0;
  for (const a of actors) {
    if (a.grossAmount > maxGross) {
      maxGross = a.grossAmount;
      dominantActor = a.actor;
    }
    if (a.netAmount > maxNet) {
      maxNet = a.netAmount;
      topAccumulator = a.actor;
    }
    if (a.netAmount < minNet) {
      minNet = a.netAmount;
      topDistributor = a.actor;
    }
  }

  return {
    actors,
    dominantActor,
    topAccumulator,
    topDistributor,
    totalGross,
    basis: opts.basis,
    hasData: totalGross > 0,
    summary: buildSummary({ actors, dominantActor, topAccumulator, topDistributor, totalGross }),
  };
}

function buildSummary(args: {
  actors: ActorAggregate[];
  dominantActor: ActorClass | null;
  topAccumulator: ActorClass | null;
  topDistributor: ActorClass | null;
  totalGross: number;
}): string {
  const { dominantActor, topAccumulator, topDistributor, actors, totalGross } = args;
  if (!dominantActor || totalGross <= 0) {
    return "Belum ada data aktivitas yang cukup untuk klasifikasi 4 pelaku.";
  }
  const byClass = new Map(actors.map((a) => [a.actor, a]));
  const dom = byClass.get(dominantActor)!;
  const domPct = (dom.share * 100).toFixed(0);

  const parts: string[] = [
    `${ACTOR_LABEL_TEXT[dominantActor]} mendominasi aktivitas (${domPct}% dari turnover hari ini).`,
  ];

  if (topAccumulator) {
    parts.push(`Akumulasi bersih terbesar oleh ${ACTOR_LABEL_TEXT[topAccumulator]}.`);
  }
  if (topDistributor && topDistributor !== topAccumulator) {
    parts.push(`Distribusi bersih terbesar oleh ${ACTOR_LABEL_TEXT[topDistributor]}.`);
  }
  parts.push(
    "Catatan: klasifikasi pelaku adalah heuristik adaptasi (bukan identitas pasti pemodal).",
  );
  return parts.join(" ");
}
