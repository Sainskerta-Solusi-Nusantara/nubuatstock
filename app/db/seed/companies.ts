import { db } from "../../lib/db";
import { companies, indexConstituents } from "../schema/companies";
import { logger } from "../../lib/logger";

/**
 * Seed companies (emiten) untuk MVP — IDX80 constituents per Oktober 2024-Apr 2025 review
 * (sumber publik: idx.co.id/data-pasar/data-saham/indeks-saham, KSEI, factsheet emiten).
 *
 * - Hanya metadata (kode, nama, papan, sektor, tanggal IPO, syariah flag).
 * - Financials & market cap di-fetch live oleh Agent 5; field di sini biarkan null.
 * - Idempotent: ON CONFLICT DO NOTHING di kode.
 *
 * Sektor mengikuti enum di lib/types/reference.ts (`sectorKodeSchema`):
 *   ENERGY, BASIC_MATERIALS, INDUSTRIALS, CONSUMER_STAPLES, CONSUMER_CYCLICALS,
 *   HEALTHCARE, FINANCIALS, PROPERTIES_REAL_ESTATE, TECHNOLOGY, INFRASTRUCTURES,
 *   TRANSPORTATION_LOGISTIC, INVESTMENT_PRODUCTS.
 *
 * Papan mengikuti enum `papanListingKodeSchema`:
 *   UTAMA, PENGEMBANGAN, AKSELERASI, EKONOMI_BARU, PEMANTAUAN_KHUSUS.
 */

type PapanKodeSeed =
  | "UTAMA"
  | "PENGEMBANGAN"
  | "AKSELERASI"
  | "EKONOMI_BARU"
  | "PEMANTAUAN_KHUSUS";

interface SeedCompany {
  kode: string;
  namaPerusahaan: string;
  papanKode: PapanKodeSeed;
  sectorKode: string;
  tanggalIpo: string;
  isSyariah?: boolean;
  website?: string;
  deskripsi?: string;
}

const idx80: SeedCompany[] = [
  // ===== FINANCIALS (Bank & jasa keuangan) =====
  { kode: "BBRI", namaPerusahaan: "PT Bank Rakyat Indonesia (Persero) Tbk", papanKode: "UTAMA", sectorKode: "FINANCIALS", tanggalIpo: "2003-11-10", website: "https://bri.co.id" },
  { kode: "BBCA", namaPerusahaan: "PT Bank Central Asia Tbk", papanKode: "UTAMA", sectorKode: "FINANCIALS", tanggalIpo: "2000-05-31", website: "https://bca.co.id" },
  { kode: "BMRI", namaPerusahaan: "PT Bank Mandiri (Persero) Tbk", papanKode: "UTAMA", sectorKode: "FINANCIALS", tanggalIpo: "2003-07-14", website: "https://bankmandiri.co.id" },
  { kode: "BBNI", namaPerusahaan: "PT Bank Negara Indonesia (Persero) Tbk", papanKode: "UTAMA", sectorKode: "FINANCIALS", tanggalIpo: "1996-11-25", website: "https://bni.co.id" },
  { kode: "BRIS", namaPerusahaan: "PT Bank Syariah Indonesia Tbk", papanKode: "UTAMA", sectorKode: "FINANCIALS", tanggalIpo: "2018-05-09", isSyariah: true, website: "https://bankbsi.co.id" },
  { kode: "BTPS", namaPerusahaan: "PT Bank BTPN Syariah Tbk", papanKode: "UTAMA", sectorKode: "FINANCIALS", tanggalIpo: "2018-05-08", isSyariah: true, website: "https://btpnsyariah.com" },
  { kode: "ARTO", namaPerusahaan: "PT Bank Jago Tbk", papanKode: "UTAMA", sectorKode: "FINANCIALS", tanggalIpo: "2016-01-12", website: "https://jago.com" },
  { kode: "BNGA", namaPerusahaan: "PT Bank CIMB Niaga Tbk", papanKode: "UTAMA", sectorKode: "FINANCIALS", tanggalIpo: "1989-11-29", website: "https://cimbniaga.co.id" },
  { kode: "BBTN", namaPerusahaan: "PT Bank Tabungan Negara (Persero) Tbk", papanKode: "UTAMA", sectorKode: "FINANCIALS", tanggalIpo: "2009-12-17", website: "https://btn.co.id" },
  { kode: "BTPN", namaPerusahaan: "PT Bank BTPN Tbk", papanKode: "UTAMA", sectorKode: "FINANCIALS", tanggalIpo: "2008-03-12", website: "https://btpn.com" },
  { kode: "BNII", namaPerusahaan: "PT Bank Maybank Indonesia Tbk", papanKode: "UTAMA", sectorKode: "FINANCIALS", tanggalIpo: "1989-11-21", website: "https://maybank.co.id" },
  { kode: "PNBN", namaPerusahaan: "PT Bank Pan Indonesia Tbk", papanKode: "UTAMA", sectorKode: "FINANCIALS", tanggalIpo: "1982-12-29", website: "https://panin.co.id" },
  { kode: "BJTM", namaPerusahaan: "PT Bank Pembangunan Daerah Jawa Timur Tbk", papanKode: "UTAMA", sectorKode: "FINANCIALS", tanggalIpo: "2012-07-12", website: "https://bankjatim.co.id" },
  { kode: "MEGA", namaPerusahaan: "PT Bank Mega Tbk", papanKode: "UTAMA", sectorKode: "FINANCIALS", tanggalIpo: "2000-04-17", website: "https://bankmega.com" },

  // ===== ENERGY (Migas & batubara) =====
  { kode: "ADRO", namaPerusahaan: "PT Alamtri Resources Indonesia Tbk", papanKode: "UTAMA", sectorKode: "ENERGY", tanggalIpo: "2008-07-16", website: "https://alamtri.com" },
  { kode: "PTBA", namaPerusahaan: "PT Bukit Asam Tbk", papanKode: "UTAMA", sectorKode: "ENERGY", tanggalIpo: "2002-12-23", website: "https://ptba.co.id" },
  { kode: "ITMG", namaPerusahaan: "PT Indo Tambangraya Megah Tbk", papanKode: "UTAMA", sectorKode: "ENERGY", tanggalIpo: "2007-12-18", website: "https://itmg.co.id" },
  { kode: "MEDC", namaPerusahaan: "PT Medco Energi Internasional Tbk", papanKode: "UTAMA", sectorKode: "ENERGY", tanggalIpo: "1994-10-12", website: "https://medcoenergi.com" },
  { kode: "INDY", namaPerusahaan: "PT Indika Energy Tbk", papanKode: "UTAMA", sectorKode: "ENERGY", tanggalIpo: "2008-06-11", website: "https://indikaenergy.co.id" },
  { kode: "HRUM", namaPerusahaan: "PT Harum Energy Tbk", papanKode: "UTAMA", sectorKode: "ENERGY", tanggalIpo: "2010-10-06", website: "https://harumenergy.com" },
  { kode: "AKRA", namaPerusahaan: "PT AKR Corporindo Tbk", papanKode: "UTAMA", sectorKode: "ENERGY", tanggalIpo: "1994-10-03", website: "https://akr.co.id" },
  { kode: "ENRG", namaPerusahaan: "PT Energi Mega Persada Tbk", papanKode: "UTAMA", sectorKode: "ENERGY", tanggalIpo: "2004-06-07", website: "https://energi-mp.com" },
  { kode: "BYAN", namaPerusahaan: "PT Bayan Resources Tbk", papanKode: "UTAMA", sectorKode: "ENERGY", tanggalIpo: "2008-08-12", website: "https://bayan.com.sg" },

  // ===== BASIC_MATERIALS (Tambang logam, semen, kimia) =====
  { kode: "INCO", namaPerusahaan: "PT Vale Indonesia Tbk", papanKode: "UTAMA", sectorKode: "BASIC_MATERIALS", tanggalIpo: "1990-05-16", website: "https://vale.com/indonesia" },
  { kode: "ANTM", namaPerusahaan: "PT Aneka Tambang Tbk", papanKode: "UTAMA", sectorKode: "BASIC_MATERIALS", tanggalIpo: "1997-11-27", website: "https://antam.com" },
  { kode: "MDKA", namaPerusahaan: "PT Merdeka Copper Gold Tbk", papanKode: "UTAMA", sectorKode: "BASIC_MATERIALS", tanggalIpo: "2015-06-19", website: "https://merdekacoppergold.com" },
  { kode: "TINS", namaPerusahaan: "PT Timah Tbk", papanKode: "UTAMA", sectorKode: "BASIC_MATERIALS", tanggalIpo: "1995-10-19", website: "https://timah.com" },
  { kode: "BRMS", namaPerusahaan: "PT Bumi Resources Minerals Tbk", papanKode: "UTAMA", sectorKode: "BASIC_MATERIALS", tanggalIpo: "2010-12-09", website: "https://bumiresourcesminerals.com" },
  { kode: "SMGR", namaPerusahaan: "PT Semen Indonesia (Persero) Tbk", papanKode: "UTAMA", sectorKode: "BASIC_MATERIALS", tanggalIpo: "1991-07-08", website: "https://sig.id" },
  { kode: "INTP", namaPerusahaan: "PT Indocement Tunggal Prakarsa Tbk", papanKode: "UTAMA", sectorKode: "BASIC_MATERIALS", tanggalIpo: "1989-12-05", website: "https://indocement.co.id" },
  { kode: "BRPT", namaPerusahaan: "PT Barito Pacific Tbk", papanKode: "UTAMA", sectorKode: "BASIC_MATERIALS", tanggalIpo: "1993-10-01", website: "https://barito-pacific.com" },
  { kode: "TPIA", namaPerusahaan: "PT Chandra Asri Pacific Tbk", papanKode: "UTAMA", sectorKode: "BASIC_MATERIALS", tanggalIpo: "2008-05-26", website: "https://chandra-asri.com" },
  { kode: "MDKE", namaPerusahaan: "PT Merdeka Battery Materials Tbk", papanKode: "UTAMA", sectorKode: "BASIC_MATERIALS", tanggalIpo: "2023-04-18", website: "https://merdekabattery.com" },

  // ===== CONSUMER_STAPLES (FMCG, rokok, susu) =====
  { kode: "UNVR", namaPerusahaan: "PT Unilever Indonesia Tbk", papanKode: "UTAMA", sectorKode: "CONSUMER_STAPLES", tanggalIpo: "1982-01-11", website: "https://unilever.co.id" },
  { kode: "ICBP", namaPerusahaan: "PT Indofood CBP Sukses Makmur Tbk", papanKode: "UTAMA", sectorKode: "CONSUMER_STAPLES", tanggalIpo: "2010-10-07", website: "https://indofoodcbp.com" },
  { kode: "INDF", namaPerusahaan: "PT Indofood Sukses Makmur Tbk", papanKode: "UTAMA", sectorKode: "CONSUMER_STAPLES", tanggalIpo: "1994-07-14", website: "https://indofood.com" },
  { kode: "GGRM", namaPerusahaan: "PT Gudang Garam Tbk", papanKode: "UTAMA", sectorKode: "CONSUMER_STAPLES", tanggalIpo: "1990-08-27", website: "https://gudanggaramtbk.com" },
  { kode: "HMSP", namaPerusahaan: "PT HM Sampoerna Tbk", papanKode: "UTAMA", sectorKode: "CONSUMER_STAPLES", tanggalIpo: "1990-08-15", website: "https://sampoerna.com" },
  { kode: "MYOR", namaPerusahaan: "PT Mayora Indah Tbk", papanKode: "UTAMA", sectorKode: "CONSUMER_STAPLES", tanggalIpo: "1990-07-04", website: "https://mayora.com" },
  { kode: "SIDO", namaPerusahaan: "PT Industri Jamu dan Farmasi Sido Muncul Tbk", papanKode: "UTAMA", sectorKode: "CONSUMER_STAPLES", tanggalIpo: "2013-12-18", website: "https://sidomuncul.co.id" },
  { kode: "ULTJ", namaPerusahaan: "PT Ultrajaya Milk Industry & Trading Company Tbk", papanKode: "UTAMA", sectorKode: "CONSUMER_STAPLES", tanggalIpo: "1990-07-02", website: "https://ultrajaya.co.id" },
  { kode: "CPIN", namaPerusahaan: "PT Charoen Pokphand Indonesia Tbk", papanKode: "UTAMA", sectorKode: "CONSUMER_STAPLES", tanggalIpo: "1991-03-18", website: "https://cp.co.id" },
  { kode: "JPFA", namaPerusahaan: "PT Japfa Comfeed Indonesia Tbk", papanKode: "UTAMA", sectorKode: "CONSUMER_STAPLES", tanggalIpo: "1989-10-23", website: "https://japfacomfeed.co.id" },
  { kode: "AALI", namaPerusahaan: "PT Astra Agro Lestari Tbk", papanKode: "UTAMA", sectorKode: "CONSUMER_STAPLES", tanggalIpo: "1997-12-09", website: "https://astra-agro.co.id" },
  { kode: "LSIP", namaPerusahaan: "PT PP London Sumatra Indonesia Tbk", papanKode: "UTAMA", sectorKode: "CONSUMER_STAPLES", tanggalIpo: "1996-07-05", website: "https://londonsumatra.com" },

  // ===== CONSUMER_CYCLICALS (Otomotif, retail, mode) =====
  { kode: "ASII", namaPerusahaan: "PT Astra International Tbk", papanKode: "UTAMA", sectorKode: "CONSUMER_CYCLICALS", tanggalIpo: "1990-04-04", website: "https://astra.co.id" },
  { kode: "IMAS", namaPerusahaan: "PT Indomobil Sukses Internasional Tbk", papanKode: "UTAMA", sectorKode: "CONSUMER_CYCLICALS", tanggalIpo: "1993-11-15", website: "https://indomobil.com" },
  { kode: "MAPI", namaPerusahaan: "PT Mitra Adiperkasa Tbk", papanKode: "UTAMA", sectorKode: "CONSUMER_CYCLICALS", tanggalIpo: "2004-11-10", website: "https://map.co.id" },
  { kode: "ACES", namaPerusahaan: "PT Aspirasi Hidup Indonesia Tbk", papanKode: "UTAMA", sectorKode: "CONSUMER_CYCLICALS", tanggalIpo: "2007-11-06", website: "https://acehardware.co.id" },
  { kode: "ERAA", namaPerusahaan: "PT Erajaya Swasembada Tbk", papanKode: "UTAMA", sectorKode: "CONSUMER_CYCLICALS", tanggalIpo: "2011-12-14", website: "https://erajaya.com" },
  { kode: "MNCN", namaPerusahaan: "PT Media Nusantara Citra Tbk", papanKode: "UTAMA", sectorKode: "CONSUMER_CYCLICALS", tanggalIpo: "2007-06-22", website: "https://mnc.co.id" },
  { kode: "SCMA", namaPerusahaan: "PT Surya Citra Media Tbk", papanKode: "UTAMA", sectorKode: "CONSUMER_CYCLICALS", tanggalIpo: "2002-07-16", website: "https://scm.co.id" },

  // ===== HEALTHCARE =====
  { kode: "KLBF", namaPerusahaan: "PT Kalbe Farma Tbk", papanKode: "UTAMA", sectorKode: "HEALTHCARE", tanggalIpo: "1991-07-30", website: "https://kalbe.co.id" },
  { kode: "KAEF", namaPerusahaan: "PT Kimia Farma Tbk", papanKode: "UTAMA", sectorKode: "HEALTHCARE", tanggalIpo: "2001-07-04", website: "https://kimiafarma.co.id" },
  { kode: "INAF", namaPerusahaan: "PT Indofarma Tbk", papanKode: "UTAMA", sectorKode: "HEALTHCARE", tanggalIpo: "2001-04-17", website: "https://indofarma.id" },
  { kode: "MIKA", namaPerusahaan: "PT Mitra Keluarga Karyasehat Tbk", papanKode: "UTAMA", sectorKode: "HEALTHCARE", tanggalIpo: "2015-03-24", website: "https://mitrakeluarga.com" },
  { kode: "HEAL", namaPerusahaan: "PT Medikaloka Hermina Tbk", papanKode: "UTAMA", sectorKode: "HEALTHCARE", tanggalIpo: "2018-05-16", website: "https://herminahospitals.com" },
  { kode: "SILO", namaPerusahaan: "PT Siloam International Hospitals Tbk", papanKode: "UTAMA", sectorKode: "HEALTHCARE", tanggalIpo: "2013-09-12", website: "https://siloamhospitals.com" },

  // ===== PROPERTIES_REAL_ESTATE =====
  { kode: "BSDE", namaPerusahaan: "PT Bumi Serpong Damai Tbk", papanKode: "UTAMA", sectorKode: "PROPERTIES_REAL_ESTATE", tanggalIpo: "2008-06-06", website: "https://sinarmasland.com" },
  { kode: "CTRA", namaPerusahaan: "PT Ciputra Development Tbk", papanKode: "UTAMA", sectorKode: "PROPERTIES_REAL_ESTATE", tanggalIpo: "1994-03-28", website: "https://ciputradevelopment.com" },
  { kode: "PWON", namaPerusahaan: "PT Pakuwon Jati Tbk", papanKode: "UTAMA", sectorKode: "PROPERTIES_REAL_ESTATE", tanggalIpo: "1989-10-09", website: "https://pakuwonjati.com" },
  { kode: "SMRA", namaPerusahaan: "PT Summarecon Agung Tbk", papanKode: "UTAMA", sectorKode: "PROPERTIES_REAL_ESTATE", tanggalIpo: "1990-05-07", website: "https://summarecon.com" },
  { kode: "LPKR", namaPerusahaan: "PT Lippo Karawaci Tbk", papanKode: "UTAMA", sectorKode: "PROPERTIES_REAL_ESTATE", tanggalIpo: "1996-06-28", website: "https://lippokarawaci.co.id" },

  // ===== TECHNOLOGY =====
  { kode: "GOTO", namaPerusahaan: "PT GoTo Gojek Tokopedia Tbk", papanKode: "EKONOMI_BARU", sectorKode: "TECHNOLOGY", tanggalIpo: "2022-04-11", website: "https://gotocompany.com" },
  { kode: "BUKA", namaPerusahaan: "PT Bukalapak.com Tbk", papanKode: "EKONOMI_BARU", sectorKode: "TECHNOLOGY", tanggalIpo: "2021-08-06", website: "https://bukalapak.com" },
  { kode: "EMTK", namaPerusahaan: "PT Elang Mahkota Teknologi Tbk", papanKode: "UTAMA", sectorKode: "TECHNOLOGY", tanggalIpo: "2010-01-12", website: "https://emtek.co.id" },
  { kode: "DCII", namaPerusahaan: "PT DCI Indonesia Tbk", papanKode: "UTAMA", sectorKode: "TECHNOLOGY", tanggalIpo: "2021-01-06", website: "https://dci-indonesia.com" },
  { kode: "MTEL", namaPerusahaan: "PT Dayamitra Telekomunikasi Tbk", papanKode: "UTAMA", sectorKode: "INFRASTRUCTURES", tanggalIpo: "2021-11-22", website: "https://mitratel.co.id" },

  // ===== INFRASTRUCTURES (Telco, jalan tol, listrik) =====
  { kode: "TLKM", namaPerusahaan: "PT Telkom Indonesia (Persero) Tbk", papanKode: "UTAMA", sectorKode: "INFRASTRUCTURES", tanggalIpo: "1995-11-14", website: "https://telkom.co.id" },
  { kode: "ISAT", namaPerusahaan: "PT Indosat Tbk", papanKode: "UTAMA", sectorKode: "INFRASTRUCTURES", tanggalIpo: "1994-10-19", website: "https://indosatooredoo.com" },
  { kode: "EXCL", namaPerusahaan: "PT XL Axiata Tbk", papanKode: "UTAMA", sectorKode: "INFRASTRUCTURES", tanggalIpo: "2005-09-29", website: "https://xlaxiata.co.id" },
  { kode: "TOWR", namaPerusahaan: "PT Sarana Menara Nusantara Tbk", papanKode: "UTAMA", sectorKode: "INFRASTRUCTURES", tanggalIpo: "2010-03-08", website: "https://ptsmn.co.id" },
  { kode: "TBIG", namaPerusahaan: "PT Tower Bersama Infrastructure Tbk", papanKode: "UTAMA", sectorKode: "INFRASTRUCTURES", tanggalIpo: "2010-10-26", website: "https://tower-bersama.com" },
  { kode: "JSMR", namaPerusahaan: "PT Jasa Marga (Persero) Tbk", papanKode: "UTAMA", sectorKode: "INFRASTRUCTURES", tanggalIpo: "2007-11-12", website: "https://jasamarga.com" },
  { kode: "WSKT", namaPerusahaan: "PT Waskita Karya (Persero) Tbk", papanKode: "PEMANTAUAN_KHUSUS", sectorKode: "INFRASTRUCTURES", tanggalIpo: "2012-12-19", website: "https://waskita.co.id" },
  { kode: "WIKA", namaPerusahaan: "PT Wijaya Karya (Persero) Tbk", papanKode: "PEMANTAUAN_KHUSUS", sectorKode: "INFRASTRUCTURES", tanggalIpo: "2007-10-29", website: "https://wika.co.id" },
  { kode: "ADHI", namaPerusahaan: "PT Adhi Karya (Persero) Tbk", papanKode: "UTAMA", sectorKode: "INFRASTRUCTURES", tanggalIpo: "2004-03-18", website: "https://adhi.co.id" },
  { kode: "PTPP", namaPerusahaan: "PT PP (Persero) Tbk", papanKode: "UTAMA", sectorKode: "INFRASTRUCTURES", tanggalIpo: "2010-02-09", website: "https://ptpp.co.id" },
  { kode: "PGAS", namaPerusahaan: "PT Perusahaan Gas Negara Tbk", papanKode: "UTAMA", sectorKode: "INFRASTRUCTURES", tanggalIpo: "2003-12-15", website: "https://pgn.co.id" },

  // ===== INDUSTRIALS =====
  { kode: "UNTR", namaPerusahaan: "PT United Tractors Tbk", papanKode: "UTAMA", sectorKode: "INDUSTRIALS", tanggalIpo: "1989-09-19", website: "https://unitedtractors.com" },
  { kode: "ASGR", namaPerusahaan: "PT Astra Graphia Tbk", papanKode: "UTAMA", sectorKode: "INDUSTRIALS", tanggalIpo: "1989-11-15", website: "https://astragraphia.co.id" },

  // ===== TRANSPORTATION_LOGISTIC =====
  { kode: "BIRD", namaPerusahaan: "PT Blue Bird Tbk", papanKode: "UTAMA", sectorKode: "TRANSPORTATION_LOGISTIC", tanggalIpo: "2014-11-05", website: "https://bluebirdgroup.com" },
  { kode: "SMDR", namaPerusahaan: "PT Samudera Indonesia Tbk", papanKode: "UTAMA", sectorKode: "TRANSPORTATION_LOGISTIC", tanggalIpo: "1999-07-05", website: "https://samudera.com" },
];

/**
 * Index constituency seed — daftar saham yang masuk IDX80 per snapshot Apr-Okt 2025.
 *
 * - `effective_from`: tanggal review IDX. `effective_to`: null = current.
 * - Hanya seed beberapa indeks headline; daftar lengkap di-maintain manual via admin
 *   atau di-update otomatis dari sumber resmi IDX di Agent 5 nanti.
 */
interface SeedConstituent {
  indexKode: string;
  companyKode: string;
  effectiveFrom: string;
}

const idx80Constituents: SeedConstituent[] = idx80.map((c) => ({
  indexKode: "IDX80",
  companyKode: c.kode,
  effectiveFrom: "2025-02-03", // Februari 2025 IDX80 review
}));

// Headline IDX30 subset (top market-cap & liquidity per Feb 2025)
const idx30Constituents: SeedConstituent[] = [
  "BBRI", "BBCA", "BMRI", "BBNI", "BRIS", "ASII", "TLKM", "TPIA", "AMMN",
  "GOTO", "ADRO", "PTBA", "ITMG", "INCO", "ANTM", "MDKA", "UNVR", "ICBP",
  "INDF", "GGRM", "KLBF", "CPIN", "JPFA", "AALI", "UNTR", "AKRA", "TOWR",
  "BRPT", "SMGR", "JSMR",
].map((kode) => ({ indexKode: "IDX30", companyKode: kode, effectiveFrom: "2025-02-03" }));

// LQ45 (Februari 2025 review, subset overlapping IDX80)
const lq45Constituents: SeedConstituent[] = [
  "BBRI", "BBCA", "BMRI", "BBNI", "BRIS", "BTPS", "ARTO", "BBTN", "BNGA",
  "ASII", "IMAS", "MAPI", "TLKM", "ISAT", "EXCL", "TOWR", "TBIG", "MTEL",
  "ADRO", "PTBA", "ITMG", "MEDC", "INDY", "HRUM", "BYAN",
  "INCO", "ANTM", "MDKA", "TINS", "SMGR", "INTP", "TPIA", "BRPT",
  "UNVR", "ICBP", "INDF", "GGRM", "HMSP", "MYOR", "CPIN", "AALI",
  "KLBF", "MIKA", "HEAL", "BSDE", "CTRA", "PWON", "SMRA",
  "GOTO", "EMTK", "DCII", "AKRA", "UNTR", "JSMR",
].map((kode) => ({ indexKode: "LQ45", companyKode: kode, effectiveFrom: "2025-02-03" }));

// JII (Jakarta Islamic Index) — saham syariah, subset
const jiiConstituents: SeedConstituent[] = [
  "BRIS", "BTPS", "TLKM", "ANTM", "INCO", "MDKA", "PTBA", "ADRO", "INDY",
  "AKRA", "INDF", "ICBP", "UNVR", "CPIN", "JPFA", "AALI", "LSIP", "MYOR",
  "SIDO", "KLBF", "MIKA", "BSDE", "CTRA", "PWON", "SMGR", "INTP", "TPIA",
  "BRPT", "UNTR", "ASII",
].map((kode) => ({ indexKode: "JII", companyKode: kode, effectiveFrom: "2025-05-30" }));

const syariahKodes = new Set(jiiConstituents.map((c) => c.companyKode));

export async function seedCompanies() {
  logger.info("Seeding companies (IDX80)...");

  for (const c of idx80) {
    const isSyariah = c.isSyariah ?? syariahKodes.has(c.kode);
    await db
      .insert(companies)
      .values({
        kode: c.kode,
        namaPerusahaan: c.namaPerusahaan,
        papanKode: c.papanKode,
        sectorKode: c.sectorKode,
        tanggalIpo: c.tanggalIpo,
        isActive: true,
        isSyariah,
        website: c.website ?? null,
        deskripsi: c.deskripsi ?? null,
      })
      .onConflictDoNothing({ target: companies.kode });
  }

  logger.info(`Seeded ${idx80.length} companies`);

  logger.info("Seeding index_constituents (IDX80, IDX30, LQ45, JII)...");
  const allConstituents = [
    ...idx80Constituents,
    ...idx30Constituents,
    ...lq45Constituents,
    ...jiiConstituents,
  ];

  for (const c of allConstituents) {
    await db
      .insert(indexConstituents)
      .values({
        indexKode: c.indexKode,
        companyKode: c.companyKode,
        effectiveFrom: c.effectiveFrom,
      })
      .onConflictDoNothing({
        target: [indexConstituents.indexKode, indexConstituents.companyKode, indexConstituents.effectiveFrom],
      });
  }
  logger.info(`Seeded ${allConstituents.length} index constituents`);
}
