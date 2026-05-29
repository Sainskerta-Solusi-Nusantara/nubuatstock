/**
 * Sector Capital Flow — IMPROVEMENT_PLAN §3.C.6 ("Sector Activity Chart" / NeoBDM).
 *
 * Tujuan: melihat KE MANA uang berputar di bursa — antar tier market-cap
 * (Large -> Mid/Small atau sebaliknya) dan antar sektor — lalu memvisualisasikan
 * sebagai HEATMAP (sektor x tier) dengan intensitas inflow (hijau) / outflow (merah).
 *
 * Engine ini MURNI (pure): input = snapshot bar EOD per emiten (sudah terklasifikasi
 * sektor + market cap), output = matriks flow + ringkasan rotasi. Tidak ada I/O DB.
 *
 * ========================== Definisi tier market-cap ==========================
 * Sengaja 3 tier (bukan 4 seperti capital-flow bucket) supaya heatmap ringkas:
 *   - Large : marketCap >= Rp10T   (big caps, blue chip / institusi)
 *   - Mid   : Rp1T <= marketCap < Rp10T
 *   - Small : marketCap < Rp1T     (small caps, sering retail-driven)
 *
 * ========================== Rumus net capital flow ==========================
 * Untuk tiap emiten pada window N hari:
 *   1. Turnover value = Σ value_idr harian (nilai transaksi = proxy "uang yang berputar").
 *   2. Arah harga (direction) = sign dari return harga window = (close_last - close_first)/close_first.
 *      -> price naik = uang NET masuk (inflow), price turun = uang NET keluar (outflow).
 *   3. Signed flow emiten = turnover_value * sign(return)  (proxy net capital flow).
 *      Magnitudo = seberapa banyak uang berputar; tanda = arah (akumulasi vs distribusi).
 *
 * Agregasi ke sel (sektor, tier): jumlahkan signed flow seluruh emiten di sel itu.
 * Intensitas heatmap = signed flow sel dinormalisasi terhadap max |flow| seluruh sel
 * (skala -1..+1) sehingga warna konsisten lintas sel.
 *
 * Ringkasan "uang rotasi ke mana": bandingkan net flow per tier. Bila Large net negatif
 * dan Small/Mid net positif -> rotasi dari big cap ke small/mid (risk-on / retail). Bila
 * sebaliknya -> flight to safety. Juga laporkan sektor inflow/outflow teratas.
 */

// ============================== Konstanta tier ==============================

export type Tier = "Large" | "Mid" | "Small";

export const TIERS: readonly Tier[] = ["Large", "Mid", "Small"] as const;

/** Threshold ambang BAWAH (inklusif) tiap tier dalam IDR. */
export const TIER_THRESHOLDS_IDR: Record<Tier, number> = {
  Large: 10_000_000_000_000, // >= Rp10T
  Mid: 1_000_000_000_000, // Rp1T - 10T
  Small: 0, // < Rp1T
};

export function classifyTier(marketCapIdr: number): Tier {
  if (marketCapIdr >= TIER_THRESHOLDS_IDR.Large) return "Large";
  if (marketCapIdr >= TIER_THRESHOLDS_IDR.Mid) return "Mid";
  return "Small";
}

// ============================== Input types ==============================

/** Satu bar EOD ternormalisasi (hanya field yang dibutuhkan engine). */
export interface FlowBar {
  /** Tanggal "YYYY-MM-DD" (untuk sorting kronologis). */
  date: string;
  close: number;
  /** Nilai transaksi IDR hari itu (proxy uang berputar). */
  valueIdr: number;
}

/** Satu emiten beserta bar EOD-nya dalam window. */
export interface FlowEmiten {
  kode: string;
  sectorKode: string;
  /** Nama sektor untuk label (opsional). */
  sectorName?: string | null;
  marketCapIdr: number;
  /** Bar EOD kronologis (boleh belum tersortir; engine akan sort). */
  bars: FlowBar[];
}

export interface SectorFlowOptions {
  /** Window dalam jumlah hari trading (default 5). Bar paling akhir dipakai. */
  windowDays?: number;
  /**
   * Minimum jumlah emiten valid agar hasil dianggap signifikan.
   * Di bawah ini `hasData` tetap true tapi `sparse` = true (UI bisa warning).
   */
  minEmitenForSignificance?: number;
}

const DEFAULT_OPTIONS: Required<SectorFlowOptions> = {
  windowDays: 5,
  minEmitenForSignificance: 20,
};

// ============================== Output types ==============================

/** Satu sel heatmap (kombinasi sektor x tier). */
export interface FlowCell {
  sectorKode: string;
  tier: Tier;
  /** Net signed flow IDR (positif = inflow, negatif = outflow). */
  netFlowIdr: number;
  /** Total turnover IDR (selalu >= 0). */
  turnoverIdr: number;
  /** Jumlah emiten di sel. */
  count: number;
  /** Intensitas ternormalisasi -1..+1 (relatif terhadap max |flow| seluruh sel). */
  intensity: number;
}

/** Baris sektor pada matriks (1 row = 1 sektor lintas tier). */
export interface SectorFlowRow {
  sectorKode: string;
  sectorName: string;
  /** Sel per tier (selalu ada ketiganya; count 0 bila kosong). */
  cells: Record<Tier, FlowCell>;
  /** Net flow seluruh tier untuk sektor ini. */
  sectorNetFlowIdr: number;
  sectorTurnoverIdr: number;
}

export type RotationDirection =
  | "to_small" // uang lari ke small/mid cap (risk-on / retail)
  | "to_large" // flight to safety (uang ke big cap)
  | "broad_inflow" // semua tier inflow
  | "broad_outflow" // semua tier outflow
  | "mixed"; // tidak ada pola jelas

export interface SectorFlowResult {
  /** Apakah ada cukup data untuk dihitung sama sekali. */
  hasData: boolean;
  /** Data tipis (kurang dari minEmitenForSignificance) — hasil indikatif saja. */
  sparse: boolean;
  windowDays: number;
  /** Total emiten valid yang masuk perhitungan. */
  emitenCount: number;
  /** Rentang tanggal aktual yang dipakai (dari bar). */
  dateFrom: string | null;
  dateTo: string | null;
  /** Matriks heatmap: array baris sektor (urut net flow desc). */
  rows: SectorFlowRow[];
  /** Net flow per tier (agregat lintas sektor). */
  netFlowByTier: Record<Tier, number>;
  /** Turnover per tier. */
  turnoverByTier: Record<Tier, number>;
  /** Arah rotasi tier. */
  rotation: RotationDirection;
  /** Sektor dengan inflow terbesar (kode + net flow), null bila tak ada inflow. */
  topInflowSector: { sectorKode: string; sectorName: string; netFlowIdr: number } | null;
  /** Sektor dengan outflow terbesar, null bila tak ada outflow. */
  topOutflowSector: { sectorKode: string; sectorName: string; netFlowIdr: number } | null;
  /** Ringkasan naratif singkat (Bahasa Indonesia). */
  summary: string;
}

// ============================== Helpers ==============================

function emptyResult(windowDays: number): SectorFlowResult {
  const zeroTier: Record<Tier, number> = { Large: 0, Mid: 0, Small: 0 };
  return {
    hasData: false,
    sparse: true,
    windowDays,
    emitenCount: 0,
    dateFrom: null,
    dateTo: null,
    rows: [],
    netFlowByTier: { ...zeroTier },
    turnoverByTier: { ...zeroTier },
    rotation: "mixed",
    topInflowSector: null,
    topOutflowSector: null,
    summary: "Data EOD belum cukup untuk menghitung sector capital flow.",
  };
}

/**
 * Hitung signed flow satu emiten pada window N bar terakhir.
 * @returns null bila bar tidak cukup / data invalid.
 */
function computeEmitenFlow(
  bars: FlowBar[],
  windowDays: number,
): { netFlowIdr: number; turnoverIdr: number; dateFrom: string; dateTo: string } | null {
  if (bars.length < 2) return null;
  const sorted = bars.slice().sort((a, b) => a.date.localeCompare(b.date));
  const window = sorted.slice(-windowDays);
  if (window.length < 2) return null;

  const first = window[0]!;
  const last = window[window.length - 1]!;
  if (first.close <= 0) return null;

  const ret = (last.close - first.close) / first.close;
  // Turnover = total nilai transaksi pada window (proxy uang berputar).
  const turnover = window.reduce((acc, b) => acc + Math.max(0, b.valueIdr), 0);
  if (turnover <= 0) return null;

  // Direction: sign return. Flat (ret == 0) dianggap netral (0 flow).
  const direction = ret > 0 ? 1 : ret < 0 ? -1 : 0;
  const netFlow = turnover * direction;

  return {
    netFlowIdr: netFlow,
    turnoverIdr: turnover,
    dateFrom: first.date,
    dateTo: last.date,
  };
}

function classifyRotation(net: Record<Tier, number>): RotationDirection {
  const { Large, Mid, Small } = net;
  const smallMid = Mid + Small;
  const allPos = Large > 0 && Mid > 0 && Small > 0;
  const allNeg = Large < 0 && Mid < 0 && Small < 0;
  if (allPos) return "broad_inflow";
  if (allNeg) return "broad_outflow";
  // Rotasi: large keluar sementara small/mid masuk (atau sebaliknya).
  if (Large < 0 && smallMid > 0) return "to_small";
  if (Large > 0 && smallMid < 0) return "to_large";
  // Fallback: bandingkan dominasi.
  if (smallMid > 0 && smallMid > Large) return "to_small";
  if (Large > 0 && Large > smallMid) return "to_large";
  return "mixed";
}

const ROTATION_TEXT: Record<RotationDirection, string> = {
  to_small:
    "Uang berputar dari big cap ke small/mid cap — gejala risk-on, momentum retail-driven (late-cycle).",
  to_large:
    "Uang mengalir ke big cap (flight to safety) — small/mid cap ditinggalkan, mode defensif.",
  broad_inflow: "Inflow merata di semua tier — partisipasi pasar luas, sentimen bullish.",
  broad_outflow: "Outflow merata di semua tier — broad sell-off, sentimen risk-off.",
  mixed: "Tidak ada pola rotasi tier yang dominan — pasar campuran / sideways.",
};

// ============================== Engine utama ==============================

/**
 * Hitung matriks sector capital flow (sektor x tier) untuk satu window.
 *
 * @param emiten daftar emiten dengan bar EOD (sudah terklasifikasi sektor + mcap).
 * @param options windowDays & ambang signifikansi.
 */
export function computeSectorFlow(
  emiten: FlowEmiten[],
  options: SectorFlowOptions = {},
): SectorFlowResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const windowDays = Math.max(2, Math.floor(opts.windowDays));

  if (!emiten || emiten.length === 0) return emptyResult(windowDays);

  // Akumulator per (sektor, tier).
  const sectorNames = new Map<string, string>();
  // key = `${sectorKode}|${tier}`
  const cellAcc = new Map<string, { net: number; turnover: number; count: number }>();

  let emitenCount = 0;
  let dateFrom: string | null = null;
  let dateTo: string | null = null;

  for (const e of emiten) {
    const mc = Number(e.marketCapIdr ?? 0);
    if (mc <= 0) continue;
    const flow = computeEmitenFlow(e.bars, windowDays);
    if (!flow) continue;

    const tier = classifyTier(mc);
    const sectorKode = e.sectorKode || "UNKNOWN";
    if (!sectorNames.has(sectorKode)) {
      sectorNames.set(sectorKode, e.sectorName || sectorKode);
    }
    const key = `${sectorKode}|${tier}`;
    const acc = cellAcc.get(key) ?? { net: 0, turnover: 0, count: 0 };
    acc.net += flow.netFlowIdr;
    acc.turnover += flow.turnoverIdr;
    acc.count += 1;
    cellAcc.set(key, acc);

    emitenCount += 1;
    if (dateFrom === null || flow.dateFrom < dateFrom) dateFrom = flow.dateFrom;
    if (dateTo === null || flow.dateTo > dateTo) dateTo = flow.dateTo;
  }

  if (emitenCount === 0) return emptyResult(windowDays);

  // Max |net flow| seluruh sel untuk normalisasi intensitas.
  let maxAbs = 0;
  for (const acc of cellAcc.values()) {
    maxAbs = Math.max(maxAbs, Math.abs(acc.net));
  }

  // Bangun baris sektor.
  const rows: SectorFlowRow[] = [];
  const netFlowByTier: Record<Tier, number> = { Large: 0, Mid: 0, Small: 0 };
  const turnoverByTier: Record<Tier, number> = { Large: 0, Mid: 0, Small: 0 };

  for (const [sectorKode, sectorName] of sectorNames.entries()) {
    const cells = {} as Record<Tier, FlowCell>;
    let sectorNet = 0;
    let sectorTurnover = 0;
    for (const tier of TIERS) {
      const acc = cellAcc.get(`${sectorKode}|${tier}`) ?? { net: 0, turnover: 0, count: 0 };
      const intensity = maxAbs > 0 ? acc.net / maxAbs : 0;
      cells[tier] = {
        sectorKode,
        tier,
        netFlowIdr: acc.net,
        turnoverIdr: acc.turnover,
        count: acc.count,
        intensity,
      };
      sectorNet += acc.net;
      sectorTurnover += acc.turnover;
      netFlowByTier[tier] += acc.net;
      turnoverByTier[tier] += acc.turnover;
    }
    rows.push({
      sectorKode,
      sectorName,
      cells,
      sectorNetFlowIdr: sectorNet,
      sectorTurnoverIdr: sectorTurnover,
    });
  }

  // Urutkan sektor: inflow terbesar di atas.
  rows.sort((a, b) => b.sectorNetFlowIdr - a.sectorNetFlowIdr);

  const rotation = classifyRotation(netFlowByTier);

  const topInflow = rows[0];
  const topOutflow = rows[rows.length - 1];
  const topInflowSector =
    topInflow && topInflow.sectorNetFlowIdr > 0
      ? {
          sectorKode: topInflow.sectorKode,
          sectorName: topInflow.sectorName,
          netFlowIdr: topInflow.sectorNetFlowIdr,
        }
      : null;
  const topOutflowSector =
    topOutflow && topOutflow.sectorNetFlowIdr < 0
      ? {
          sectorKode: topOutflow.sectorKode,
          sectorName: topOutflow.sectorName,
          netFlowIdr: topOutflow.sectorNetFlowIdr,
        }
      : null;

  const sparse = emitenCount < opts.minEmitenForSignificance;

  // Ringkasan naratif.
  const parts: string[] = [ROTATION_TEXT[rotation]];
  if (topInflowSector) {
    parts.push(`Inflow terkuat: sektor ${topInflowSector.sectorName}.`);
  }
  if (topOutflowSector) {
    parts.push(`Outflow terkuat: sektor ${topOutflowSector.sectorName}.`);
  }
  if (sparse) {
    parts.push(`(Data tipis: hanya ${emitenCount} emiten — hasil indikatif.)`);
  }

  return {
    hasData: true,
    sparse,
    windowDays,
    emitenCount,
    dateFrom,
    dateTo,
    rows,
    netFlowByTier,
    turnoverByTier,
    rotation,
    topInflowSector,
    topOutflowSector,
    summary: parts.join(" "),
  };
}

/**
 * Hitung flow untuk beberapa window sekaligus (mis. 5 & 20 hari).
 * @returns map windowDays -> hasil.
 */
export function computeMultiWindowSectorFlow(
  emiten: FlowEmiten[],
  windows: number[] = [5, 20],
  options: Omit<SectorFlowOptions, "windowDays"> = {},
): Record<number, SectorFlowResult> {
  const out: Record<number, SectorFlowResult> = {};
  for (const w of windows) {
    out[w] = computeSectorFlow(emiten, { ...options, windowDays: w });
  }
  return out;
}
