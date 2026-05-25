import { sql } from "drizzle-orm";
import { db } from "../../lib/db";
import { researchReports } from "../schema/research";
import { logger } from "../../lib/logger";

/**
 * Seed 2 sample research reports (untuk demo /research page).
 * Content original — pattern industri standar sell-side (executive summary,
 * thesis, catalyst, valuation, risk). Bukan reproduksi laporan sekuritas spesifik.
 *
 * Disclaimer: angka & target price di sini adalah ILUSTRASI untuk demo UI saja.
 * Tidak boleh dipakai sebagai dasar keputusan investasi.
 */

export async function seedSampleResearch(authorUserId: string) {
  logger.info("Seeding sample research reports...");

  const samples: Array<typeof researchReports.$inferInsert> = [
    {
      slug: "bbri-update-2026-q1-net-interest-margin-resilient",
      title: "BBRI · Net Interest Margin Resilient di Q1, Pertahankan BUY",
      companyKode: "BBRI",
      sectorKode: "FINANCIALS",
      relatedTickers: ["BBRI"],
      reportType: "earnings_review",
      rating: "buy",
      previousRating: "buy",
      timeHorizon: "medium_3_12m",
      currentPriceAtPublish: "4700",
      targetPrice: "5400",
      previousTargetPrice: "5200",
      upsideDownsidePct: "0.149",
      summary:
        "Bank Rakyat Indonesia (BBRI) mencatat hasil Q1 2026 yang sesuai ekspektasi pasar dengan NIM masih di kisaran double-digit dan kualitas aset stabil. Pertumbuhan kredit segmen mikro & ultra-mikro yang menjadi tulang punggung BBRI tetap di atas industry average. Kami memandang valuasi pada P/BV 2.2x masih atraktif dibanding rata-rata historis 5 tahun (2.6x). Pertahankan rating BUY dengan kenaikan target price ke Rp 5.400 (dari Rp 5.200), implying upside 14.9% dari closing terakhir.",
      keyHighlights: [
        "NIM Q1 stabil di kisaran 7.8% — di atas konsensus, didukung repricing kredit & cost of fund yang turun seiring penurunan BI rate.",
        "Loan growth segmen mikro masih +14% YoY — momentum berlanjut dari program Holding Ultra Mikro.",
        "NPL coverage ratio tetap di atas 200%, memberi cushion kuat untuk siklus berikutnya.",
        "Naikkan TP dari Rp 5.200 → Rp 5.400 dengan pendekatan blended P/BV 2.4x + Gordon growth.",
      ],
      sections: [
        {
          key: "thesis",
          title: "Thesis Investasi",
          order: 1,
          content:
            "BBRI tetap menjadi proxy kuat untuk pertumbuhan ekonomi rakyat di Indonesia dengan eksposur dominan di segmen mikro yang historically resilient terhadap shock makro. Dengan ROE konsisten di kisaran 18–20% dan dividend yield ~6%, BBRI menawarkan kombinasi growth + income yang langka di sektor banking domestik.\n\nKami memandang siklus penurunan BI rate yang sedang berlangsung akan menjadi katalis positif jangka pendek untuk NIM, sementara konsolidasi holding Ultra Mikro memberikan exposure structural ke segmen yang underbanked.",
        },
        {
          key: "valuation",
          title: "Detail Valuasi",
          order: 2,
          content:
            "Kami pakai metode blended: 50% P/BV multiple (2.4x untuk FY2026E book value) + 50% Gordon Growth Dividend Discount Model (asumsi long-term growth 6%, payout ratio 60%, cost of equity 11%).\n\nP/BV 2.4x masih di bawah median 5 tahun (2.6x) tapi premium terhadap peer lokal (BMRI 1.9x, BBNI 1.5x) yang justified given ROE BBRI yang konsisten di top quartile sektor.",
        },
        {
          key: "outlook",
          title: "Outlook Kuartal Berikutnya",
          order: 3,
          content:
            "Kami memperkirakan Q2 akan tetap solid dengan pelambatan minor di credit cost (75–85 bps target full year). Risiko utama datang dari potensi normalisasi NPL di segmen UMKM kalau aktivitas ekonomi tidak ter-stimulus seperti yang diharapkan dari penurunan rate.",
        },
      ],
      valuationMethod: "Blended P/BV (50%) + Gordon Growth DDM (50%)",
      valuationDetail: {
        method: "pbv_relative",
        description: "P/BV target 2.4x diaplikasikan ke FY2026E book value per share Rp 2.250.",
        assumptions: {
          target_pbv: 2.4,
          long_term_growth: 0.06,
          payout_ratio: 0.6,
          cost_of_equity: 0.11,
        },
        computedTargetPrice: 5400,
      },
      catalysts: [
        "Penurunan BI rate lanjutan (Q2 2026) berpotensi tambah margin NIM ~10–15 bps.",
        "Rilis kinerja Holding Ultra Mikro consolidated yang menunjukkan synergy realization.",
        "Pengumuman dividen interim H1 2026 (historical pattern: Q3).",
      ],
      riskFactors: [
        "NPL spike di segmen mikro kalau ekonomi melambat lebih dari ekspektasi.",
        "Tekanan margin dari kompetisi digital banking (Allo, Jago, BlueBean).",
        "Risiko regulatori dari pembatasan cost of credit di segmen ultra-mikro.",
      ],
      financialSnapshot: {
        revenue: 175_000_000_000_000, // illustrative
        revenueGrowth: 0.085,
        netIncome: 60_000_000_000_000,
        netIncomeGrowth: 0.072,
        eps: 400,
        pe: 11.75,
        pbv: 2.2,
        roe: 0.187,
        debtToEquity: 5.8,
        dividendYield: 0.061,
        asOfDate: "2026-03-31",
      },
      tags: ["banking", "blue-chip", "dividend-yielder", "earnings-review"],
      authorUserId,
      authorName: "Demo Super Admin",
      status: "published",
      publishedAt: new Date(),
      minTierRequired: "free",
      metaDescription: "Update earnings BBRI Q1 2026 — NIM stabil, kredit mikro tumbuh 14% YoY, naikkan TP Rp 5.400 (BUY).",
    },
    {
      slug: "antm-thematic-nikel-cycle-2026",
      title: "ANTM · Pemulihan Siklus Nikel & Hilirisasi — Target Re-rating",
      companyKode: "ANTM",
      sectorKode: "BASIC_MATERIALS",
      relatedTickers: ["ANTM", "INCO", "MDKA"],
      reportType: "thematic",
      rating: "buy",
      timeHorizon: "long_12m_plus",
      currentPriceAtPublish: "1800",
      targetPrice: "2400",
      upsideDownsidePct: "0.333",
      summary:
        "Aneka Tambang (ANTM) berada di sweet spot pemulihan siklus harga nikel global setelah 24 bulan tekanan dari oversupply Indonesia. Kombinasi (1) penyerapan kapasitas EV-grade nickel sulfate di kawasan industri Halmahera, (2) potensi rasionalisasi kapasitas RKEF tidak efisien, dan (3) eksposur ANTM ke emas sebagai natural hedge — kami pandang sebagai setup re-rating yang menarik untuk horizon 12+ bulan. Inisiasi rating BUY dengan TP Rp 2.400 (upside 33%).",
      keyHighlights: [
        "Nickel sulfate (EV grade) inventory global sedang ter-draw down — premium ke metal grade berpotensi balik ke +30%.",
        "ANTM punya 2 keunggulan vs peer: (a) cadangan ore nikel kualitas premium di Pomalaa, (b) kepemilikan tambang emas Pongkor yang memberi cashflow stabil.",
        "Bauksit downstream (smelter alumina) memasuki commissioning Q3 2026 — kontribusi EBITDA 2027 diperkirakan Rp 1.5–2 triliun.",
        "Re-rating skenario: P/E forward 2027 di 12x (vs sekarang 18x trailing) memberi TP Rp 2.400.",
      ],
      sections: [
        {
          key: "thesis",
          title: "Thesis: Kombinasi Siklus + Hilirisasi",
          order: 1,
          content:
            "Tesis utama kami terdiri dari 3 layer:\n\nLAYER 1 — SIKLUS HARGA. Harga nickel di LME sedang dalam fase basing setelah 24 bulan koreksi. Pemicu pembalikan: (a) inventory EV-grade nickel sulfate menipis di China, (b) Indonesia mempertimbangkan moratorium izin smelter RKEF baru untuk mengendalikan oversupply, (c) demand stainless steel China stabilizing.\n\nLAYER 2 — POSISI ANTM. ANTM punya kualitas ore di atas peer (high-grade saprolite vs limonite peers) + ekspor terbatas (mostly diolah dalam negeri) sehingga kurang ter-impact volatilitas ekspor. Margin smelter feronickel di Pomalaa relatif stabil ~25% gross.\n\nLAYER 3 — HILIRISASI ALUMINA. Smelter Grade Alumina (SGA) di Mempawah memasuki commissioning H2 2026. Kapasitas 1 juta ton/tahun. Konversi bauksit lokal → SGA captive untuk Inalum + ekspor — kontribusi profit signifikan dari FY2027.",
        },
        {
          key: "scenarios",
          title: "Skenario Earnings",
          order: 2,
          content:
            "BASE CASE (60% prob): nickel rebound moderate ke $18.5k/ton, EBITDA FY2027 Rp 8.5T, EPS Rp 200, TP Rp 2.400 (12x forward PE).\n\nBULL CASE (25%): nickel rally ke $22k+ + SGA full ramp, EBITDA FY2027 Rp 11T, TP Rp 3.000.\n\nBEAR CASE (15%): siklus extended, SGA delay, EBITDA stuck Rp 6T, TP Rp 1.500 (downside).",
        },
      ],
      valuationMethod: "Forward P/E Multiple (12x FY2027E EPS) + Sum-of-Parts validation",
      valuationDetail: {
        method: "pe_relative",
        description: "12x forward P/E justified by historical median 11x + 1x premium untuk hilirisasi value add.",
        computedTargetPrice: 2400,
      },
      catalysts: [
        "Pengumuman moratorium izin smelter RKEF baru oleh ESDM (potensi H2 2026).",
        "Commissioning SGA Mempawah Q3 2026 — confirmation timeline.",
        "Pembalikan tren harga nikel LME di atas $17k/ton sustained.",
        "Potensi kontrak supply jangka panjang ke EV battery maker (CATL, LG).",
      ],
      riskFactors: [
        "Nickel oversupply terus tekan harga di bawah $14k/ton — bear case kena.",
        "SGA Mempawah commissioning tertunda > 6 bulan dari plan.",
        "Risiko geopolitik dari ekspor bauksit/nikel — kebijakan trade Indonesia bisa berubah.",
        "Kompetisi dari proyek nikel Filipina yang sedang ramp-up.",
        "FX risk: 70% revenue dalam USD, sensitif ke fluktuasi Rupiah.",
      ],
      financialSnapshot: {
        revenue: 45_000_000_000_000,
        revenueGrowth: -0.08,
        netIncome: 3_200_000_000_000,
        netIncomeGrowth: -0.15,
        eps: 130,
        pe: 13.8,
        pbv: 1.1,
        roe: 0.082,
        debtToEquity: 0.45,
        dividendYield: 0.025,
        asOfDate: "2026-03-31",
      },
      tags: ["commodities", "nikel", "hilirisasi", "thematic", "long-horizon"],
      authorUserId,
      authorName: "Demo Super Admin",
      status: "published",
      publishedAt: new Date(),
      minTierRequired: "starter",
      metaDescription: "Thematic ANTM: pemulihan siklus nikel + hilirisasi alumina. BUY TP Rp 2.400 (upside 33%).",
    },
  ];

  for (const sample of samples) {
    await db
      .insert(researchReports)
      .values(sample)
      .onConflictDoNothing({ target: researchReports.slug });
  }

  logger.info(`Seeded ${samples.length} sample research reports`);
}

/**
 * Standalone runner — kalau dipanggil langsung via tsx, cari superadmin & seed.
 */
async function main() {
  const result = await db.execute(sql`SELECT id FROM users WHERE role = 'superadmin' LIMIT 1`);
  const rows = result as unknown as Array<{ id: string }>;
  if (rows.length === 0) {
    logger.error("No superadmin user found — run `npm run db:seed-demo` first");
    process.exit(1);
  }
  await seedSampleResearch(rows[0]!.id);
  process.exit(0);
}

if (process.argv[1]?.includes("research-sample")) {
  main().catch((err) => {
    logger.error({ err }, "Sample research seed failed");
    process.exit(1);
  });
}
