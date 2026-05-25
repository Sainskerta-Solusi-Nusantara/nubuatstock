import { Sparkles, TrendingUp, AlertTriangle, Zap, Target, DollarSign, Users, Rocket, Globe, BarChart3, Calendar, Lightbulb, UserCircle, Megaphone, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PrintButton } from "@/components/superadmin/PrintButton";
import { FeaturePdfButton } from "@/components/superadmin/FeaturePdfButton";
import {
  ARCHITECTURE_LAYERS,
  USER_SCALES,
  OPEX_AT_SCALE,
  FUNDING_ROUNDS,
  UNIQUE_VALUE_PROPS,
  KEY_FEATURES,
  RISKS,
  ROADMAP_MILESTONES,
  PROBLEM_STATEMENTS,
  MARKET_SIZE,
  COMPETITORS,
  CUSTOMER_PERSONAS,
  GO_TO_MARKET,
  UNIT_ECONOMICS,
  TRACTION_SO_FAR,
  TEAM_PLAN,
  WHY_NOW,
  buildProjections,
  computeMRR,
  computeOpex,
  formatIdrCompact,
  formatIdrFull,
  formatNumberCompact,
} from "@/lib/pitchdeck/data";

export const dynamic = "force-dynamic";

export default function PitchdeckPage() {
  const projections = buildProjections();
  const breakEvenScale = projections.find((p) => p.netMonthlyIdr >= 0);

  return (
    <div className="space-y-8 print:space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pitchdeck</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Arsitektur, unique value, OPEX, dan proyeksi user growth dari 1K hingga 1M — untuk
            internal alignment & investor meeting. Update terakhir: {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}.
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          <FeaturePdfButton />
          <PrintButton />
        </div>
      </div>

      {/* ───────── 0. Problem ───────── */}
      <section>
        <SectionTitle icon={AlertTriangle} number={1} title="Problem: Retail Trader Indonesia Nyangkut" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PROBLEM_STATEMENTS.map((p) => (
            <Card key={p.label} className="border-bear/30">
              <CardContent className="p-5">
                <div className="font-mono text-3xl font-bold text-bear">{p.stat}</div>
                <div className="mt-1 text-sm font-semibold">{p.label}</div>
                <div className="mt-2 text-xs text-muted-foreground leading-relaxed">{p.detail}</div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="mt-4 rounded-md border border-bear/40 bg-bear-soft/30 p-4 text-sm">
          <strong className="text-bear">Inti masalah:</strong> Trader retail tidak punya kerangka data multi-lensa yang konsisten untuk setiap entry/exit. Hasilnya: FOMO, stop loss tebakan, cut loss telat, hold tanpa thesis. Produk lokal mengatasi sebagian — tidak ada satu pun yang menggabungkan analytics multi-lens + AI explainable + research aggregator + Bloomberg-class UX di harga retail.
        </div>
      </section>

      {/* ───────── 2. Executive Summary (geser nomor) ───────── */}
      <section>
        <SectionTitle icon={Sparkles} number={2} title="Executive Summary" />
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-card">
          <CardContent className="p-6 space-y-4">
            <p className="text-base leading-relaxed">
              <strong>Nubuat</strong> adalah terminal analisis saham Indonesia berbasis AI untuk retail trader
              yang ingin <strong>berhenti nyangkut</strong> dan mulai trading dengan kerangka data
              multi-lensa yang konsisten. Kombinasi 5 lensa analisis (Technical, Fundamental,
              Bandarmology, Brokermology, Macro), Daily Picks dengan SR/SL/TP konkret, dan AI
              Copilot DeepSeek yang menjelaskan setiap sinyal dalam Bahasa Indonesia.
            </p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <KpiBox label="Total Addressable" value="14M+" sub="investor saham Indonesia (KSEI 2026)" />
              <KpiBox label="Universe Coverage" value="980+" sub="emiten BEI lengkap" />
              <KpiBox label="Break-Even Target" value={breakEvenScale ? `${breakEvenScale.scaleLabel}` : "—"} sub="user untuk profitable" />
              <KpiBox label="Revenue @ 1M user" value="Rp 8.1 Mrd/bln" sub="ARR Rp 98 Mrd" />
            </div>
            <p className="text-sm text-muted-foreground">
              Stack Pure TypeScript fullstack (Next.js 15 + Drizzle + Neon Postgres + Upstash Redis +
              DeepSeek AI). Tidak ada Go/Rust/Python — 1 bahasa, hire mudah, scale dengan adopsi vendor
              di milestone yang tepat. Target market: 25–45 tahun, AUM Rp 50jt–5Mrd, frustrasi dengan
              produk lokal yang dangkal analitiknya.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* ───────── 3. Market Size ───────── */}
      <section>
        <SectionTitle icon={Globe} number={3} title="Market Size (TAM / SAM / SOM)" />
        <div className="grid gap-4 lg:grid-cols-3">
          {[MARKET_SIZE.tam, MARKET_SIZE.sam, MARKET_SIZE.som].map((m, i) => (
            <Card key={m.label} className={i === 0 ? "border-primary/40" : i === 1 ? "border-primary/60" : "border-primary"}>
              <CardContent className="p-5 space-y-2">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">{m.label.split("—")[1]?.trim() ?? m.label}</div>
                <div className="text-lg font-bold">{m.description}</div>
                <div className="grid gap-1.5 text-sm">
                  <div className="flex justify-between border-b border-border pb-1">
                    <span className="text-muted-foreground">Population</span>
                    <span className="font-mono font-semibold">{m.population}</span>
                  </div>
                  <div className="flex justify-between border-b border-border pb-1">
                    <span className="text-muted-foreground">Annual Spend</span>
                    <span className="font-mono font-semibold text-primary">{m.annualSpend}</span>
                  </div>
                </div>
                <div className="text-[11px] text-muted-foreground italic pt-1">{m.calculation}</div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="mt-4 rounded-md border border-primary/30 bg-primary/5 p-4 text-sm">
          <strong className="text-primary">Capture target 3 tahun:</strong> 300K user dari 4M SAM (7.5%) = Rp 360 Mrd ARR. Cukup besar untuk Series B exit valuasi Rp 1–2 T (4-5× ARR multiple SaaS Indonesia).
        </div>
      </section>

      {/* ───────── 4. Why Now ───────── */}
      <section>
        <SectionTitle icon={Calendar} number={4} title="Why Now — Tailwinds 2026" />
        <div className="grid gap-3 md:grid-cols-2">
          {WHY_NOW.map((w, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-1">
                <div className="flex items-start gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-bull-soft text-bull">
                    <Lightbulb className="h-3.5 w-3.5" />
                  </span>
                  <div className="font-semibold text-sm">{w.title}</div>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground pl-8">{w.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ───────── 5. Customer Personas ───────── */}
      <section>
        <SectionTitle icon={UserCircle} number={5} title="Customer Personas" />
        <div className="space-y-3">
          {CUSTOMER_PERSONAS.map((p) => (
            <Card key={p.name}>
              <CardContent className="grid gap-3 p-4 lg:grid-cols-[1.2fr_2fr_1fr]">
                <div>
                  <div className="font-semibold">{p.name}</div>
                  <div className="mt-1 text-[11px] text-muted-foreground">{p.demographics}</div>
                  <Badge variant="outline" className="mt-2 text-[10px]">{p.targetTier}</Badge>
                </div>
                <div className="text-xs space-y-1.5">
                  <div><strong className="text-muted-foreground">Behavior:</strong> {p.behavior}</div>
                  <div><strong className="text-muted-foreground">Needs:</strong> {p.needs}</div>
                </div>
                <div className="text-xs rounded-md border border-bull/30 bg-bull-soft/30 p-2">
                  <strong className="text-bull">Match:</strong> {p.valueAlign}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ───────── 6. Competitive Landscape ───────── */}
      <section>
        <SectionTitle icon={BarChart3} number={6} title="Competitive Landscape" />
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="border-b border-border bg-secondary/50 text-left uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Produk</th>
                    <th className="px-3 py-2">Kategori</th>
                    <th className="px-3 py-2">Kekuatan</th>
                    <th className="px-3 py-2">Kelemahan</th>
                    <th className="px-3 py-2">Harga</th>
                    <th className="px-3 py-2 bg-primary/10">Nubuat Advantage</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPETITORS.map((c) => (
                    <tr key={c.name} className="border-b border-border last:border-0 align-top">
                      <td className="px-3 py-2 font-semibold">{c.name}</td>
                      <td className="px-3 py-2 text-muted-foreground">{c.category}</td>
                      <td className="px-3 py-2 text-bull">{c.strengths.join(" · ")}</td>
                      <td className="px-3 py-2 text-bear">{c.weaknesses.join(" · ")}</td>
                      <td className="px-3 py-2 font-mono">{c.pricing}</td>
                      <td className="px-3 py-2 bg-primary/5 font-medium">{c.nubuatAdvantage}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ───────── 7. Traction So Far ───────── */}
      <section>
        <SectionTitle icon={Activity} number={7} title="Traction & Build Status" />
        <p className="mb-4 text-sm text-muted-foreground">
          MVP foundation lengkap. Real product, bukan slideware. Demo-ready untuk investor di /dashboard, /research, /backtest, /copilot.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {TRACTION_SO_FAR.map((t) => (
            <Card key={t.metric}>
              <CardContent className="p-4">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{t.metric}</div>
                <div className="mt-1 font-bold text-primary">{t.value}</div>
                <div className="mt-1 text-[11px] text-muted-foreground leading-relaxed">{t.note}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ───────── 8. Arsitektur ───────── */}
      <section>
        <SectionTitle icon={Zap} number={8} title="Arsitektur Teknis" />
        <p className="mb-4 text-sm text-muted-foreground">
          Pure TypeScript fullstack — 1 bahasa, 1 deploy target, ekosistem matang. Capacity ceiling 80K DAU sebelum perlu split ke microservices.
        </p>
        <div className="grid gap-3">
          {ARCHITECTURE_LAYERS.map((l) => (
            <Card key={l.layer}>
              <CardContent className="grid grid-cols-1 gap-3 p-4 lg:grid-cols-[140px_1fr_1fr] lg:items-start">
                <div className="font-semibold text-primary">{l.layer}</div>
                <div className="flex flex-wrap gap-1.5">
                  {l.components.map((c) => (
                    <span key={c} className="rounded-md bg-secondary px-2 py-1 text-xs">{c}</span>
                  ))}
                </div>
                <div className="text-xs text-muted-foreground">{l.rationale}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ───────── 9. Unique Value ───────── */}
      <section>
        <SectionTitle icon={Target} number={9} title="Unique Value Propositions" />
        <div className="grid gap-4 md:grid-cols-2">
          {UNIQUE_VALUE_PROPS.map((u, i) => (
            <Card key={i} className="border-primary/20">
              <CardContent className="p-5 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary font-mono text-xs font-bold text-primary-foreground">
                    {i + 1}
                  </span>
                  <h3 className="font-semibold">{u.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground">{u.desc}</p>
                <div className="rounded-md border border-bull/30 bg-bull-soft/50 p-2 text-xs">
                  <strong className="text-bull">Moat:</strong> {u.moat}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ───────── 10. Fitur Unggulan ───────── */}
      <section>
        <SectionTitle icon={Sparkles} number={10} title="Fitur Unggulan" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {KEY_FEATURES.map((f) => (
            <Card key={f.category}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm uppercase tracking-wider text-primary">{f.category}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {f.items.map((item) => (
                  <div key={item} className="flex items-start gap-2 text-sm">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-bull" />
                    <span>{item}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ───────── 11. Go-to-Market ───────── */}
      <section>
        <SectionTitle icon={Megaphone} number={11} title="Go-to-Market Strategy" />
        <div className="space-y-3">
          {GO_TO_MARKET.map((g, i) => (
            <Card key={i}>
              <CardContent className="grid gap-3 p-4 lg:grid-cols-[180px_2fr_1fr_1fr]">
                <div>
                  <Badge variant="outline">{g.phase}</Badge>
                </div>
                <div className="flex flex-wrap gap-1">
                  {g.channels.map((c) => (
                    <span key={c} className="rounded bg-secondary px-2 py-0.5 text-[11px]">{c}</span>
                  ))}
                </div>
                <div className="text-xs">
                  <div className="text-muted-foreground">CAC target</div>
                  <div className="font-mono font-semibold">{g.cac}</div>
                </div>
                <div className="text-xs">
                  <div className="text-muted-foreground">Outcome</div>
                  <div className="font-semibold">{g.target}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ───────── 12. Unit Economics ───────── */}
      <section>
        <SectionTitle icon={DollarSign} number={12} title="Unit Economics — Per Paying User" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiBox label="Blended ARPU/bln" value={formatIdrCompact(UNIT_ECONOMICS.arpu.monthly)} sub={`ARR ${formatIdrCompact(UNIT_ECONOMICS.arpu.annual)}`} />
          <KpiBox label="COGS/user/bln" value={formatIdrCompact(UNIT_ECONOMICS.cogs.monthly)} sub={`Gross margin ${(UNIT_ECONOMICS.grossMargin * 100).toFixed(1)}%`} />
          <KpiBox label="LTV (blended)" value={formatIdrCompact(UNIT_ECONOMICS.ltvBlended)} sub={`Churn ${(UNIT_ECONOMICS.churn.blended * 100).toFixed(1)}%/bln`} />
          <KpiBox label="LTV / CAC" value={`${UNIT_ECONOMICS.ltvCacRatio.toFixed(1)}x`} sub={`Payback ${UNIT_ECONOMICS.paybackPeriodMonths.toFixed(1)} bln`} />
        </div>
        <Card className="mt-4">
          <CardContent className="p-5 text-sm space-y-2">
            <p><strong className="text-primary">Blended ARPU:</strong> {UNIT_ECONOMICS.arpu.description}</p>
            <p><strong className="text-primary">COGS breakdown:</strong> {UNIT_ECONOMICS.cogs.description}</p>
            <p><strong className="text-primary">CAC target by phase:</strong> Early beta {formatIdrCompact(UNIT_ECONOMICS.cacTargetByPhase.earlyBeta)} → Public launch {formatIdrCompact(UNIT_ECONOMICS.cacTargetByPhase.publicLaunch)} → Scale {formatIdrCompact(UNIT_ECONOMICS.cacTargetByPhase.scale)} → Mainstream {formatIdrCompact(UNIT_ECONOMICS.cacTargetByPhase.mainstream)}</p>
            <p><strong className="text-primary">Churn assumption:</strong> Starter {(UNIT_ECONOMICS.churn.monthlyStarter * 100).toFixed(1)}%, Pro {(UNIT_ECONOMICS.churn.monthlyPro * 100).toFixed(1)}%, Elite {(UNIT_ECONOMICS.churn.monthlyElite * 100).toFixed(1)}% (Elite punya stickiness lebih tinggi karena workflow lock-in)</p>
            <div className="mt-3 rounded-md border border-bull/30 bg-bull-soft/30 p-3">
              <strong className="text-bull">Verdict:</strong> LTV/CAC 14.5× &gt; benchmark SaaS sehat (3×). Payback &lt;3 bulan adalah quartile teratas industri. Asumsi defendable kalau retention & ARPU sesuai target.
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ───────── 13. User Growth Projection ───────── */}
      <section>
        <SectionTitle icon={Users} number={13} title="User Growth Projection — 1K hingga 1M" />
        <p className="mb-4 text-sm text-muted-foreground">
          Asumsi tier mix industri SaaS B2C: <strong>95% Free, 4% Starter, 0.8% Pro, 0.2% Elite</strong> + Institutional dari 50K+.
          Conversion paid total ±5% (achievable berdasarkan benchmark fintech retail Indonesia: 3–8%).
        </p>
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="border-b border-border bg-secondary/50 text-left uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Scale</th>
                    <th className="px-3 py-2 text-right">Total User</th>
                    <th className="px-3 py-2 text-right">Free</th>
                    <th className="px-3 py-2 text-right">Starter</th>
                    <th className="px-3 py-2 text-right">Pro</th>
                    <th className="px-3 py-2 text-right">Elite</th>
                    <th className="px-3 py-2 text-right">Inst.</th>
                    <th className="px-3 py-2 text-right">Total Paying</th>
                  </tr>
                </thead>
                <tbody>
                  {USER_SCALES.map((s) => {
                    const paying = s.starterUsers + s.proUsers + s.eliteUsers + s.institutionalUsers;
                    return (
                      <tr key={s.label} className="border-b border-border last:border-0">
                        <td className="px-3 py-2 font-bold text-primary">{s.label}</td>
                        <td className="px-3 py-2 text-right font-mono">{formatNumberCompact(s.totalUsers)}</td>
                        <td className="px-3 py-2 text-right font-mono text-muted-foreground">{formatNumberCompact(s.freeUsers)}</td>
                        <td className="px-3 py-2 text-right font-mono">{formatNumberCompact(s.starterUsers)}</td>
                        <td className="px-3 py-2 text-right font-mono">{formatNumberCompact(s.proUsers)}</td>
                        <td className="px-3 py-2 text-right font-mono">{formatNumberCompact(s.eliteUsers)}</td>
                        <td className="px-3 py-2 text-right font-mono">{s.institutionalUsers}</td>
                        <td className="px-3 py-2 text-right font-mono font-semibold">{formatNumberCompact(paying)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ───────── 14. OPEX Breakdown ───────── */}
      <section>
        <SectionTitle icon={DollarSign} number={14} title="OPEX (Operating Expenses) per Bulan" />
        <p className="mb-4 text-sm text-muted-foreground">
          Breakdown biaya operasional bulanan per scale. <strong>Asumsi salary Jakarta 2026</strong>: senior fullstack Rp 35–45jt, mid Rp 20–30jt, designer Rp 25–40jt, quant Rp 35–50jt. Multiplier 1.25–1.30× untuk BPJS + THR + bonus.
        </p>
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="border-b border-border bg-secondary/50 text-left uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 sticky left-0 bg-secondary/50">Komponen</th>
                    {USER_SCALES.map((s) => <th key={s.label} className="px-3 py-2 text-right">{s.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  <OpexRow label="Database (Neon)" values={USER_SCALES.map((s) => OPEX_AT_SCALE[s.label]!.databaseUsd * 16500)} />
                  <OpexRow label="Redis (Upstash)" values={USER_SCALES.map((s) => OPEX_AT_SCALE[s.label]!.redisUsd * 16500)} />
                  <OpexRow label="Hosting" values={USER_SCALES.map((s) => OPEX_AT_SCALE[s.label]!.hostingUsd * 16500)} />
                  <OpexRow label="CDN/Edge" values={USER_SCALES.map((s) => OPEX_AT_SCALE[s.label]!.cdnUsd * 16500)} />
                  <OpexRow label="AI Inference (DeepSeek)" values={USER_SCALES.map((s) => OPEX_AT_SCALE[s.label]!.aiInferenceUsd * 16500)} />
                  <OpexRow label="Vendor Data (IDX/Invezgo)" values={USER_SCALES.map((s) => OPEX_AT_SCALE[s.label]!.vendorDataUsd * 16500)} />
                  <OpexRow label="Email + Observability + Misc" values={USER_SCALES.map((s) => {
                    const o = OPEX_AT_SCALE[s.label]!;
                    return (o.emailUsd + o.observabilityUsd + o.miscInfraUsd) * 16500;
                  })} />
                  <SubtotalRow label="Subtotal Infrastruktur" values={USER_SCALES.map((s) => {
                    const o = OPEX_AT_SCALE[s.label]!;
                    return (o.databaseUsd + o.redisUsd + o.hostingUsd + o.cdnUsd + o.aiInferenceUsd + o.vendorDataUsd + o.emailUsd + o.observabilityUsd + o.miscInfraUsd) * 16500;
                  })} />
                  <OpexRow label="Engineering" values={USER_SCALES.map((s) => OPEX_AT_SCALE[s.label]!.engineeringIdr * OPEX_AT_SCALE[s.label]!.benefitMultiplier)} />
                  <OpexRow label="Product & Design" values={USER_SCALES.map((s) => OPEX_AT_SCALE[s.label]!.productDesignIdr * OPEX_AT_SCALE[s.label]!.benefitMultiplier)} />
                  <OpexRow label="Data Analyst & Quant" values={USER_SCALES.map((s) => OPEX_AT_SCALE[s.label]!.dataAnalystIdr * OPEX_AT_SCALE[s.label]!.benefitMultiplier)} />
                  <OpexRow label="Customer Success" values={USER_SCALES.map((s) => OPEX_AT_SCALE[s.label]!.customerSuccessIdr * OPEX_AT_SCALE[s.label]!.benefitMultiplier)} />
                  <OpexRow label="Marketing Team" values={USER_SCALES.map((s) => OPEX_AT_SCALE[s.label]!.marketingTeamIdr * OPEX_AT_SCALE[s.label]!.benefitMultiplier)} />
                  <OpexRow label="Ops / Finance" values={USER_SCALES.map((s) => OPEX_AT_SCALE[s.label]!.opsFinanceIdr * OPEX_AT_SCALE[s.label]!.benefitMultiplier)} />
                  <OpexRow label="Compliance & Legal" values={USER_SCALES.map((s) => OPEX_AT_SCALE[s.label]!.complianceIdr * OPEX_AT_SCALE[s.label]!.benefitMultiplier)} />
                  <OpexRow label="Leadership" values={USER_SCALES.map((s) => OPEX_AT_SCALE[s.label]!.leadershipIdr * OPEX_AT_SCALE[s.label]!.benefitMultiplier)} />
                  <SubtotalRow label="Subtotal People (+benefit)" values={USER_SCALES.map((s) => {
                    const o = OPEX_AT_SCALE[s.label]!;
                    return (o.engineeringIdr + o.productDesignIdr + o.dataAnalystIdr + o.customerSuccessIdr + o.marketingTeamIdr + o.opsFinanceIdr + o.complianceIdr + o.leadershipIdr) * o.benefitMultiplier;
                  })} />
                  <OpexRow label="Marketing Spend (paid)" values={USER_SCALES.map((s) => OPEX_AT_SCALE[s.label]!.marketingSpendIdr)} />
                  <OpexRow label="Office + Admin + Legal" values={USER_SCALES.map((s) => OPEX_AT_SCALE[s.label]!.officeAdminIdr + OPEX_AT_SCALE[s.label]!.legalAccountingIdr)} />
                  <tr className="border-t-2 border-primary bg-primary/5 font-bold">
                    <td className="px-3 py-2 sticky left-0 bg-primary/10">TOTAL OPEX/BULAN</td>
                    {USER_SCALES.map((s) => (
                      <td key={s.label} className="px-3 py-2 text-right font-mono">{formatIdrCompact(computeOpex(OPEX_AT_SCALE[s.label]!))}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ───────── 15. Revenue & Net Margin ───────── */}
      <section>
        <SectionTitle icon={TrendingUp} number={15} title="Revenue & Path to Profitability" />
        <p className="mb-4 text-sm text-muted-foreground">
          Tier pricing: Free Rp 0, Starter Rp 99k, Pro Rp 299k, Elite Rp 899k, Institutional Rp 25jt/bulan. Konversi 5% paid (industri SaaS B2C).
        </p>
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="border-b border-border bg-secondary/50 text-left uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Scale</th>
                    <th className="px-3 py-2 text-right">Paying User</th>
                    <th className="px-3 py-2 text-right">MRR</th>
                    <th className="px-3 py-2 text-right">ARR</th>
                    <th className="px-3 py-2 text-right">OPEX/bln</th>
                    <th className="px-3 py-2 text-right">Net/bln</th>
                    <th className="px-3 py-2 text-right">Net Margin</th>
                    <th className="px-3 py-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {projections.map((p) => {
                    const isProfitable = p.netMonthlyIdr >= 0;
                    return (
                      <tr key={p.scaleLabel} className={`border-b border-border last:border-0 ${isProfitable ? "bg-bull-soft/30" : ""}`}>
                        <td className="px-3 py-2 font-bold text-primary">{p.scaleLabel}</td>
                        <td className="px-3 py-2 text-right font-mono">{formatNumberCompact(p.paidUsers)}</td>
                        <td className="px-3 py-2 text-right font-mono font-semibold">{formatIdrCompact(p.mrrIdr)}</td>
                        <td className="px-3 py-2 text-right font-mono">{formatIdrCompact(p.arrIdr)}</td>
                        <td className="px-3 py-2 text-right font-mono text-muted-foreground">{formatIdrCompact(p.opexIdr)}</td>
                        <td className={`px-3 py-2 text-right font-mono font-semibold ${isProfitable ? "text-bull" : "text-bear"}`}>
                          {isProfitable ? "+" : ""}{formatIdrCompact(p.netMonthlyIdr)}
                        </td>
                        <td className={`px-3 py-2 text-right font-mono ${isProfitable ? "text-bull" : "text-bear"}`}>
                          {p.netMarginPct >= 0 ? "+" : ""}{p.netMarginPct.toFixed(0)}%
                        </td>
                        <td className="px-3 py-2 text-right">
                          {isProfitable
                            ? <Badge className="bg-bull text-primary-foreground">Profit</Badge>
                            : <Badge variant="outline" className="border-bear text-bear">Burn</Badge>
                          }
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        <div className="mt-4 rounded-md border border-bull/30 bg-bull-soft/30 p-4 text-sm">
          <strong className="text-bull">Path to profitability:</strong> ~300-500K user dengan conversion 5% + tier mix sehat.
          Akselerasi via: (a) institutional tier (Rp 25jt+/bulan × 50-100 customer), (b) push Pro/Elite via Elite-only features
          (paper trading, strategy marketplace), (c) ARPU expansion via add-on subscription.
        </div>
      </section>

      {/* ───────── 16. Team Plan ───────── */}
      <section>
        <SectionTitle icon={Users} number={16} title="Team & Hiring Plan" />
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="border-b border-border bg-secondary/50 text-left uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Role</th>
                    <th className="px-3 py-2 text-right">HC</th>
                    <th className="px-3 py-2">Timing</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Expertise</th>
                    <th className="px-3 py-2 text-right">Salary Range</th>
                  </tr>
                </thead>
                <tbody>
                  {TEAM_PLAN.map((t) => (
                    <tr key={t.role} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 font-medium">{t.role}</td>
                      <td className="px-3 py-2 text-right font-mono">{t.headcount}</td>
                      <td className="px-3 py-2 font-mono text-muted-foreground">{t.timing}</td>
                      <td className="px-3 py-2 text-xs">{t.stage}</td>
                      <td className="px-3 py-2 text-[11px] text-muted-foreground">{t.expertise}</td>
                      <td className="px-3 py-2 text-right font-mono text-xs">{t.salaryRangeIdr}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        <p className="mt-3 text-xs text-muted-foreground italic">
          Total headcount target M12: ~10 orang. M24: ~20. M36 (di 100K user): ~25-30. Equity pool 15-20% reserved untuk early hires.
        </p>
      </section>

      {/* ───────── 17. Funding Needs ───────── */}
      <section>
        <SectionTitle icon={Rocket} number={17} title="Funding Strategy & Milestones" />
        <div className="grid gap-3 sm:grid-cols-2">
          {FUNDING_ROUNDS.map((r) => (
            <Card key={r.round} className="border-primary/20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{r.round}</CardTitle>
                  <Badge variant="outline">{r.timing}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between border-b border-border pb-1">
                  <span className="text-muted-foreground">Target raise</span>
                  <span className="font-mono font-semibold">{r.amountUsd}</span>
                </div>
                <div className="flex justify-between border-b border-border pb-1">
                  <span className="text-muted-foreground">≈ IDR</span>
                  <span className="font-mono font-semibold">{r.amountIdr}</span>
                </div>
                <div className="flex justify-between border-b border-border pb-1">
                  <span className="text-muted-foreground">Runway</span>
                  <span className="font-medium">{r.runway}</span>
                </div>
                <div className="pt-1 text-xs text-muted-foreground">
                  <strong className="text-foreground">Use of funds:</strong> {r.purpose}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ───────── 18. Roadmap ───────── */}
      <section>
        <SectionTitle icon={Rocket} number={18} title="Roadmap M0–M24" />
        <div className="space-y-3">
          {ROADMAP_MILESTONES.map((m) => (
            <Card key={m.phase}>
              <CardContent className="grid gap-3 p-4 lg:grid-cols-[180px_1fr_1fr]">
                <div>
                  <div className="font-semibold">{m.phase}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">Target: {m.target}</div>
                  <div className="mt-1 text-xs font-medium">{m.status}</div>
                </div>
                <div className="lg:col-span-2 flex flex-wrap gap-1.5">
                  {m.deliverables.map((d) => (
                    <span key={d} className="rounded-md bg-secondary px-2 py-1 text-xs">{d}</span>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ───────── 19. Risk Register ───────── */}
      <section>
        <SectionTitle icon={AlertTriangle} number={19} title="Risk Register" />
        <div className="space-y-2">
          {RISKS.map((r) => (
            <Card key={r.title}>
              <CardContent className="grid gap-3 p-4 lg:grid-cols-[80px_1fr_2fr] lg:items-start">
                <Badge variant={r.level === "HIGH" ? "destructive" : r.level === "MEDIUM" ? "default" : "outline"} className="w-fit">
                  {r.level}
                </Badge>
                <div className="font-semibold text-sm">{r.title}</div>
                <div className="text-xs text-muted-foreground">{r.mitigation}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Footer / Disclaimer */}
      <section className="rounded-md border border-border bg-card/40 p-4 text-xs leading-relaxed text-muted-foreground print:break-before-page">
        <p>
          <strong>Disclaimer Internal:</strong> Angka di dokumen ini adalah estimasi planning,
          BUKAN guarantee. Asumsi conversion rate, ARPU, dan biaya operasional bisa berbeda
          signifikan dengan eksekusi nyata. Salary range merefleksi market Jakarta 2026 — update
          tahunan diperlukan. Untuk investor materi: pakai sebagai baseline yang harus disesuaikan
          dengan due-diligence vendor pricing terbaru, agreement dengan partner data IDX, dan
          kondisi makro Indonesia saat fundraising berlangsung.
        </p>
        <p className="mt-2">
          Dokumen ini hanya untuk konsumsi <strong>internal & investor terverifikasi</strong>.
          Jangan distribusi ke publik tanpa persetujuan superadmin.
        </p>
      </section>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          .print\\:break-before-page { break-before: page; }
          [class*="bg-gradient"] { background: white !important; }
        }
      `}} />
    </div>
  );
}

/* ───────── Helper components ───────── */

function SectionTitle({
  icon: Icon, number, title,
}: {
  icon: React.ComponentType<{ className?: string }>;
  number: number;
  title: string;
}) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <div className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Section {number.toString().padStart(2, "0")}</div>
        <h2 className="text-xl font-bold tracking-tight">{title}</h2>
      </div>
    </div>
  );
}

function KpiBox({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-2xl font-bold">{value}</div>
      <div className="mt-0.5 text-[10px] text-muted-foreground">{sub}</div>
    </div>
  );
}

function OpexRow({ label, values }: { label: string; values: number[] }) {
  return (
    <tr className="border-b border-border last:border-0 hover:bg-secondary/30">
      <td className="px-3 py-1.5 sticky left-0 bg-background text-muted-foreground">{label}</td>
      {values.map((v, i) => (
        <td key={i} className="px-3 py-1.5 text-right font-mono">{v === 0 ? "—" : formatIdrCompact(v)}</td>
      ))}
    </tr>
  );
}

function SubtotalRow({ label, values }: { label: string; values: number[] }) {
  return (
    <tr className="border-y border-border bg-secondary/40 font-semibold">
      <td className="px-3 py-1.5 sticky left-0 bg-secondary/40">{label}</td>
      {values.map((v, i) => (
        <td key={i} className="px-3 py-1.5 text-right font-mono">{formatIdrCompact(v)}</td>
      ))}
    </tr>
  );
}
