/**
 * Market Summary — Time-Window Flow/Momentum (IMPROVEMENT_PLAN §2, NeoBDM signature).
 *
 * Tujuan: bandingkan flow/momentum suatu emiten LINTAS JENDELA WAKTU untuk
 * melihat PERGESERAN momentum — apakah akumulasi baru mulai, sedang menguat,
 * melemah, atau sudah berbalik jadi distribusi.
 *
 * Jendela waktu (signature NeoBDM, dari paling jauh ke paling dekat):
 *   W4 — 4 minggu lalu  (~hari trading ke 16..20 lalu)
 *   W3 — 3 minggu lalu  (~hari trading ke 11..15 lalu)
 *   W2 — 2 minggu lalu  (~hari trading ke  6..10 lalu)
 *   D3 — 3 hari lalu
 *   D2 — 2 hari lalu
 *   D1 — kemarin / hari terakhir
 *
 * Catatan: W1 (minggu lalu) sengaja dipecah jadi D3/D2/D1 supaya 3 hari terakhir
 * terlihat granular — itulah inti "momentum shift" jangka pendek vs tren mingguan.
 *
 * Engine MURNI (pure): input = deret nilai flow per-hari (paling baru di indeks 0
 * ATAU urut by tanggal — lihat normalisasi), output = ringkasan + nilai per jendela
 * + label pergeseran momentum. Tidak ada I/O.
 *
 * Metrik flow per hari (`value`) bersifat agnostik terhadap sumber:
 *  - foreign net value (foreign_flow_daily.net_value), ATAU
 *  - broker net value (broker_summary_daily net agg), ATAU
 *  - proxy price/volume momentum dari quotes_eod: volume × arah harga
 *    (close - prevClose >= 0 ? +volume : -volume) — dihitung di service layer.
 *
 * Positif = inflow / akumulasi; negatif = outflow / distribusi.
 */

// ============================== Input types ==============================

/**
 * Satu titik data harian (sudah ternormalisasi dari DB / proxy).
 */
export interface FlowPoint {
  /** Tanggal trading ISO (YYYY-MM-DD). */
  tradeDate: string;
  /**
   * Nilai flow hari itu. Positif = inflow/akumulasi, negatif = outflow/distribusi.
   * Bisa berupa net IDR, net broker, atau proxy volume×arah.
   */
  value: number;
}

export interface MarketSummaryOptions {
  /**
   * Ambang relatif (fraksi dari |nilai jendela sebelumnya|) untuk menganggap
   * perubahan antar jendela "signifikan". Default 0.15 (15%).
   */
  shiftThreshold?: number;
  /**
   * Label sumber data untuk ditampilkan di UI ("foreign" | "broker" | "proxy").
   * Tidak memengaruhi perhitungan; murni metadata.
   */
  source?: FlowSource;
}

export type FlowSource = "foreign" | "broker" | "proxy";

// ============================== Output types ==============================

export type WindowKey = "W4" | "W3" | "W2" | "D3" | "D2" | "D1";

/** Daftar jendela terurut dari paling jauh (W4) ke paling dekat (D1). */
export const WINDOW_ORDER: readonly WindowKey[] = ["W4", "W3", "W2", "D3", "D2", "D1"] as const;

export const WINDOW_LABEL: Record<WindowKey, string> = {
  W4: "4 minggu lalu",
  W3: "3 minggu lalu",
  W2: "2 minggu lalu",
  D3: "3 hari lalu",
  D2: "2 hari lalu",
  D1: "Kemarin",
};

export interface WindowValue {
  key: WindowKey;
  label: string;
  /** Total net flow dalam jendela ini. */
  net: number;
  /** Rata-rata net flow per hari dalam jendela. */
  avgPerDay: number;
  /** Jumlah hari trading dengan data dalam jendela. */
  days: number;
  /** Arah: "inflow" | "outflow" | "flat" (net mendekati 0 / tanpa data). */
  direction: FlowDirection;
}

export type FlowDirection = "inflow" | "outflow" | "flat";

export type MomentumShift =
  | "akumulasi_menguat" // inflow makin besar dari W4 -> D1
  | "akumulasi_melemah" // masih inflow tapi mengecil
  | "distribusi_menguat" // outflow makin besar
  | "distribusi_melemah" // masih outflow tapi mengecil
  | "berbalik_ke_inflow" // dari outflow -> inflow (reversal bullish)
  | "berbalik_ke_outflow" // dari inflow -> outflow (reversal bearish)
  | "netral" // tidak ada tren jelas
  | "tidak_ada_data";

export interface MarketSummaryResult {
  /** Nilai per jendela, urut W4 -> D1. */
  windows: WindowValue[];
  /** Total net seluruh periode (W4..D1). */
  totalNet: number;
  /** Arah keseluruhan periode. */
  overallDirection: FlowDirection;
  /** Pergeseran momentum (perbandingan paruh awal vs paruh akhir + tren). */
  shift: MomentumShift;
  /**
   * Slope momentum: rata-rata avgPerDay paruh akhir (W2,D3,D2,D1 dominan akhir)
   * dikurangi paruh awal — positif = menguat ke arah inflow. Hanya indikatif.
   */
  momentumSlope: number;
  /** Sumber data (metadata). */
  source: FlowSource;
  /** Penjelasan ringkas (Bahasa Indonesia) untuk UI / AI narrative. */
  summary: string;
}

// ============================== Defaults ==============================

const DEFAULTS: Required<Omit<MarketSummaryOptions, "source">> & { source: FlowSource } = {
  shiftThreshold: 0.15,
  source: "proxy",
};

/**
 * Definisi jendela dalam OFFSET hari-trading dari hari terakhir (D1 = offset 1).
 * Range [start, end] inklusif, dihitung dari deret yang sudah diurutkan
 * descending by tanggal (indeks 0 = hari terbaru).
 *
 * Mingguan ~5 hari trading. D1/D2/D3 = 3 hari terakhir; W2/W3/W4 = blok mingguan
 * sebelumnya, masing-masing ~5 hari trading.
 *
 * Indeks (0-based, 0 = hari terbaru):
 *   D1: [0,0]   D2: [1,1]   D3: [2,2]
 *   W2: [3,7]   (~2 minggu lalu, 5 hari)
 *   W3: [8,12]  (~3 minggu lalu)
 *   W4: [13,17] (~4 minggu lalu)
 */
const WINDOW_INDEX_RANGES: Record<WindowKey, [number, number]> = {
  D1: [0, 0],
  D2: [1, 1],
  D3: [2, 2],
  W2: [3, 7],
  W3: [8, 12],
  W4: [13, 17],
};

// ============================== Core helpers ==============================

function directionOf(net: number, scale: number): FlowDirection {
  // "flat" bila |net| sangat kecil relatif terhadap skala periode.
  const eps = scale > 0 ? scale * 0.02 : 0;
  if (net > eps) return "inflow";
  if (net < -eps) return "outflow";
  return "flat";
}

/** Bangun WindowValue dari slice deret descending. */
function buildWindow(key: WindowKey, desc: FlowPoint[], scale: number): WindowValue {
  const [start, end] = WINDOW_INDEX_RANGES[key];
  const slice = desc.slice(start, end + 1);
  const days = slice.length;
  const net = slice.reduce((a, p) => a + p.value, 0);
  const avgPerDay = days > 0 ? net / days : 0;
  return {
    key,
    label: WINDOW_LABEL[key],
    net,
    avgPerDay,
    days,
    direction: days === 0 ? "flat" : directionOf(net, scale),
  };
}

/**
 * Tentukan pergeseran momentum dengan membandingkan paruh AWAL (W4,W3,W2)
 * vs paruh AKHIR (D3,D2,D1) berbasis rata-rata per hari (avgPerDay) supaya
 * jendela mingguan (5 hari) dan harian (1 hari) sebanding.
 */
function classifyShift(
  windows: Record<WindowKey, WindowValue>,
  threshold: number,
): { shift: MomentumShift; slope: number } {
  const early = [windows.W4, windows.W3, windows.W2].filter((w) => w.days > 0);
  const late = [windows.D3, windows.D2, windows.D1].filter((w) => w.days > 0);

  if (early.length === 0 && late.length === 0) {
    return { shift: "tidak_ada_data", slope: 0 };
  }

  const avg = (ws: WindowValue[]): number =>
    ws.length === 0 ? 0 : ws.reduce((a, w) => a + w.avgPerDay, 0) / ws.length;

  const earlyRate = avg(early);
  const lateRate = avg(late);
  const slope = lateRate - earlyRate;

  // Skala perbandingan: magnitudo terbesar dari kedua paruh.
  const ref = Math.max(Math.abs(earlyRate), Math.abs(lateRate));
  const eps = ref * threshold;

  const earlyInflow = earlyRate > eps;
  const earlyOutflow = earlyRate < -eps;
  const lateInflow = lateRate > eps;
  const lateOutflow = lateRate < -eps;

  // Reversal: tanda berubah dan kedua sisi cukup signifikan.
  if (earlyOutflow && lateInflow) return { shift: "berbalik_ke_inflow", slope };
  if (earlyInflow && lateOutflow) return { shift: "berbalik_ke_outflow", slope };

  const delta = lateRate - earlyRate;
  const significant = Math.abs(delta) > eps;

  // Konsisten inflow. Tanpa perubahan signifikan antar paruh = netral
  // (ada flow tapi momentum tidak bergeser).
  if (lateInflow || earlyInflow) {
    if (delta > 0 && significant) return { shift: "akumulasi_menguat", slope };
    if (delta < 0 && significant) return { shift: "akumulasi_melemah", slope };
    return { shift: "netral", slope };
  }

  // Konsisten outflow.
  if (lateOutflow || earlyOutflow) {
    // outflow menguat = makin negatif (delta < 0).
    if (delta < 0 && significant) return { shift: "distribusi_menguat", slope };
    if (delta > 0 && significant) return { shift: "distribusi_melemah", slope };
    return { shift: "netral", slope };
  }

  return { shift: "netral", slope };
}

// ============================== Public engine ==============================

/**
 * Hitung ringkasan time-window flow/momentum dari deret data harian.
 *
 * `points` boleh urut apa saja — engine akan mengurutkan descending by tanggal.
 * Pure & deterministik; aman di server/client.
 */
export function analyzeMarketSummary(
  points: FlowPoint[],
  options: MarketSummaryOptions = {},
): MarketSummaryResult {
  const opts = { ...DEFAULTS, ...options };

  if (!points || points.length === 0) {
    return {
      windows: WINDOW_ORDER.map((key) => ({
        key,
        label: WINDOW_LABEL[key],
        net: 0,
        avgPerDay: 0,
        days: 0,
        direction: "flat" as FlowDirection,
      })),
      totalNet: 0,
      overallDirection: "flat",
      shift: "tidak_ada_data",
      momentumSlope: 0,
      source: opts.source,
      summary: "Belum ada data flow untuk dianalisis lintas jendela waktu.",
    };
  }

  // Urut descending by tanggal (indeks 0 = terbaru). Stabil & deterministik.
  const desc = [...points].sort((a, b) => (a.tradeDate < b.tradeDate ? 1 : a.tradeDate > b.tradeDate ? -1 : 0));

  const totalNet = desc.reduce((a, p) => a + p.value, 0);
  const scale = desc.reduce((a, p) => a + Math.abs(p.value), 0);

  const built = {} as Record<WindowKey, WindowValue>;
  for (const key of WINDOW_ORDER) built[key] = buildWindow(key, desc, scale);

  const windows = WINDOW_ORDER.map((k) => built[k]);
  const overallDirection = directionOf(totalNet, scale);
  const { shift, slope } = classifyShift(built, opts.shiftThreshold);

  return {
    windows,
    totalNet,
    overallDirection,
    shift,
    momentumSlope: slope,
    source: opts.source,
    summary: buildSummary(shift, overallDirection, built),
  };
}

// ============================== Labels & summary ==============================

export const SHIFT_LABEL_TEXT: Record<MomentumShift, string> = {
  akumulasi_menguat: "Akumulasi Menguat",
  akumulasi_melemah: "Akumulasi Melemah",
  distribusi_menguat: "Distribusi Menguat",
  distribusi_melemah: "Distribusi Melemah",
  berbalik_ke_inflow: "Berbalik ke Inflow",
  berbalik_ke_outflow: "Berbalik ke Outflow",
  netral: "Netral / Sideways",
  tidak_ada_data: "Tidak Ada Data",
};

function buildSummary(
  shift: MomentumShift,
  overall: FlowDirection,
  windows: Record<WindowKey, WindowValue>,
): string {
  const recent = windows.D1.days > 0 ? windows.D1 : windows.D2.days > 0 ? windows.D2 : windows.D3;
  const dirWord =
    overall === "inflow" ? "akumulasi (inflow)" : overall === "outflow" ? "distribusi (outflow)" : "datar";

  switch (shift) {
    case "akumulasi_menguat":
      return `Momentum bergeser MENGUAT ke arah inflow — aliran masuk di hari-hari terakhir lebih deras dibanding 3-4 minggu lalu. Indikasi akumulasi baru mulai/berlanjut.`;
    case "akumulasi_melemah":
      return `Masih inflow secara keseluruhan, tapi laju akumulasi MELEMAH dibanding minggu-minggu sebelumnya — momentum mereda.`;
    case "distribusi_menguat":
      return `Momentum bergeser ke arah outflow yang MENGUAT — tekanan jual di hari-hari terakhir lebih besar dibanding minggu lalu. Indikasi distribusi.`;
    case "distribusi_melemah":
      return `Masih outflow, namun tekanan jual MELEMAH dibanding minggu sebelumnya — distribusi mereda, potensi stabilisasi.`;
    case "berbalik_ke_inflow":
      return `REVERSAL bullish — dari outflow di minggu-minggu lalu menjadi inflow di hari-hari terakhir. Pergeseran ke akumulasi.`;
    case "berbalik_ke_outflow":
      return `REVERSAL bearish — dari inflow di minggu-minggu lalu menjadi outflow di hari-hari terakhir. Pergeseran ke distribusi.`;
    case "netral":
      return `Flow relatif datar/${dirWord} tanpa pergeseran momentum yang jelas antar jendela waktu.`;
    case "tidak_ada_data":
    default:
      return "Belum ada data flow untuk dianalisis lintas jendela waktu.";
  }
}
