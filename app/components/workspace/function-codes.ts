/**
 * Bloomberg-style function codes untuk workspace.
 *
 * Format input: "<CODE>" (global) atau "<TICKER> <CODE>" (ticker-context).
 * Destinasi hanya yang route-nya SUDAH ada.
 *
 * Catatan: tab di /ticker/[code] memakai defaultValue (belum URL-controlled),
 * jadi kode tab-spesifik (DES/FA/GIP/BMAP/N) mengarah ke /ticker/<code> —
 * pengguna mendarat di halaman ticker, lalu pilih tab. Kode global (EQS/RV)
 * mengarah ke halaman standalone yang memang ada.
 */

export interface FunctionCode {
  code: string;
  label: string;
  /** True kalau butuh ticker (mis. DES BBRI). */
  needsTicker: boolean;
  /** Bangun href tujuan. ticker sudah uppercase + tervalidasi. */
  resolve: (ticker: string) => string;
}

export const FUNCTION_CODES: FunctionCode[] = [
  {
    code: "DES",
    label: "Description / Overview emiten",
    needsTicker: true,
    resolve: (t) => `/ticker/${t}`,
  },
  {
    code: "FA",
    label: "Fundamentals emiten",
    needsTicker: true,
    resolve: (t) => `/ticker/${t}`,
  },
  {
    code: "GIP",
    label: "Grafik harga emiten",
    needsTicker: true,
    resolve: (t) => `/ticker/${t}`,
  },
  {
    code: "BMAP",
    label: "Bandarmology emiten",
    needsTicker: true,
    resolve: (t) => `/ticker/${t}`,
  },
  {
    code: "N",
    label: "Berita emiten",
    needsTicker: true,
    resolve: (t) => `/ticker/${t}`,
  },
  {
    code: "EQS",
    label: "Equity Screener",
    needsTicker: false,
    resolve: () => `/screener`,
  },
  {
    code: "RV",
    label: "Relative Valuation / Compare",
    needsTicker: true,
    resolve: (t) => (t ? `/compare?tickers=${t}` : `/compare`),
  },
];

const BY_CODE = new Map(FUNCTION_CODES.map((f) => [f.code, f]));

export interface ParsedFunction {
  ok: boolean;
  href?: string;
  /** Ticker yang dipakai (untuk juga membuka pane di workspace). */
  ticker?: string;
  code?: string;
  error?: string;
}

/**
 * Parse input seperti "BBRI DES", "DES BBRI", atau "EQS".
 * Mengembalikan href tujuan + ticker terdeteksi.
 */
export function parseFunctionInput(raw: string): ParsedFunction {
  const tokens = raw.trim().toUpperCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return { ok: false, error: "Kosong" };

  let code: string | undefined;
  let ticker = "";

  for (const tok of tokens) {
    if (BY_CODE.has(tok)) {
      code = tok;
    } else if (/^[A-Z0-9]{2,6}$/.test(tok)) {
      ticker = tok;
    }
  }

  if (!code) {
    return { ok: false, error: `Kode fungsi tidak dikenal: "${raw.trim()}"` };
  }

  const fn = BY_CODE.get(code)!;
  if (fn.needsTicker && !ticker) {
    return { ok: false, error: `Kode ${code} butuh ticker (mis. "BBRI ${code}")` };
  }

  return { ok: true, href: fn.resolve(ticker), ticker, code };
}
