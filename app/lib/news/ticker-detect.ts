import { db } from "@/lib/db";
import { companies } from "@/db/schema/companies";
import { eq } from "drizzle-orm";

/**
 * Detect IDX tickers yang disebut di teks artikel.
 *
 * Strategi:
 * 1. Cari semua 4-letter UPPERCASE word boundary (regex /\b[A-Z]{4}\b/g).
 * 2. Cross-check terhadap whitelist `companies.kode` (cached 5 min).
 * 3. Hasil disertai `relevance` heuristic:
 *    - Match di TITLE → 1.0
 *    - Match di SUMMARY only → 0.6
 *    - Match company name (full) di teks → 0.8
 */

let codeCache: { codes: Set<string>; nameMap: Map<string, string>; expiresAt: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

async function getCompanyIndex(): Promise<{ codes: Set<string>; nameMap: Map<string, string> }> {
  if (codeCache && codeCache.expiresAt > Date.now()) {
    return { codes: codeCache.codes, nameMap: codeCache.nameMap };
  }
  const rows = await db
    .select({ kode: companies.kode, nama: companies.namaPerusahaan })
    .from(companies)
    .where(eq(companies.isActive, true));

  const codes = new Set(rows.map((r) => r.kode.toUpperCase()));
  const nameMap = new Map<string, string>();
  for (const r of rows) {
    // Simplify name: lowercase, drop common suffixes
    const clean = r.nama
      .toLowerCase()
      .replace(/\b(tbk|persero|pt\.?)\b/g, "")
      .trim();
    if (clean.length >= 4) nameMap.set(clean, r.kode);
  }

  codeCache = { codes, nameMap, expiresAt: Date.now() + CACHE_TTL_MS };
  return { codes, nameMap };
}

export interface DetectedTicker {
  kode: string;
  relevance: number;
}

/**
 * False positives — 4-letter words yang TERLIHAT seperti ticker tapi sering
 * muncul sebagai kata Indonesia/Inggris biasa. Beberapa di antaranya MEMANG
 * kode ticker valid (NAIK, AKSI, CUAN, dll) — kita putuskan butuh context
 * sebelum bisa di-claim sebagai ticker reference.
 */
const AMBIGUOUS_WORDS = new Set([
  "AKAN", "PADA", "DARI", "UNTUK", "TAHUN", "BULAN", "AJAR",
  "ATAU", "YANG", "SAJA", "JUGA", "BAGI", "PARA", "ANAK", "ANTA",
  "BANK", "JAJA", "JAGA", "MAKA", "KALI", "TAKE", "MAKE", "JANE", "JOHN",
  "ASEAN", "ASIA", "RUU", "PSBB",
  // Ticker codes yang JUGA kata umum Indonesia
  "NAIK", "AKSI", "UANG", "CUAN", "EMAS", "DAYA", "DATA", "FORE", "BUKA",
  "JAYA", "MAJU", "LAMA", "JARI", "AIRA", "ANTA", "ANTM", "BANK",
  "BAUT", "BEEF", "BELA", "BIMA", "BIRD", "BIRU", "BOLA", "BOLT", "CARS",
  "CASH", "COAL", "DUET", "DUTA", "FILM", "FISH", "FOOD", "GOLF",
  "HAJJ", "HALO", "HERO", "HOPE", "HOME", "HOPI", "IDOL", "ILMU", "INDO",
  "ISAT", "JAVA", "KAEF", "KASA", "KEEN", "KEYS", "KICK", "KIDS", "KING",
  "LIFE", "LINE", "LOVE", "LUCK", "LUCY", "LUNA", "MAIN", "MAKE", "MARK",
  "MARS", "MEDI", "MENO", "META", "MILK", "MIND", "MINE", "MOJO", "MOON",
  "NEWS", "NEXT", "NICE", "NIKO", "NIRO", "NORM", "NOTE", "ODDS", "OPEN",
  "PACK", "PALM", "PALS", "PANS", "PARK", "PART", "PEEK", "PELI", "PENS",
  "PESI", "PINE", "PINK", "PLAN", "PLAY", "PLUS", "POLY", "POOL", "PORT",
  "POST", "POWR", "PRIM", "PROD", "PUMP", "PURE", "RACE", "RAIN", "RICH",
  "RING", "RISE", "ROCK", "ROSE", "RUNS", "SAFE", "SAGA", "SAIL", "SAND",
  "SAVE", "SCMA", "SEED", "SHOP", "SHOW", "SILK", "SING", "SKIN", "SMOK",
  "SNOW", "SOFT", "SOLO", "SONG", "SOUL", "STAR", "STOP", "STOR", "SUNS",
  "SURE", "SWIM", "TAFR", "TAKE", "TANK", "TASK", "TEAM", "TECH", "TEMP",
  "TIME", "TINS", "TIPS", "TOOL", "TOPS", "TOUR", "TOWN", "TOYS", "TREE",
  "TRUE", "TURN", "TWIN", "UNIT", "USED", "VALU", "VANS", "VEND", "VERY",
  "VEST", "VIEW", "VOTE", "WAGE", "WAIT", "WAKE", "WALK", "WALL", "WANG",
  "WANT", "WARD", "WARE", "WARM", "WARN", "WARS", "WASH", "WAVE", "WAYS",
  "WEAR", "WEBB", "WEED", "WEEK", "WELL", "WENT", "WEST", "WHAT", "WHEN",
  "WHIP", "WHIZ", "WHOM", "WIDE", "WIFE", "WILD", "WIND", "WINE", "WING",
  "WINS", "WIRE", "WIRES", "WISE", "WISH", "WITH", "WOLF", "WOOD", "WOOL",
  "WORD", "WORK", "WORM", "WRAP", "YARD", "YEAH", "YEAR", "YELL", "YOGA",
  "YORK", "YOUR", "ZERO", "ZONE", "ZOOM",
]);

/**
 * Acronyms umum yang BUKAN ticker (3 huruf, tapi kadang muncul 4 huruf gabungan).
 * Match harus diabaikan unconditionally.
 */
const NEVER_TICKERS = new Set([
  "IDX", "BEI", "OJK", "BCA", "BRI", "BNI", "JKT", "USD", "IDR", "USDT",
  "CEO", "CFO", "CTO", "COO", "IPO", "PER", "EPS", "ROE", "ROI", "EBITDA",
  "WIB", "WIT", "USA", "UK", "EU", "MSCI", "FTSE", "DJIA", "NYSE", "OECD",
  "WHO", "WTO", "IMF", "PBB",
]);

/**
 * Pemetaan TEMA/SEKTOR → emiten representatif. Untuk berita makro/komoditas
 * yang tak menyebut kode/nama emiten langsung (mis. "harga timah naik" → TINS).
 * Match via kata kunci (lowercase substring). Relevance rendah (0.45 = tematik).
 * Hanya emiten yang ADA di universe yang dipakai (dicek via index.codes).
 */
const THEME_MAP: { keywords: string[]; tickers: string[] }[] = [
  { keywords: ["timah"], tickers: ["TINS"] },
  { keywords: ["nikel", "nickel", "feronikel", "bijih nikel"], tickers: ["ANTM", "INCO", "NCKL", "MBMA", "NICL"] },
  { keywords: ["batu bara", "batubara", "coal"], tickers: ["ADRO", "PTBA", "ITMG", "INDY", "HRUM", "BUMI", "ADMR"] },
  { keywords: ["emas", "gold"], tickers: ["ANTM", "MDKA", "AMMN", "BRMS", "ARCI", "HRTA"] },
  { keywords: ["tembaga", "copper"], tickers: ["AMMN", "MDKA", "BRMS"] },
  { keywords: ["sawit", "kelapa sawit", "cpo", "minyak goreng", "perkebunan"], tickers: ["AALI", "LSIP", "SSMS", "DSNG", "TAPG", "SIMP"] },
  { keywords: ["perbankan", "bank sentral", "suku bunga", "kredit perbankan"], tickers: ["BBRI", "BBCA", "BMRI", "BBNI"] },
  { keywords: ["semen"], tickers: ["SMGR", "INTP"] },
  { keywords: ["rokok", "tembakau", "cukai"], tickers: ["GGRM", "HMSP", "WIIM"] },
  { keywords: ["otomotif", "kendaraan", "mobil listrik", "ev"], tickers: ["ASII", "AUTO", "DRMA"] },
  { keywords: ["properti", "real estat", "perumahan"], tickers: ["BSDE", "CTRA", "PWON", "SMRA"] },
  { keywords: ["telekomunikasi", "operator seluler", "telco"], tickers: ["TLKM", "ISAT", "EXCL"] },
  { keywords: ["ritel", "peritel"], tickers: ["ACES", "MAPI", "AMRT", "MIDI"] },
  { keywords: ["unggas", "ayam", "pakan ternak", "perunggasan"], tickers: ["CPIN", "JPFA", "MAIN"] },
  { keywords: ["migas", "minyak mentah", "minyak bumi", "gas bumi", "lpg", "bbm"], tickers: ["MEDC", "PGAS", "ELSA", "AKRA"] },
  { keywords: ["farmasi", "obat", "kesehatan"], tickers: ["KLBF", "SIDO", "KAEF", "INAF"] },
  { keywords: ["konstruksi", "infrastruktur", "tol"], tickers: ["WIKA", "WSKT", "PTPP", "ADHI"] },
  { keywords: ["konsumer", "barang konsumsi", "fmcg"], tickers: ["UNVR", "ICBP", "INDF", "MYOR"] },
];

function detectThemeTickers(text: string): { kode: string; relevance: number }[] {
  const lower = text.toLowerCase();
  const out: { kode: string; relevance: number }[] = [];
  for (const theme of THEME_MAP) {
    if (theme.keywords.some((k) => lower.includes(k))) {
      for (const kode of theme.tickers) out.push({ kode, relevance: 0.45 });
    }
  }
  return out;
}

export function detectTickers(
  title: string,
  summary: string,
  index: { codes: Set<string>; nameMap: Map<string, string> },
): DetectedTicker[] {
  const found = new Map<string, number>();

  const tryAddHighConfidence = (kode: string, relevance: number) => {
    if (NEVER_TICKERS.has(kode)) return;
    if (!index.codes.has(kode)) return;
    const cur = found.get(kode) ?? 0;
    if (relevance > cur) found.set(kode, relevance);
  };

  /**
   * Pattern 1 — UPPERCASE 4-huruf di dalam KURUNG ", " (xxxX)" → confidence 1.0.
   * Contoh: "Bank Mandiri (BMRI) Nilai Sinergi" → BMRI = 1.0
   */
  const parenRegex = /\(([A-Z]{4})\)/g;
  for (const m of (title + " " + summary).matchAll(parenRegex)) {
    if (m[1]) tryAddHighConfidence(m[1], 1.0);
  }

  /**
   * Pattern 2 — preceded by keyword: "saham X", "kode X", "emiten X", "ticker X",
   * "PT X", "issuer X", "$X", "X.JK". Confidence 1.0.
   */
  const ctxRegex = /(?:\bsaham|\bemiten|\bkode|\bticker|\bissuer|\$)\s*([A-Z]{4})\b|\b([A-Z]{4})\.JK\b/g;
  for (const m of (title + " " + summary).matchAll(ctxRegex)) {
    const candidate = m[1] ?? m[2];
    if (candidate) tryAddHighConfidence(candidate, 1.0);
  }

  /**
   * Pattern 3 — full company name match (lower-cased, suffix-stripped) di teks.
   * Confidence 0.9.
   */
  const combined = (title + " " + summary).toLowerCase();
  for (const [name, kode] of index.nameMap.entries()) {
    if (name.length < 8) continue;
    if (combined.includes(name)) {
      tryAddHighConfidence(kode, 0.9);
    }
  }

  /**
   * Pattern 4 — plain 4-letter ALLCAPS di title yang BUKAN ambiguous word.
   * Confidence 0.5 (medium — UI bisa filter relevance >= 0.7 untuk hide ini).
   */
  const titleMatches = title.match(/\b[A-Z]{4}\b/g) ?? [];
  for (const candidate of titleMatches) {
    if (AMBIGUOUS_WORDS.has(candidate)) continue;
    if (NEVER_TICKERS.has(candidate)) continue;
    if (!index.codes.has(candidate)) continue;
    const cur = found.get(candidate) ?? 0;
    if (cur < 0.5) found.set(candidate, 0.5);
  }

  // Pattern 5 — tema/sektor (makro & komoditas). Relevance rendah (0.45).
  for (const t of detectThemeTickers(`${title} ${summary}`)) {
    if (NEVER_TICKERS.has(t.kode) || !index.codes.has(t.kode)) continue;
    const cur = found.get(t.kode) ?? 0;
    if (t.relevance > cur) found.set(t.kode, t.relevance);
  }

  return Array.from(found.entries()).map(([kode, relevance]) => ({ kode, relevance }));
}

export async function detectTickersForArticle(title: string, summary: string): Promise<DetectedTicker[]> {
  const idx = await getCompanyIndex();
  return detectTickers(title, summary, idx);
}

// Test helper — caller bisa invalidate cache via test/seed.
export function _resetCompanyIndexCache(): void {
  codeCache = null;
}
