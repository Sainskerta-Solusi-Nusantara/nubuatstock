/**
 * Deck slide model — versi "presentasi" (16:9) dari pitchdeck untuk dibagikan
 * ke publik/investor. Sumber datanya SATU dengan dashboard superadmin
 * (`./data`), jadi angka tidak pernah divergen. Yang berbeda hanya bentuk:
 * di sini dikurasi jadi ~15 slide naratif, bukan tabel padat.
 *
 * Hasil buildDeckSlides() berupa data serializable murni — aman dikirim sebagai
 * prop ke client component <SlideDeck>.
 */
import {
  PROBLEM_STATEMENTS,
  MARKET_SIZE,
  WHY_NOW,
  UNIQUE_VALUE_PROPS,
  COMPETITORS,
  TRACTION_SO_FAR,
  UNIT_ECONOMICS,
  FUNDING_ROUNDS,
  ROADMAP_MILESTONES,
  buildProjections,
  formatIdrCompact,
  formatNumberCompact,
} from "./data";

export type Slide =
  | { kind: "cover"; eyebrow: string; title: string; subtitle: string; footnote: string }
  | { kind: "stat-grid"; eyebrow: string; title: string; stats: { value: string; label: string; detail?: string }[]; note?: string }
  | { kind: "bullets"; eyebrow: string; title: string; intro?: string; bullets: { head: string; body: string }[] }
  | { kind: "table"; eyebrow: string; title: string; columns: string[]; rows: string[][]; note?: string }
  | { kind: "closing"; eyebrow: string; title: string; subtitle: string; points: string[]; cta: string };

const TODAY = "2026";

export function buildDeckSlides(): Slide[] {
  const projections = buildProjections();
  const breakEven = projections.find((p) => p.netMonthlyIdr >= 0);

  return [
    {
      kind: "cover",
      eyebrow: `Investor Deck · ${TODAY}`,
      title: "Nubuat",
      subtitle: "Terminal analisis saham Indonesia berbasis AI — supaya retail trader berhenti nyangkut.",
      footnote: "Technical · Fundamental · Bandarmology · Brokermology · Macro — dalam satu skor, dijelaskan AI berbahasa Indonesia.",
    },

    {
      kind: "stat-grid",
      eyebrow: "Problem",
      title: "Retail trader Indonesia nyangkut",
      stats: PROBLEM_STATEMENTS.map((p) => ({ value: p.stat, label: p.label, detail: p.detail })),
      note: "Tidak ada produk lokal yang menggabungkan analytics multi-lens + AI explainable + research aggregator + UX kelas Bloomberg di harga retail.",
    },

    {
      kind: "bullets",
      eyebrow: "Solusi",
      title: "Satu kerangka data, lima lensa",
      intro: "Nubuat menyatukan lima sudut pandang analisis jadi satu skor 0–100 per emiten, plus Daily Picks dengan entry/SL/TP konkret dan AI Buddy yang menjelaskan tiap sinyal.",
      bullets: UNIQUE_VALUE_PROPS.slice(0, 5).map((u) => ({ head: u.title, body: u.desc })),
    },

    {
      kind: "stat-grid",
      eyebrow: "Market",
      title: "TAM / SAM / SOM",
      stats: [MARKET_SIZE.tam, MARKET_SIZE.sam, MARKET_SIZE.som].map((m) => ({
        value: m.annualSpend,
        label: m.label.split("—")[0]?.trim() ?? m.label,
        detail: `${m.population} — ${m.description}`,
      })),
      note: "Capture 300K user dari 4M SAM (≈7.5%) = Rp 360 Mrd ARR — cukup untuk exit Series B valuasi Rp 1–2 T.",
    },

    {
      kind: "bullets",
      eyebrow: "Why Now",
      title: "Tailwinds 2026",
      bullets: WHY_NOW.map((w) => ({ head: w.title, body: w.body })),
    },

    {
      kind: "table",
      eyebrow: "Lanskap Kompetitif",
      title: "Kenapa kami menang",
      columns: ["Produk", "Kelemahan mereka", "Keunggulan Nubuat"],
      rows: COMPETITORS.map((c) => [c.name, c.weaknesses.join(" · "), c.nubuatAdvantage]),
    },

    {
      kind: "stat-grid",
      eyebrow: "Traction",
      title: "Produk nyata, bukan slideware",
      stats: TRACTION_SO_FAR.slice(0, 8).map((t) => ({ value: t.value, label: t.metric, detail: t.note })),
    },

    {
      kind: "stat-grid",
      eyebrow: "Unit Economics",
      title: "Ekonomi per paying user",
      stats: [
        { value: formatIdrCompact(UNIT_ECONOMICS.arpu.monthly), label: "Blended ARPU/bln", detail: `ARR ${formatIdrCompact(UNIT_ECONOMICS.arpu.annual)}` },
        { value: `${(UNIT_ECONOMICS.grossMargin * 100).toFixed(1)}%`, label: "Gross margin", detail: `COGS ${formatIdrCompact(UNIT_ECONOMICS.cogs.monthly)}/user/bln` },
        { value: `${UNIT_ECONOMICS.ltvCacRatio.toFixed(1)}×`, label: "LTV / CAC", detail: `Payback ${UNIT_ECONOMICS.paybackPeriodMonths.toFixed(1)} bln` },
        { value: formatIdrCompact(UNIT_ECONOMICS.ltvBlended), label: "LTV (blended)", detail: `Churn ${(UNIT_ECONOMICS.churn.blended * 100).toFixed(1)}%/bln` },
      ],
      note: "LTV/CAC 14.5× jauh di atas benchmark SaaS sehat (3×). Payback <3 bulan = kuartil teratas industri.",
    },

    {
      kind: "table",
      eyebrow: "Proyeksi",
      title: "Jalan menuju profitabilitas",
      columns: ["Scale", "Paying", "MRR", "OPEX/bln", "Net/bln"],
      rows: projections.map((p) => [
        p.scaleLabel,
        formatNumberCompact(p.paidUsers),
        formatIdrCompact(p.mrrIdr),
        formatIdrCompact(p.opexIdr),
        `${p.netMonthlyIdr >= 0 ? "+" : ""}${formatIdrCompact(p.netMonthlyIdr)}`,
      ]),
      note: breakEven
        ? `Break-even di skala ${breakEven.scaleLabel} user. Konversi 5% paid + tier mix sehat (95% Free / 4% Starter / 0.8% Pro / 0.2% Elite).`
        : "Konversi 5% paid + tier mix industri SaaS B2C.",
    },

    {
      kind: "bullets",
      eyebrow: "Roadmap",
      title: "M0 → M24",
      bullets: ROADMAP_MILESTONES.map((m) => ({
        head: `${m.phase} — ${m.status}`,
        body: `Target ${m.target}. ${m.deliverables.slice(0, 4).join(" · ")}.`,
      })),
    },

    {
      kind: "table",
      eyebrow: "Funding",
      title: "Strategi pendanaan",
      columns: ["Round", "Target raise", "≈ IDR", "Runway", "Timing"],
      rows: FUNDING_ROUNDS.map((r) => [r.round, r.amountUsd, r.amountIdr, r.runway, r.timing]),
      note: FUNDING_ROUNDS[0]?.purpose ? `Use of funds (pre-seed): ${FUNDING_ROUNDS[0].purpose}` : undefined,
    },

    {
      kind: "closing",
      eyebrow: "The Ask",
      title: "Mari bangun terminal saham retail Indonesia",
      subtitle: "MVP sudah jalan. 980 emiten ter-cover. AI Buddy end-to-end. Yang kami butuhkan: modal untuk PMF + go-to-market.",
      points: [
        "14M+ investor Indonesia, tumbuh 7–9× sejak 2019",
        "LTV/CAC 14.5× — ekonomi unit sudah sehat di atas kertas",
        "Stack pure TypeScript: hire mudah, scale terbukti",
      ],
      cta: "nubuat.sainskerta.net",
    },
  ];
}
