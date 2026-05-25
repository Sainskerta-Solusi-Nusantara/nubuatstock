import { db } from "../../lib/db";
import { logger } from "../../lib/logger";
import {
  countries,
  currencies,
  indices,
  papanListing,
  sectors,
  subSectors,
  type NewCountry,
  type NewCurrency,
  type NewIndex,
  type NewPapanListing,
  type NewSector,
  type NewSubSector,
} from "../schema/reference";

/**
 * Seed reference data Nubuat — idempotent (onConflictDoNothing).
 *
 * Source data:
 * - Papan Listing: idx.co.id Peraturan Pencatatan I-A (per Des 2021 + Papan Ekonomi Baru per Des 2022).
 * - Sectors / Sub-sectors: IDX-IC official classification (efektif 25 Jan 2021,
 *   update 2024) — idx.co.id/id/produk/saham/idx-industrial-classification.
 * - Indices: idx.co.id/id/data-pasar/data-saham/indeks-saham.
 * - Currencies: ISO 4217.
 * - Countries: ISO 3166-1 alpha-2.
 */

const papanListingSeed: NewPapanListing[] = [
  {
    kode: "UTAMA",
    nama: "Papan Utama",
    deskripsi:
      "Papan untuk emiten berukuran besar dengan track record operasi memadai. Standar pencatatan paling tinggi.",
    minMarketCapIdr: "3000000000000",
    listedCountEstimate: 350,
    isHighRisk: false,
    orderIndex: 1,
  },
  {
    kode: "PENGEMBANGAN",
    nama: "Papan Pengembangan",
    deskripsi:
      "Papan untuk emiten yang belum memenuhi kriteria Papan Utama tetapi sudah memiliki prospek usaha yang baik.",
    minMarketCapIdr: "100000000000",
    listedCountEstimate: 380,
    isHighRisk: false,
    orderIndex: 2,
  },
  {
    kode: "AKSELERASI",
    nama: "Papan Akselerasi",
    deskripsi:
      "Papan untuk emiten skala aset kecil/menengah (UKM) sesuai POJK No. 53/POJK.04/2017. Persyaratan lebih ringan.",
    minMarketCapIdr: "25000000000",
    listedCountEstimate: 30,
    isHighRisk: true,
    orderIndex: 3,
  },
  {
    kode: "EKONOMI_BARU",
    nama: "Papan Ekonomi Baru",
    deskripsi:
      "Papan khusus emiten dengan tingkat pertumbuhan tinggi & inovasi teknologi (new economy / multiple voting shares). Berlaku sejak Desember 2022.",
    minMarketCapIdr: "2000000000000",
    listedCountEstimate: 5,
    isHighRisk: true,
    orderIndex: 4,
  },
  {
    kode: "PEMANTAUAN_KHUSUS",
    nama: "Papan Pemantauan Khusus",
    deskripsi:
      "Papan untuk emiten yang dikenakan kriteria khusus (going concern, likuiditas rendah, opini auditor TMP, dll). Wajib disclaim risiko ke investor.",
    minMarketCapIdr: null,
    listedCountEstimate: 95,
    isHighRisk: true,
    orderIndex: 5,
  },
];

const sectorsSeed: NewSector[] = [
  {
    kode: "ENERGY",
    namaId: "Energi",
    namaEn: "Energy",
    deskripsi:
      "Sektor perusahaan yang menjual produk & jasa terkait ekstraksi energi (batu bara, minyak & gas, jasa penunjang).",
    orderIndex: 1,
    colorHex: "#FF6B35",
  },
  {
    kode: "BASIC_MATERIALS",
    namaId: "Barang Baku",
    namaEn: "Basic Materials",
    deskripsi:
      "Perusahaan yang menjual produk barang baku (kimia, logam, kayu, semen, kemasan, pulp & kertas).",
    orderIndex: 2,
    colorHex: "#8B6F47",
  },
  {
    kode: "INDUSTRIALS",
    namaId: "Perindustrian",
    namaEn: "Industrials",
    deskripsi:
      "Perusahaan yang memproduksi/distribusi barang & jasa industri (alat berat, otomotif komponen, jasa profesional).",
    orderIndex: 3,
    colorHex: "#4A6FA5",
  },
  {
    kode: "CONSUMER_CYCLICALS",
    namaId: "Konsumen Non-Primer",
    namaEn: "Consumer Cyclicals",
    deskripsi:
      "Perusahaan barang & jasa konsumen yang permintaannya sensitif terhadap siklus ekonomi (otomotif, ritel, media, pariwisata).",
    orderIndex: 4,
    colorHex: "#E76F51",
  },
  {
    kode: "CONSUMER_STAPLES",
    namaId: "Konsumen Primer",
    namaEn: "Consumer Non-Cyclicals",
    deskripsi:
      "Perusahaan barang & jasa konsumen primer (makanan, minuman, tembakau, ritel kebutuhan pokok, peralatan rumah tangga).",
    orderIndex: 5,
    colorHex: "#2A9D8F",
  },
  {
    kode: "HEALTHCARE",
    namaId: "Kesehatan",
    namaEn: "Healthcare",
    deskripsi:
      "Perusahaan jasa & produk kesehatan (rumah sakit, farmasi, alat kesehatan, peralatan medis).",
    orderIndex: 6,
    colorHex: "#E63946",
  },
  {
    kode: "FINANCIALS",
    namaId: "Keuangan",
    namaEn: "Financials",
    deskripsi:
      "Perusahaan jasa keuangan (bank, asuransi, perusahaan pembiayaan, sekuritas, holding investasi).",
    orderIndex: 7,
    colorHex: "#1D3557",
  },
  {
    kode: "PROPERTIES_REAL_ESTATE",
    namaId: "Properti & Real Estat",
    namaEn: "Properties & Real Estate",
    deskripsi:
      "Pengembang properti, pengelola real estat, kawasan industri, hotel & operator properti.",
    orderIndex: 8,
    colorHex: "#7209B7",
  },
  {
    kode: "TECHNOLOGY",
    namaId: "Teknologi",
    namaEn: "Technology",
    deskripsi:
      "Perusahaan teknologi (software, internet, e-commerce, IT services, hardware teknologi).",
    orderIndex: 9,
    colorHex: "#06AED5",
  },
  {
    kode: "INFRASTRUCTURES",
    namaId: "Infrastruktur",
    namaEn: "Infrastructures",
    deskripsi:
      "Perusahaan infrastruktur (telekomunikasi, utilitas listrik & air, jalan tol, konstruksi infrastruktur).",
    orderIndex: 10,
    colorHex: "#457B9D",
  },
  {
    kode: "TRANSPORTATION_LOGISTIC",
    namaId: "Transportasi & Logistik",
    namaEn: "Transportation & Logistic",
    deskripsi:
      "Perusahaan transportasi (penerbangan, pelayaran, darat, kereta) & logistik (kurir, gudang, freight forwarding).",
    orderIndex: 11,
    colorHex: "#F4A261",
  },
  {
    kode: "INVESTMENT_PRODUCTS",
    namaId: "Produk Investasi Tercatat",
    namaEn: "Listed Investment Products",
    deskripsi:
      "Produk investasi yang tercatat di bursa (ETF, REIT/DIRE, EBA, KIK lainnya).",
    orderIndex: 12,
    colorHex: "#8338EC",
  },
];

const subSectorsSeed: NewSubSector[] = [
  // ENERGY
  { kode: "OIL_GAS_COAL", sectorCode: "ENERGY", namaId: "Minyak, Gas, & Batu Bara", namaEn: "Oil, Gas & Coal", orderIndex: 1 },
  { kode: "ALTERNATIVE_ENERGY", sectorCode: "ENERGY", namaId: "Energi Alternatif", namaEn: "Alternative Energy", orderIndex: 2 },
  { kode: "ENERGY_EQUIP_SVC", sectorCode: "ENERGY", namaId: "Jasa & Peralatan Energi", namaEn: "Energy Equipment & Services", orderIndex: 3 },

  // BASIC MATERIALS
  { kode: "BASIC_CHEMICALS", sectorCode: "BASIC_MATERIALS", namaId: "Bahan Kimia Dasar", namaEn: "Basic Chemicals", orderIndex: 1 },
  { kode: "CONSTRUCTION_MATERIALS", sectorCode: "BASIC_MATERIALS", namaId: "Material Konstruksi", namaEn: "Construction Materials", orderIndex: 2 },
  { kode: "CONTAINERS_PACKAGING", sectorCode: "BASIC_MATERIALS", namaId: "Wadah & Kemasan", namaEn: "Containers & Packaging", orderIndex: 3 },
  { kode: "METALS_MINERALS_MINING", sectorCode: "BASIC_MATERIALS", namaId: "Logam, Mineral & Pertambangan", namaEn: "Metals, Minerals & Mining", orderIndex: 4 },
  { kode: "WOOD_PAPER", sectorCode: "BASIC_MATERIALS", namaId: "Kayu & Kertas", namaEn: "Wood & Paper", orderIndex: 5 },

  // INDUSTRIALS
  { kode: "INDUSTRIAL_GOODS", sectorCode: "INDUSTRIALS", namaId: "Barang Industri", namaEn: "Industrial Goods", orderIndex: 1 },
  { kode: "INDUSTRIAL_SERVICES", sectorCode: "INDUSTRIALS", namaId: "Jasa Industri", namaEn: "Industrial Services", orderIndex: 2 },
  { kode: "MULTI_SECTOR_HOLDINGS", sectorCode: "INDUSTRIALS", namaId: "Perusahaan Holding Multi Sektor", namaEn: "Multi-sector Holdings", orderIndex: 3 },

  // CONSUMER CYCLICALS
  { kode: "AUTOMOBILES_COMPONENTS", sectorCode: "CONSUMER_CYCLICALS", namaId: "Otomotif & Komponen", namaEn: "Automobiles & Components", orderIndex: 1 },
  { kode: "HOUSEHOLD_GOODS", sectorCode: "CONSUMER_CYCLICALS", namaId: "Barang Rumah Tangga Tahan Lama", namaEn: "Household Goods", orderIndex: 2 },
  { kode: "LEISURE_GOODS", sectorCode: "CONSUMER_CYCLICALS", namaId: "Barang Rekreasi", namaEn: "Leisure Goods", orderIndex: 3 },
  { kode: "TEXTILES_APPAREL_LUXURY", sectorCode: "CONSUMER_CYCLICALS", namaId: "Tekstil, Pakaian, & Barang Mewah", namaEn: "Textiles, Apparel & Luxury Goods", orderIndex: 4 },
  { kode: "MEDIA_ENTERTAINMENT", sectorCode: "CONSUMER_CYCLICALS", namaId: "Media & Hiburan", namaEn: "Media & Entertainment", orderIndex: 5 },
  { kode: "RETAILING", sectorCode: "CONSUMER_CYCLICALS", namaId: "Ritel Konsumen Non-Primer", namaEn: "Retailing", orderIndex: 6 },
  { kode: "CONSUMER_SERVICES", sectorCode: "CONSUMER_CYCLICALS", namaId: "Jasa Konsumen", namaEn: "Consumer Services", orderIndex: 7 },

  // CONSUMER STAPLES (Non-Cyclicals)
  { kode: "FOOD_BEVERAGE", sectorCode: "CONSUMER_STAPLES", namaId: "Makanan & Minuman", namaEn: "Food & Beverage", orderIndex: 1 },
  { kode: "TOBACCO", sectorCode: "CONSUMER_STAPLES", namaId: "Tembakau", namaEn: "Tobacco", orderIndex: 2 },
  { kode: "FOOD_STAPLES_RETAILING", sectorCode: "CONSUMER_STAPLES", namaId: "Ritel Konsumen Primer", namaEn: "Food & Staples Retailing", orderIndex: 3 },
  { kode: "NON_DURABLE_HOUSEHOLD", sectorCode: "CONSUMER_STAPLES", namaId: "Barang Rumah Tangga Tidak Tahan Lama", namaEn: "Nondurable Household Products", orderIndex: 4 },

  // HEALTHCARE
  { kode: "PHARMACEUTICALS", sectorCode: "HEALTHCARE", namaId: "Farmasi", namaEn: "Pharmaceuticals", orderIndex: 1 },
  { kode: "HEALTHCARE_EQUIP_SVC", sectorCode: "HEALTHCARE", namaId: "Peralatan & Jasa Kesehatan", namaEn: "Healthcare Equipment & Services", orderIndex: 2 },

  // FINANCIALS
  { kode: "BANKS", sectorCode: "FINANCIALS", namaId: "Bank", namaEn: "Banks", orderIndex: 1 },
  { kode: "FINANCING_SERVICE", sectorCode: "FINANCIALS", namaId: "Jasa Pembiayaan", namaEn: "Financing Service", orderIndex: 2 },
  { kode: "INVESTMENT_SERVICE", sectorCode: "FINANCIALS", namaId: "Jasa Investasi", namaEn: "Investment Service", orderIndex: 3 },
  { kode: "INSURANCE", sectorCode: "FINANCIALS", namaId: "Asuransi", namaEn: "Insurance", orderIndex: 4 },
  { kode: "HOLDING_INVESTMENT_COMP", sectorCode: "FINANCIALS", namaId: "Perusahaan Holding & Investasi", namaEn: "Holding & Investment Companies", orderIndex: 5 },

  // PROPERTIES & REAL ESTATE
  { kode: "PROPERTIES_REAL_ESTATE_SUB", sectorCode: "PROPERTIES_REAL_ESTATE", namaId: "Properti & Real Estat", namaEn: "Properties & Real Estate", orderIndex: 1 },

  // TECHNOLOGY
  { kode: "SOFTWARE_IT_SERVICES", sectorCode: "TECHNOLOGY", namaId: "Software & Jasa IT", namaEn: "Software & IT Services", orderIndex: 1 },
  { kode: "TECHNOLOGY_HARDWARE", sectorCode: "TECHNOLOGY", namaId: "Teknologi & Perangkat Keras", namaEn: "Technology Hardware & Equipment", orderIndex: 2 },

  // INFRASTRUCTURES
  { kode: "TELECOMMUNICATION", sectorCode: "INFRASTRUCTURES", namaId: "Telekomunikasi", namaEn: "Telecommunication", orderIndex: 1 },
  { kode: "UTILITIES", sectorCode: "INFRASTRUCTURES", namaId: "Utilitas", namaEn: "Utilities", orderIndex: 2 },
  { kode: "HEAVY_CONSTRUCTION_CIVIL", sectorCode: "INFRASTRUCTURES", namaId: "Konstruksi Berat & Teknik Sipil", namaEn: "Heavy Constructions & Civil Engineering", orderIndex: 3 },
  { kode: "TRANSPORTATION_INFRA", sectorCode: "INFRASTRUCTURES", namaId: "Infrastruktur Transportasi", namaEn: "Transportation Infrastructure", orderIndex: 4 },

  // TRANSPORTATION & LOGISTIC
  { kode: "TRANSPORTATION", sectorCode: "TRANSPORTATION_LOGISTIC", namaId: "Transportasi", namaEn: "Transportation", orderIndex: 1 },
  { kode: "LOGISTICS_DELIVERY", sectorCode: "TRANSPORTATION_LOGISTIC", namaId: "Jasa Logistik & Pengiriman", namaEn: "Logistics & Deliveries", orderIndex: 2 },

  // INVESTMENT PRODUCTS
  { kode: "ETF", sectorCode: "INVESTMENT_PRODUCTS", namaId: "Exchange-Traded Funds", namaEn: "Exchange-Traded Funds", orderIndex: 1 },
  { kode: "REIT", sectorCode: "INVESTMENT_PRODUCTS", namaId: "DIRE (Dana Investasi Real Estat)", namaEn: "Real Estate Investment Trusts", orderIndex: 2 },
];

const indicesSeed: NewIndex[] = [
  {
    kode: "IHSG",
    nama: "Indeks Harga Saham Gabungan",
    deskripsi: "Indeks komposit seluruh saham tercatat di BEI. Benchmark utama pasar saham Indonesia.",
    methodology: "Market-cap weighted (full free-float adjusted sejak 2022)",
    rebalancingPeriod: "Continuous",
    memberCountTarget: null,
    isActive: true,
    isSharia: false,
    orderIndex: 1,
  },
  {
    kode: "LQ45",
    nama: "LQ45",
    deskripsi: "45 saham dengan likuiditas tinggi dan kapitalisasi pasar besar.",
    methodology: "Liquidity & market-cap screened, free-float weighted",
    rebalancingPeriod: "Semi-annual (Feb & Aug)",
    memberCountTarget: 45,
    isActive: true,
    isSharia: false,
    orderIndex: 2,
  },
  {
    kode: "IDX30",
    nama: "IDX30",
    deskripsi: "30 saham paling likuid dari konstituen LQ45.",
    methodology: "Subset dari LQ45 by liquidity & market-cap",
    rebalancingPeriod: "Semi-annual (Feb & Aug)",
    memberCountTarget: 30,
    isActive: true,
    isSharia: false,
    orderIndex: 3,
  },
  {
    kode: "IDX80",
    nama: "IDX80",
    deskripsi: "80 saham dengan likuiditas tinggi dan fundamental baik.",
    methodology: "Free-float adjusted market-cap weighted",
    rebalancingPeriod: "Semi-annual (Feb & Aug)",
    memberCountTarget: 80,
    isActive: true,
    isSharia: false,
    orderIndex: 4,
  },
  {
    kode: "KOMPAS100",
    nama: "Kompas100",
    deskripsi: "100 saham hasil seleksi BEI bekerja sama dengan harian Kompas.",
    methodology: "Free-float weighted, screened by liquidity, fundamentals, market cap",
    rebalancingPeriod: "Semi-annual (Feb & Aug)",
    memberCountTarget: 100,
    isActive: true,
    isSharia: false,
    orderIndex: 5,
  },
  {
    kode: "IDXBUMN20",
    nama: "IDX BUMN20",
    deskripsi: "20 saham BUMN dan anak usaha BUMN dengan likuiditas terbaik.",
    methodology: "Free-float adjusted market-cap weighted, BUMN universe",
    rebalancingPeriod: "Semi-annual (May & Nov)",
    memberCountTarget: 20,
    isActive: true,
    isSharia: false,
    orderIndex: 6,
  },
  {
    kode: "IDXSMC_LIQ",
    nama: "IDX SMC Liquid",
    deskripsi: "Small-Mid Cap dengan likuiditas tinggi.",
    methodology: "Small-mid cap universe, liquidity screened",
    rebalancingPeriod: "Semi-annual",
    memberCountTarget: null,
    isActive: true,
    isSharia: false,
    orderIndex: 7,
  },
  {
    kode: "IDXSMC_COMP",
    nama: "IDX SMC Composite",
    deskripsi: "Indeks komposit untuk seluruh saham small-mid cap.",
    methodology: "Market-cap weighted small-mid cap universe",
    rebalancingPeriod: "Semi-annual",
    memberCountTarget: null,
    isActive: true,
    isSharia: false,
    orderIndex: 8,
  },
  {
    kode: "JII",
    nama: "Jakarta Islamic Index",
    deskripsi: "30 saham syariah paling likuid sesuai prinsip syariah Islam.",
    methodology: "DES (Daftar Efek Syariah) OJK + screening market cap & likuiditas",
    rebalancingPeriod: "Semi-annual (May & Nov)",
    memberCountTarget: 30,
    isActive: true,
    isSharia: true,
    orderIndex: 9,
  },
  {
    kode: "JII70",
    nama: "Jakarta Islamic Index 70",
    deskripsi: "70 saham syariah paling likuid.",
    methodology: "DES OJK + screening market cap & likuiditas",
    rebalancingPeriod: "Semi-annual (May & Nov)",
    memberCountTarget: 70,
    isActive: true,
    isSharia: true,
    orderIndex: 10,
  },
  {
    kode: "IDX_QUALITY30",
    nama: "IDX Quality 30",
    deskripsi: "30 saham dengan kualitas fundamental tinggi (profitabilitas tinggi, leverage rendah, earning stabil).",
    methodology: "Multi-factor quality score (ROE, debt-to-equity, earnings variability)",
    rebalancingPeriod: "Semi-annual",
    memberCountTarget: 30,
    isActive: true,
    isSharia: false,
    orderIndex: 11,
  },
  {
    kode: "IDX_VALUE30",
    nama: "IDX Value 30",
    deskripsi: "30 saham dengan valuasi atraktif (P/E, P/B, P/S rendah).",
    methodology: "Multi-factor value score",
    rebalancingPeriod: "Semi-annual",
    memberCountTarget: 30,
    isActive: true,
    isSharia: false,
    orderIndex: 12,
  },
  {
    kode: "IDX_GROWTH30",
    nama: "IDX Growth 30",
    deskripsi: "30 saham dengan pertumbuhan tinggi (revenue, EPS, equity growth).",
    methodology: "Multi-factor growth score",
    rebalancingPeriod: "Semi-annual",
    memberCountTarget: 30,
    isActive: true,
    isSharia: false,
    orderIndex: 13,
  },
  {
    kode: "IDX_HIDIV20",
    nama: "IDX High Dividend 20",
    deskripsi: "20 saham dengan dividen tunai konsisten dan dividend yield tinggi.",
    methodology: "Dividend yield ranking + payment track record screen",
    rebalancingPeriod: "Annual",
    memberCountTarget: 20,
    isActive: true,
    isSharia: false,
    orderIndex: 14,
  },
  {
    kode: "SRI_KEHATI",
    nama: "SRI-KEHATI",
    deskripsi: "25 saham dengan praktik sustainable & responsible investment (SRI) bekerjasama dengan Yayasan KEHATI.",
    methodology: "ESG screening + financial screening",
    rebalancingPeriod: "Semi-annual (Apr & Oct)",
    memberCountTarget: 25,
    isActive: true,
    isSharia: false,
    orderIndex: 15,
  },
  {
    kode: "IDX_ESG_LEADERS",
    nama: "IDX ESG Leaders",
    deskripsi: "Saham dengan skor ESG (Environmental, Social, Governance) terbaik berdasarkan Sustainalytics.",
    methodology: "ESG risk rating + liquidity screen",
    rebalancingPeriod: "Annual",
    memberCountTarget: null,
    isActive: true,
    isSharia: false,
    orderIndex: 16,
  },
  {
    kode: "BISNIS27",
    nama: "Bisnis-27",
    deskripsi: "27 saham unggulan hasil kerjasama BEI dan harian Bisnis Indonesia.",
    methodology: "Fundamental & technical screening (kerjasama BEI x Bisnis Indonesia)",
    rebalancingPeriod: "Semi-annual",
    memberCountTarget: 27,
    isActive: true,
    isSharia: false,
    orderIndex: 17,
  },
  {
    kode: "INVESTOR33",
    nama: "Investor33",
    deskripsi: "33 saham unggulan hasil kerjasama BEI dan majalah Investor.",
    methodology: "Fundamental screening (kerjasama BEI x Majalah Investor)",
    rebalancingPeriod: "Semi-annual",
    memberCountTarget: 33,
    isActive: true,
    isSharia: false,
    orderIndex: 18,
  },
];

const currenciesSeed: NewCurrency[] = [
  { kode: "IDR", nama: "Rupiah Indonesia", simbol: "Rp", kodeIso4217: "IDR", isPrimary: true, isActive: true },
  { kode: "USD", nama: "Dolar Amerika Serikat", simbol: "$", kodeIso4217: "USD", isPrimary: false, isActive: true },
  { kode: "EUR", nama: "Euro", simbol: "€", kodeIso4217: "EUR", isPrimary: false, isActive: true },
  { kode: "SGD", nama: "Dolar Singapura", simbol: "S$", kodeIso4217: "SGD", isPrimary: false, isActive: true },
  { kode: "JPY", nama: "Yen Jepang", simbol: "¥", kodeIso4217: "JPY", isPrimary: false, isActive: true },
  { kode: "CNY", nama: "Yuan Tiongkok", simbol: "¥", kodeIso4217: "CNY", isPrimary: false, isActive: true },
  { kode: "HKD", nama: "Dolar Hong Kong", simbol: "HK$", kodeIso4217: "HKD", isPrimary: false, isActive: true },
  { kode: "MYR", nama: "Ringgit Malaysia", simbol: "RM", kodeIso4217: "MYR", isPrimary: false, isActive: true },
  { kode: "AUD", nama: "Dolar Australia", simbol: "A$", kodeIso4217: "AUD", isPrimary: false, isActive: true },
  { kode: "GBP", nama: "Pound Sterling Britania", simbol: "£", kodeIso4217: "GBP", isPrimary: false, isActive: true },
];

const countriesSeed: NewCountry[] = [
  { kodeIso: "ID", namaId: "Indonesia", namaEn: "Indonesia", currencyCode: "IDR", isPrimary: true, isActive: true },
  { kodeIso: "US", namaId: "Amerika Serikat", namaEn: "United States", currencyCode: "USD", isPrimary: false, isActive: true },
  { kodeIso: "CN", namaId: "Tiongkok", namaEn: "China", currencyCode: "CNY", isPrimary: false, isActive: true },
  { kodeIso: "JP", namaId: "Jepang", namaEn: "Japan", currencyCode: "JPY", isPrimary: false, isActive: true },
  { kodeIso: "SG", namaId: "Singapura", namaEn: "Singapore", currencyCode: "SGD", isPrimary: false, isActive: true },
  { kodeIso: "MY", namaId: "Malaysia", namaEn: "Malaysia", currencyCode: "MYR", isPrimary: false, isActive: true },
  { kodeIso: "HK", namaId: "Hong Kong", namaEn: "Hong Kong", currencyCode: "HKD", isPrimary: false, isActive: true },
  { kodeIso: "AU", namaId: "Australia", namaEn: "Australia", currencyCode: "AUD", isPrimary: false, isActive: true },
  { kodeIso: "GB", namaId: "Britania Raya", namaEn: "United Kingdom", currencyCode: "GBP", isPrimary: false, isActive: true },
  { kodeIso: "IN", namaId: "India", namaEn: "India", currencyCode: null, isPrimary: false, isActive: true },
  { kodeIso: "KR", namaId: "Korea Selatan", namaEn: "South Korea", currencyCode: null, isPrimary: false, isActive: true },
  { kodeIso: "TH", namaId: "Thailand", namaEn: "Thailand", currencyCode: null, isPrimary: false, isActive: true },
];

export async function seedReference() {
  logger.info("Seeding reference data...");

  // Order matters: parent → child (FK).
  // 1. currencies (independent)
  for (const row of currenciesSeed) {
    await db.insert(currencies).values(row).onConflictDoNothing({ target: currencies.kode });
  }
  logger.info(`Seeded ${currenciesSeed.length} currencies`);

  // 2. countries (FK → currencies)
  for (const row of countriesSeed) {
    await db.insert(countries).values(row).onConflictDoNothing({ target: countries.kodeIso });
  }
  logger.info(`Seeded ${countriesSeed.length} countries`);

  // 3. papan_listing (independent)
  for (const row of papanListingSeed) {
    await db.insert(papanListing).values(row).onConflictDoNothing({ target: papanListing.kode });
  }
  logger.info(`Seeded ${papanListingSeed.length} papan_listing entries`);

  // 4. sectors (independent)
  for (const row of sectorsSeed) {
    await db.insert(sectors).values(row).onConflictDoNothing({ target: sectors.kode });
  }
  logger.info(`Seeded ${sectorsSeed.length} sectors`);

  // 5. sub_sectors (FK → sectors)
  for (const row of subSectorsSeed) {
    await db.insert(subSectors).values(row).onConflictDoNothing({ target: subSectors.kode });
  }
  logger.info(`Seeded ${subSectorsSeed.length} sub_sectors`);

  // 6. indices (independent)
  for (const row of indicesSeed) {
    await db.insert(indices).values(row).onConflictDoNothing({ target: indices.kode });
  }
  logger.info(`Seeded ${indicesSeed.length} indices`);

  logger.info("Reference data seed complete");
}
