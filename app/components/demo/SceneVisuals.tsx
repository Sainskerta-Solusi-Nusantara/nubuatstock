import {
  Activity,
  Award,
  Bot,
  Calculator,
  Calendar,
  ListChecks,
  Newspaper,
  Search,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";
import type { SceneVisual } from "@/lib/demo/scenes";

/**
 * Mockup visual untuk tiap scene — bukan video real,
 * tapi animated illustration yang ngasih feel produk.
 */
export function SceneVisualMock({ visual }: { visual: SceneVisual }) {
  switch (visual) {
    case "intro":
      return <IntroVisual />;
    case "dashboard":
      return <DashboardVisual />;
    case "daily_picks":
      return <DailyPicksVisual />;
    case "ticker_overview":
    case "verdict":
      return <VerdictVisual />;
    case "wyckoff":
      return <WyckoffVisual />;
    case "screener":
      return <ScreenerVisual />;
    case "ai_copilot":
      return <CopilotVisual />;
    case "paper_trading":
      return <PaperTradingVisual />;
    case "outro":
      return <OutroVisual />;
    default:
      return null;
  }
}

function IntroVisual() {
  return (
    <div className="flex h-full flex-col items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5 p-8">
      <div className="animate-pulse text-7xl">📈</div>
      <h2 className="mt-6 text-4xl font-bold tracking-tight">Nubuat AI</h2>
      <p className="mt-2 text-base text-muted-foreground">Teman untuk terus tumbuh</p>
      <div className="mt-6 grid grid-cols-2 gap-3 text-xs text-muted-foreground sm:grid-cols-4">
        <Pill icon={Bot} label="AI Buddy" />
        <Pill icon={Award} label="Verdict 0-10" />
        <Pill icon={Wallet} label="Paper Trade" />
        <Pill icon={Zap} label="Pattern AI" />
      </div>
    </div>
  );
}

function DashboardVisual() {
  return (
    <div className="flex h-full flex-col gap-3 bg-card p-5">
      <div className="rounded-md border border-primary/30 bg-primary/5 p-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
          ☕ Morning Brief · Hari ini
        </div>
        <h3 className="mt-2 text-lg font-bold">IHSG Menguat 0.5%, Sektor Keuangan Memimpin</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Pasar saham Indonesia bergerak positif dengan 7 sektor naik dan 4 turun. Sektor Keuangan
          memimpin reli, sentimen news 24j tilt bullish (32 vs 8 bearish).
        </p>
      </div>
      <div className="grid grid-cols-5 gap-1.5 text-[10px]">
        {["BBRI", "BMRI", "BBCA", "ASII", "GOTO"].map((k, i) => (
          <div key={k} className="animate-fade-in rounded-md border border-border bg-card p-2" style={{ animationDelay: `${i * 80}ms` }}>
            <div className="font-mono text-xs font-bold">{k}</div>
            <div className="mt-0.5 text-bull">↑+1.2%</div>
            <div className="mt-1 grid grid-cols-3 gap-0.5 text-[9px]">
              <span className="text-bull">↑4250</span>
              <span className="text-muted-foreground">4050</span>
              <span className="text-bear">↓3850</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DailyPicksVisual() {
  const picks = [
    { kode: "BBRI", entry: "4000-4100", sl: "3850", tp: "4400", conf: 87 },
    { kode: "GOTO", entry: "65-68", sl: "62", tp: "75", conf: 78 },
    { kode: "ANTM", entry: "1450-1480", sl: "1400", tp: "1620", conf: 72 },
  ];
  return (
    <div className="flex h-full flex-col gap-2 bg-card p-5">
      <h3 className="text-lg font-bold">📋 Daily Picks Hari Ini</h3>
      {picks.map((p, i) => (
        <div
          key={p.kode}
          className="animate-fade-in rounded-md border border-border bg-card p-3"
          style={{ animationDelay: `${i * 200}ms` }}
        >
          <div className="flex items-center justify-between">
            <span className="font-mono text-base font-bold">{p.kode}</span>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
              {p.conf}%
            </span>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-[10px]">
            <div className="rounded bg-primary/10 p-1.5">
              <div className="uppercase tracking-wider opacity-70">Entry</div>
              <div className="font-mono font-bold text-primary">{p.entry}</div>
            </div>
            <div className="rounded bg-bull-soft p-1.5">
              <div className="uppercase tracking-wider opacity-70">Target</div>
              <div className="font-mono font-bold text-bull">↑ {p.tp}</div>
            </div>
            <div className="rounded bg-bear-soft p-1.5">
              <div className="uppercase tracking-wider opacity-70">Stop</div>
              <div className="font-mono font-bold text-bear">↓ {p.sl}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function VerdictVisual() {
  const factors = [
    { name: "Technical Trend", score: 7.5, weight: 25 },
    { name: "Momentum", score: 6.8, weight: 15 },
    { name: "Value", score: 8.2, weight: 15 },
    { name: "Quality", score: 9.0, weight: 15 },
    { name: "Growth", score: 7.0, weight: 15 },
    { name: "News Sentiment", score: 6.5, weight: 15 },
  ];
  return (
    <div className="flex h-full flex-col gap-3 bg-card p-5">
      <div className="rounded-md bg-bull p-4 text-white">
        <div className="text-[10px] font-semibold uppercase tracking-wider opacity-80">
          Nubuat Verdict — BBRI
        </div>
        <div className="mt-1 flex items-baseline justify-between">
          <span className="text-3xl font-bold">STRONG BUY</span>
          <span className="font-mono text-5xl font-bold">7.5<span className="text-lg opacity-70">/10</span></span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {factors.map((f, i) => (
          <div
            key={f.name}
            className="animate-fade-in rounded-md border border-border bg-card p-2"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="flex items-center justify-between text-[10px]">
              <span className="font-semibold">{f.name}</span>
              <span className="font-mono font-bold">{f.score}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full ${f.score >= 7 ? "bg-bull" : f.score >= 5.5 ? "bg-yellow-500" : "bg-bear"}`}
                style={{ width: `${f.score * 10}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WyckoffVisual() {
  return (
    <div className="flex h-full flex-col gap-3 bg-card p-5">
      <div className="rounded-md bg-bull-soft p-3">
        <div className="flex items-center justify-between">
          <span className="font-bold text-bull">📈 Markup Phase</span>
          <span className="text-xs text-muted-foreground">Confidence 85%</span>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Trend uptrend kuat. SMA stack bullish, RSI 65 (healthy momentum), volume confirming.
        </p>
      </div>
      <div className="rounded-md border border-border p-3">
        <div className="flex items-center justify-between">
          <span className="font-bold">5-Wave Sequence</span>
          <span className="rounded bg-bull-soft px-1.5 py-0.5 text-[9px] font-bold text-bull">
            Impulse Up
          </span>
        </div>
        <div className="mt-2 grid grid-cols-5 gap-1.5">
          {["1", "2", "3", "4", "5"].map((label) => {
            const isImpulse = ["1", "3", "5"].includes(label);
            return (
              <div
                key={label}
                className={`rounded p-1.5 text-center text-[10px] ${isImpulse ? "bg-bull-soft text-bull" : "bg-orange-500/15 text-orange-700 dark:text-orange-300"}`}
              >
                W{label}
              </div>
            );
          })}
        </div>
      </div>
      <div className="rounded-md border border-border p-3">
        <div className="flex items-center justify-between">
          <span className="font-bold">🚩 Bullish Flag (Forming)</span>
          <span className="font-mono text-xs">Conf 78%</span>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-1 text-[10px]">
          <span className="rounded bg-primary/10 p-1 text-center text-primary">BO 4150</span>
          <span className="rounded bg-bull-soft p-1 text-center text-bull">TP 4450</span>
          <span className="rounded bg-bear-soft p-1 text-center text-bear">SL 4020</span>
        </div>
      </div>
    </div>
  );
}

function ScreenerVisual() {
  const presets = [
    { name: "🧘 Mode Swing Santai", desc: "Stoch 10,5,5 oversold + RSI 30-55" },
    { name: "⚡ Mode Day Trader", desc: "Volume spike + MACD positive" },
    { name: "🚀 Mode Breakout Hunter", desc: "BB squeeze + ADX > 20" },
    { name: "💰 Value Hunter", desc: "PE < 15, PBV < 2, ROE > 10%" },
  ];
  return (
    <div className="flex h-full flex-col gap-3 bg-card p-5">
      <h3 className="text-base font-bold">🔍 Stock Screener</h3>
      <div className="grid grid-cols-2 gap-2">
        {presets.map((p, i) => (
          <div
            key={p.name}
            className="animate-fade-in rounded-md border border-primary/30 bg-primary/5 p-2 transition hover:bg-primary/10"
            style={{ animationDelay: `${i * 120}ms` }}
          >
            <div className="text-xs font-bold">{p.name}</div>
            <div className="mt-0.5 text-[9px] text-muted-foreground">{p.desc}</div>
          </div>
        ))}
      </div>
      <div className="rounded-md border border-border p-2 text-[10px]">
        <div className="font-semibold">Result: 7 emiten match Mode Swing Santai</div>
        <div className="mt-1 flex flex-wrap gap-1">
          {["MCOL", "PNBS", "MUTU", "BIKE", "AMOR", "BOLA", "SOLA"].map((k, i) => (
            <span
              key={k}
              className="animate-fade-in inline-block rounded bg-primary/10 px-1.5 py-0.5 font-mono font-bold text-primary"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              {k}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function CopilotVisual() {
  return (
    <div className="flex h-full flex-col gap-3 bg-card p-5">
      <div className="ml-auto max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-xs text-primary-foreground">
        Bandingkan BBRI vs BMRI dari sisi PE dan ROE. Berikan rekomendasi.
      </div>
      <div className="flex items-start gap-2">
        <Sparkles className="mt-1 h-4 w-4 text-primary" />
        <div className="max-w-[80%] rounded-2xl rounded-bl-sm border border-border bg-card px-3 py-2 text-xs">
          <div className="font-semibold">### Comparison BBRI vs BMRI</div>
          <div className="mt-1 text-muted-foreground">
            • **BBRI**: PE 12.5, ROE 18.2%, DCF intrinsic 4,800 (margin +18%)<br />
            • **BMRI**: PE 10.8, ROE 14.5%, DCF intrinsic 6,200 (margin +12%)<br />
            <br />
            **Verdict**: BBRI ROE lebih tinggi tapi PE premium...
          </div>
        </div>
      </div>
      <div className="text-[10px] text-muted-foreground">
        Tool calls: get_company_info(BBRI), get_company_info(BMRI), compute_indicators(BBRI), compute_indicators(BMRI)
      </div>
    </div>
  );
}

function PaperTradingVisual() {
  return (
    <div className="flex h-full flex-col gap-3 bg-card p-5">
      <div className="rounded-md bg-card p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold">💼 Portfolio Utama</span>
          <span className="rounded-full bg-bull-soft px-3 py-1 text-sm font-bold text-bull">
            +12.5% Return
          </span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
          <div>
            <div className="text-[10px] uppercase text-muted-foreground">Total Value</div>
            <div className="font-mono text-lg font-bold">Rp 112,5jt</div>
          </div>
          <div>
            <div className="text-[10px] uppercase text-muted-foreground">Cash</div>
            <div className="font-mono text-lg font-bold">Rp 38,2jt</div>
          </div>
          <div>
            <div className="text-[10px] uppercase text-muted-foreground">Unrealized</div>
            <div className="font-mono text-lg font-bold text-bull">+Rp 8,4jt</div>
          </div>
        </div>
      </div>
      <div className="rounded-md border border-border p-3">
        <div className="text-[10px] font-semibold uppercase text-muted-foreground">
          Open Positions (3)
        </div>
        <div className="mt-2 space-y-1 text-xs">
          {[
            { k: "BBRI", qty: "5,000", pl: "+Rp 2,3jt", tone: "bull" },
            { k: "GOTO", qty: "100,000", pl: "+Rp 1,8jt", tone: "bull" },
            { k: "ANTM", qty: "3,000", pl: "-Rp 450rb", tone: "bear" },
          ].map((p) => (
            <div key={p.k} className="flex items-center justify-between">
              <span className="font-mono font-bold">{p.k}</span>
              <span className="text-muted-foreground">{p.qty} lembar</span>
              <span className={`font-mono ${p.tone === "bull" ? "text-bull" : "text-bear"}`}>{p.pl}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function OutroVisual() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 bg-gradient-to-br from-primary/20 to-primary/5 p-8">
      <div className="animate-pulse text-7xl">🎯</div>
      <h2 className="text-3xl font-bold tracking-tight">Trial 7 Hari Gratis</h2>
      <ul className="space-y-2 text-sm text-muted-foreground">
        <li>✅ Semua fitur tier Starter</li>
        <li>✅ Tanpa kartu kredit</li>
        <li>✅ Auto-downgrade ke Free setelah 7 hari</li>
        <li>✅ Cancel kapan saja, no hidden fees</li>
      </ul>
    </div>
  );
}

function Pill({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-1 text-[10px] font-semibold">
      <Icon className="h-3 w-3 text-primary" />
      {label}
    </div>
  );
}
