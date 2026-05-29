/**
 * Spike Detection / Frequency Analyzer — IMPROVEMENT_PLAN §3.C.4
 *
 * Tujuan: deteksi KONSENTRASI transaksi, bukan sekadar volume tinggi.
 * Pertanyaan kunci bandarmology: apakah aktivitas hari ini didorong oleh
 * SATU pemain besar (1 bandar akumulasi/distribusi) atau tersebar merata
 * di banyak broker (retail noise)?
 *
 * Volume tinggi + konsentrasi tinggi  -> "spike" bandar (signal kuat).
 * Volume tinggi + konsentrasi rendah  -> ramai retail (noise, low conviction).
 *
 * Engine ini MURNI (pure): input = snapshot broker summary suatu emiten/hari,
 * output = skor konsentrasi + label + breakdown top broker. Tidak ada I/O.
 *
 * Metrik konsentrasi yang dihitung:
 *  1. Herfindahl-Hirschman Index (HHI) — sum of squared market shares (0..10000).
 *     10000 = monopoli (1 broker 100%); ~0 = ribuan broker merata.
 *  2. Top-1 broker share (%) — pangsa broker terbesar.
 *  3. Top-3 concentration ratio CR3 (%) — pangsa 3 broker terbesar.
 *  4. Effective number of brokers (1/normalizedHHI) — "berapa broker setara"
 *     kalau distribusi dianggap merata. Kecil = terkonsentrasi.
 *
 * Dihitung TERPISAH untuk sisi BUY dan sisi SELL, karena yang penting adalah:
 * "siapa yang akumulasi (buy terkonsentrasi)" vs "siapa yang distribusi
 * (sell terkonsentrasi)".
 */

// ============================== Input types ==============================

/**
 * Satu baris broker summary (sudah ternormalisasi dari DB).
 *
 * Skema `broker_summary_daily` menyimpan baris per (broker, side). Engine ini
 * menerima list mentah tersebut; agregasi per-broker dilakukan di dalam engine
 * supaya pemanggil tidak perlu tahu detail.
 */
export interface BrokerSummaryRow {
  brokerCode: string;
  brokerName?: string | null;
  /** "buy" | "sell" | "both" sesuai konvensi schema market.ts. */
  side: "buy" | "sell" | "both" | string;
  /** Volume lembar saham (boleh 0). */
  volume: number;
  /** Nilai transaksi IDR (boleh 0). */
  valueIdr: number;
  /**
   * Net value IDR (buy - sell). Dipakai untuk side "both" supaya bisa
   * memisahkan akumulator (net+) dari distributor (net-).
   */
  netValueIdr?: number | null;
}

export interface SpikeEngineOptions {
  /**
   * Metrik dasar yang dipakai untuk pangsa: "value" (IDR) atau "volume" (lembar).
   * Default "value" — lebih representatif untuk smart money (nominal besar).
   */
  basis?: "value" | "volume";
  /**
   * Ambang HHI ternormalisasi (0..1) untuk dianggap "spike konsentrasi".
   * Default 0.18 ~ setara CR3 tinggi / top-1 dominan (mirip ambang antitrust
   * "highly concentrated" >0.25 tapi diturunkan untuk pasar broker IDX yang
   * secara struktural lebih terkonsentrasi).
   */
  hhiSpikeThreshold?: number;
  /**
   * Ambang top-1 share (0..1) untuk label "akumulasi 1 bandar".
   * Default 0.40 — satu broker memegang >=40% sisi tersebut.
   */
  dominantBrokerThreshold?: number;
}

// ============================== Output types ==============================

export interface BrokerShare {
  brokerCode: string;
  brokerName: string | null;
  /** Nilai agregat pada basis terpilih (value IDR atau volume). */
  amount: number;
  /** Net value IDR (kalau tersedia). */
  netValueIdr: number;
  /** Pangsa terhadap total sisi tersebut (0..1). */
  share: number;
}

/** Metrik konsentrasi untuk satu sisi (buy / sell / combined). */
export interface ConcentrationMetrics {
  /** Total broker unik aktif pada sisi ini. */
  brokerCount: number;
  /** Total amount (basis terpilih) pada sisi ini. */
  total: number;
  /** HHI mentah, skala 0..10000 (basis poin pangsa kuadrat). */
  hhi: number;
  /** HHI ternormalisasi 0..1 (hhi / 10000). */
  hhiNormalized: number;
  /** Pangsa broker terbesar (0..1). */
  top1Share: number;
  /** Concentration ratio 3 broker terbesar (0..1). */
  cr3: number;
  /** Jumlah broker "efektif" = 1/hhiNormalized (>=1). Inf-guard ke brokerCount. */
  effectiveBrokers: number;
  /** Top broker (desc by amount), maksimal `topN`. */
  topBrokers: BrokerShare[];
}

export type SpikeLabel =
  | "akumulasi_1_bandar" // buy sangat terkonsentrasi di 1 broker
  | "distribusi_1_bandar" // sell sangat terkonsentrasi di 1 broker
  | "akumulasi_terkonsentrasi" // buy terkonsentrasi di sedikit broker
  | "distribusi_terkonsentrasi" // sell terkonsentrasi di sedikit broker
  | "distribusi_retail_merata" // tersebar merata, tidak ada dominan
  | "tidak_ada_data";

export interface SpikeResult {
  /** true bila salah satu sisi melewati ambang konsentrasi. */
  isSpike: boolean;
  /**
   * Skor konsentrasi 0..100 — diambil dari sisi paling terkonsentrasi
   * (max dari hhiNormalized buy vs sell), diskalakan ke 0..100.
   */
  score: number;
  label: SpikeLabel;
  /** Sisi yang mendominasi sinyal: "buy" | "sell" | null (merata). */
  dominantSide: "buy" | "sell" | null;
  buy: ConcentrationMetrics;
  sell: ConcentrationMetrics;
  /** Basis yang dipakai. */
  basis: "value" | "volume";
  /** Penjelasan ringkas untuk UI / AI narrative (Bahasa Indonesia). */
  summary: string;
}

// ============================== Defaults ==============================

const DEFAULTS: Required<SpikeEngineOptions> = {
  basis: "value",
  hhiSpikeThreshold: 0.18,
  dominantBrokerThreshold: 0.4,
};

const TOP_N = 5;
const EMPTY_METRICS: ConcentrationMetrics = {
  brokerCount: 0,
  total: 0,
  hhi: 0,
  hhiNormalized: 0,
  top1Share: 0,
  cr3: 0,
  effectiveBrokers: 0,
  topBrokers: [],
};

// ============================== Core helpers ==============================

/**
 * Pisahkan rows mentah ke dua bucket buy & sell, agregat per broker.
 *
 * - side "buy" / "sell" -> langsung masuk bucket masing-masing.
 * - side "both" -> dipisah berdasarkan tanda netValueIdr: net+ dianggap
 *   akumulator (buy bucket, amount = |net| atau value), net- distributor.
 *   Kalau netValueIdr tidak ada, baris "both" dimasukkan ke buy dan sell
 *   secara proporsional tidak mungkin -> fallback: pakai value penuh di buy.
 */
function bucketize(
  rows: BrokerSummaryRow[],
  basis: "value" | "volume",
): {
  buy: Map<string, { name: string | null; amount: number; net: number }>;
  sell: Map<string, { name: string | null; amount: number; net: number }>;
} {
  const buy = new Map<string, { name: string | null; amount: number; net: number }>();
  const sell = new Map<string, { name: string | null; amount: number; net: number }>();

  const amountOf = (r: BrokerSummaryRow): number =>
    basis === "volume" ? Math.abs(r.volume) : Math.abs(r.valueIdr);

  const add = (
    map: Map<string, { name: string | null; amount: number; net: number }>,
    code: string,
    name: string | null,
    amount: number,
    net: number,
  ): void => {
    if (amount <= 0) return;
    const cur = map.get(code) ?? { name, amount: 0, net: 0 };
    cur.amount += amount;
    cur.net += net;
    if (name && !cur.name) cur.name = name;
    map.set(code, cur);
  };

  for (const r of rows) {
    const name = r.brokerName ?? null;
    const net = Number(r.netValueIdr ?? 0);
    const amount = amountOf(r);
    const side = String(r.side).toLowerCase();

    if (side === "buy") {
      add(buy, r.brokerCode, name, amount, net);
    } else if (side === "sell") {
      add(sell, r.brokerCode, name, amount, net);
    } else {
      // "both" / unknown: gunakan tanda net untuk klasifikasi sisi.
      if (net > 0) add(buy, r.brokerCode, name, amount, net);
      else if (net < 0) add(sell, r.brokerCode, name, amount, net);
      else add(buy, r.brokerCode, name, amount, net); // netral -> buy bucket
    }
  }

  return { buy, sell };
}

function concentration(
  map: Map<string, { name: string | null; amount: number; net: number }>,
): ConcentrationMetrics {
  const entries = Array.from(map.entries());
  const total = entries.reduce((a, [, v]) => a + v.amount, 0);
  if (entries.length === 0 || total <= 0) return EMPTY_METRICS;

  const shares = entries
    .map(([code, v]) => ({
      brokerCode: code,
      brokerName: v.name,
      amount: v.amount,
      netValueIdr: v.net,
      share: v.amount / total,
    }))
    .sort((a, b) => b.amount - a.amount);

  // HHI = sum of (share% )^2, share% in 0..100 -> 0..10000.
  const hhi = shares.reduce((acc, s) => acc + (s.share * 100) ** 2, 0);
  const hhiNormalized = hhi / 10000;
  const top1Share = shares[0]?.share ?? 0;
  const cr3 = shares.slice(0, 3).reduce((a, s) => a + s.share, 0);
  const effectiveBrokers = hhiNormalized > 0 ? 1 / hhiNormalized : shares.length;

  return {
    brokerCount: shares.length,
    total,
    hhi,
    hhiNormalized,
    top1Share,
    cr3,
    effectiveBrokers,
    topBrokers: shares.slice(0, TOP_N),
  };
}

// ============================== Public engine ==============================

/**
 * Hitung metrik konsentrasi & deteksi spike dari broker summary satu emiten/hari.
 *
 * Pure function — deterministik, tanpa I/O. Aman dipanggil di server/client.
 */
export function analyzeSpike(
  rows: BrokerSummaryRow[],
  options: SpikeEngineOptions = {},
): SpikeResult {
  const opts = { ...DEFAULTS, ...options };

  if (!rows || rows.length === 0) {
    return {
      isSpike: false,
      score: 0,
      label: "tidak_ada_data",
      dominantSide: null,
      buy: EMPTY_METRICS,
      sell: EMPTY_METRICS,
      basis: opts.basis,
      summary: "Belum ada data broker summary untuk dianalisis.",
    };
  }

  const { buy, sell } = bucketize(rows, opts.basis);
  const buyMetrics = concentration(buy);
  const sellMetrics = concentration(sell);

  // Sisi paling terkonsentrasi menentukan sinyal utama.
  const buyConc = buyMetrics.hhiNormalized;
  const sellConc = sellMetrics.hhiNormalized;
  const maxConc = Math.max(buyConc, sellConc);
  const dominantSide: "buy" | "sell" | null =
    maxConc <= 0 ? null : buyConc >= sellConc ? "buy" : "sell";

  const score = Math.round(Math.min(1, maxConc) * 100);
  const isSpike = maxConc >= opts.hhiSpikeThreshold;

  const dom = dominantSide === "sell" ? sellMetrics : buyMetrics;
  const label = classify({
    isSpike,
    dominantSide,
    top1Share: dom.top1Share,
    dominantBrokerThreshold: opts.dominantBrokerThreshold,
  });

  return {
    isSpike,
    score,
    label,
    dominantSide,
    buy: buyMetrics,
    sell: sellMetrics,
    basis: opts.basis,
    summary: buildSummary(label, dom, dominantSide),
  };
}

function classify(args: {
  isSpike: boolean;
  dominantSide: "buy" | "sell" | null;
  top1Share: number;
  dominantBrokerThreshold: number;
}): SpikeLabel {
  const { isSpike, dominantSide, top1Share, dominantBrokerThreshold } = args;
  if (dominantSide === null) return "distribusi_retail_merata";
  if (!isSpike) return "distribusi_retail_merata";

  const isAccum = dominantSide === "buy";
  if (top1Share >= dominantBrokerThreshold) {
    return isAccum ? "akumulasi_1_bandar" : "distribusi_1_bandar";
  }
  return isAccum ? "akumulasi_terkonsentrasi" : "distribusi_terkonsentrasi";
}

/** Label manusiawi (untuk UI badge & AI narrative). */
export const SPIKE_LABEL_TEXT: Record<SpikeLabel, string> = {
  akumulasi_1_bandar: "Akumulasi 1 Bandar",
  distribusi_1_bandar: "Distribusi 1 Bandar",
  akumulasi_terkonsentrasi: "Akumulasi Terkonsentrasi",
  distribusi_terkonsentrasi: "Distribusi Terkonsentrasi",
  distribusi_retail_merata: "Distribusi Retail Merata",
  tidak_ada_data: "Tidak Ada Data",
};

function buildSummary(
  label: SpikeLabel,
  dom: ConcentrationMetrics,
  dominantSide: "buy" | "sell" | null,
): string {
  const top = dom.topBrokers[0];
  const pct = (top?.share ?? 0) * 100;
  const eff = dom.effectiveBrokers;
  const sideWord = dominantSide === "sell" ? "jual" : "beli";

  switch (label) {
    case "akumulasi_1_bandar":
      return `Satu broker (${top?.brokerCode ?? "?"}) mendominasi sisi beli dengan ${pct.toFixed(
        0,
      )}% pangsa — indikasi akumulasi oleh satu bandar besar, bukan minat retail.`;
    case "distribusi_1_bandar":
      return `Satu broker (${top?.brokerCode ?? "?"}) mendominasi sisi jual dengan ${pct.toFixed(
        0,
      )}% pangsa — indikasi distribusi terarah oleh satu pemain besar.`;
    case "akumulasi_terkonsentrasi":
      return `Sisi beli terkonsentrasi di ~${eff.toFixed(
        1,
      )} broker efektif (top broker ${pct.toFixed(0)}%) — smart money mengakumulasi.`;
    case "distribusi_terkonsentrasi":
      return `Sisi jual terkonsentrasi di ~${eff.toFixed(
        1,
      )} broker efektif (top broker ${pct.toFixed(0)}%) — distribusi oleh sedikit pemain.`;
    case "distribusi_retail_merata":
      return `Transaksi tersebar merata (${dom.brokerCount} broker, top ${sideWord} hanya ${pct.toFixed(
        0,
      )}%) — pola khas aktivitas retail, bukan satu bandar dominan.`;
    case "tidak_ada_data":
    default:
      return "Belum ada data broker summary untuk dianalisis.";
  }
}
