# Analisis Produk: Aplikasi Analisis Saham Indonesia (Subscription-based B2C)

> **Working title:** *Nubuat* — *Bloomberg-grade intelligence untuk retail trader Indonesia*
> **Tanggal dokumen:** 11 Mei 2026
> **Owner:** dobeon.com@gmail.com
> **Status:** v0.1 — Product & Tech Discovery

---

## 1. Executive Summary

Pasar saham Indonesia (BEI) per 11 Mei 2026 menampung **±945 emiten** dengan **±482 emiten saham aktif diperdagangkan mingguan** dan **15 perusahaan di pipeline IPO** (mayoritas sektor *Healthcare* — 26,7% dari pipeline). Total investor saham menembus **>14 juta SID**, tetapi *win rate* trader retail masih timpang: produk lokal (Stockbit Pro, RTI Business, HOTS Mirae, IPOT) berfokus pada *data display* dan komunitas, sementara produk khusus *smart money flow* seperti **AlphaFlow (flow.klinikpenyesalan.com)** baru menyasar niche analitis dengan harga **Rp 99.000/bulan**.

**Peluang produk Nubuat:** *single-canvas terminal* setara Bloomberg yang menggabungkan 5 lensa analisis (Technical, Fundamental, Bandarmology, Brokermology, Macro-Sentiment) + **Daily Picks Engine** (rekomendasi dengan SR/SL) + **Research Aggregator** (kompilasi laporan sekuritas + media + filing IDX) + **AI Copilot** berbasis LLM yang menjelaskan setiap *signal* dalam bahasa Indonesia.

**Monetisasi:** subscription tiering Rp 0 → Rp 99k → Rp 299k → Rp 899k/bulan dengan target **5.000 paying users (≈ Rp 9 Mrd ARR) di tahun ke-1**, **40.000 users (≈ Rp 72 Mrd ARR) di tahun ke-3**. Target market: trader aktif & swing trader berusia 25–45 tahun, AUM Rp 50jt–Rp 5 Mrd.

---

## 2. Riset Pasar & Landscape Kompetitor (per 11 Mei 2026)

### 2.1 State of IDX

| Metrik | Nilai (Mei 2026) | Catatan |
|---|---|---|
| Emiten saham terdaftar | ±945 | Termasuk perusahaan suspensi & UMA |
| Aktif diperdagangkan/minggu | 482 | BEI weekly trading report 4–8 Mei 2026 |
| Pipeline IPO | 15 perusahaan | Dominan Healthcare (26,7%) |
| Klasifikasi sektor (IDX-IC) | 12 sektor, 35 sub-sektor, 69 industri, 130 sub-industri | Energy, Basic Materials, Industrials, Consumer Staples, Consumer Discretionary, Healthcare, Financials, Properties & Real Estate, Technology, Infrastructure, Transportation & Logistics, Investment Products |
| Papan listing | Utama, Pengembangan, Akselerasi, Ekonomi Baru, Pemantauan Khusus | Papan Pemantauan Khusus untuk emiten berisiko |
| Index utama | IDX30, LQ45, IDX80, KOMPAS100, IDXBUMN20, IDXSMC-LIQ, JII70 | Rebalancing periodik Februari & Agustus |

**Implikasi produk:**
- Universe coverage harus mencakup **seluruh 945 ticker** termasuk papan pemantauan khusus (untuk *warning* & *risk flagging*) — bukan hanya LQ45 seperti banyak aplikasi pemula.
- Sektor IDX-IC 12 kategori harus jadi backbone *taxonomy* untuk *screener*, *heatmap*, *sector rotation*.

### 2.2 Benchmark Utama: AlphaFlow (flow.klinikpenyesalan.com)

**Apa yang mereka lakukan dengan baik:**
- **Smart Money Tracker (SMT)** — daily lead-lag broker, *concentration metrics*, *flow-price correlation R²* (memisahkan sinyal dari *noise*).
- **Wyckoff Phase Mapping** — deteksi fase *ranging / expanding / distributing / fading* sebagai *risk framing*.
- **Verdict Scoring Engine 0–10** — kompresi 7 sinyal berbobot, *regime-adaptive*, *factor-level transparency*.
- **Screener** — 880+ ticker dengan 12 *signal layer*, *preset* (continuation, broker-led rotation).
- **Positioning:** "*A better trading workspace, not a louder dashboard*" — single-canvas workflow.
- **Pricing:** trial gratis penuh; berbayar mulai **Rp 99.000/bulan** (monthly/6-bulan/tahunan).

**Gap yang bisa Nubuat manfaatkan:**
| Area | AlphaFlow | Gap → Peluang Nubuat |
|---|---|---|
| Fundamental analysis | Minimal | **Modul fundamental lengkap** (DCF, DDM, peer compare, earnings surprise) |
| Riset & laporan sekuritas | Tidak ada | **Research Aggregator** dari 15+ sekuritas + media + IDX filing |
| Daily picks dengan SL/TP | Tidak ada (hanya verdict) | **Daily Picks Engine** dengan entry/SR/SL/TP konkrit |
| AI Copilot (LLM) | Hanya "AI insights" terbatas | **Conversational AI** multi-modal (chart, fundamental, news) |
| Bloomberg-like Terminal | Tidak | **Command palette** ala Bloomberg, multi-monitor layout, hotkeys |
| Mobile-first | Web-first | **Native iOS/Android** dengan parity |
| Backtesting | Walk-forward internal saja | **User-facing backtest** + paper trading |

### 2.3 Kompetitor Indonesia (Direct & Indirect)

| Produk | Tipe | Kekuatan | Kelemahan | Harga |
|---|---|---|---|---|
| **Stockbit (PRO)** | Broker + community + analitik | Komunitas terbesar, Fundachart, Earning Recap, ratusan indikator | Bukan independent (broker-tied), UX padat | Free w/ buka rekening saham |
| **RTI Business** | Data terminal | Data terlengkap (chart, financial, news), foreign flow real-time | UX dated, tidak ada AI/rekomendasi | Free (ads) / Premium |
| **HOTS (Mirae Asset)** | Trading platform | Multichart, foreign transaction details, eksekusi cepat | Broker-tied, UX Windows-style | Bundled w/ Mirae account |
| **IPOT (Indo Premier)** | Trading platform | Robot Trading auto execution, screener | Broker-tied, riset terbatas | Bundled |
| **Ajaib / Bibit** | Mass-market broker | UX clean mobile-first | Analitik dangkal, target pemula | Free |
| **Pintar Saham / Investabook** | Edukasi + komunitas | Konten edukasi kuat | Bukan terminal analisis | Subs Rp 50–200k |
| **TradingView** | Charting global | Charting terbaik, *replay*, *Pine Script* | Data IDX delayed, mahal untuk real-time, no Indo-specific | USD 14.95–59.95/bulan |
| **Bloomberg Terminal** | Institusional | All-in-one global, Bloomberg Intelligence | USD 24k+/tahun, tidak Indonesia-centric | USD ~2.000/bulan |
| **AlphaFlow** | Smart money flow niche | Bandarmology + Wyckoff modern | Belum punya fundamental & rekomendasi konkrit | Rp 99k/bulan |

**Positioning Nubuat:** *"Bloomberg-grade analytics, Indonesia-native data, retail-friendly price."*

---

## 3. Product Vision & Differentiation

### 3.1 North Star
> *Meningkatkan win rate trader retail Indonesia dari ±35% ke ≥55% melalui kompresi data multi-lensa + AI guidance + disiplin risk management.*

### 3.2 5 Pilar Diferensiasi

1. **Multi-Lens Convergence** — satu *verdict* per ticker yang menggabungkan Technical + Fundamental + Bandarmology + Brokermology + Macro-Sentiment dengan *factor transparency*.
2. **Daily Picks dengan SL/TP yang Bisa Diuji** — bukan "rekomendasi BUY/SELL kosong", tapi entry zone, support resistance terstruktur (volume profile + supply/demand zone + fibonacci confluence), stop loss berbasis ATR & swing low, target profit dengan reward/risk ≥ 1.5.
3. **Indonesia-First Research Hub** — agregasi otomatis laporan dari **BRI Danareksa, Mandiri Sekuritas, Mirae Asset, Sucor, Verdhana, Maybank, Trimegah, Sinarmas, RHB, Samuel Sekuritas**, news (Kontan, Bisnis.com, IDX Channel, Bareksa, Stockbit Snips, CNBC Indonesia), dan filing resmi IDX (laporan keuangan, RUPS, aksi korporasi, keterbukaan informasi).
4. **AI Copilot Bilingual (ID/EN)** — LLM (Claude Sonnet 4.6 / Opus 4.7) yang bisa menjawab "kenapa BBRI turun hari ini?", "compare ANTM vs MDKA dari sisi PE forward", "screen saham coal dengan ROE >15%", dan menjelaskan setiap sinyal Bandarmology dengan konteks.
5. **Bloomberg-Style Terminal Workspace** — *command palette* (Cmd+K), keyboard-driven (`BBRI <GO>`, `EQS <GO>`, `BMAP <GO>`), *multi-pane* drag-resize, *workspace save/share*, *hotkeys* untuk power user.

---

## 4. Modul Analisis Inti

### 4.1 Technical Analysis
- **Chart engine:** TradingView **Lightweight Charts** (Apache 2.0, 45 KB, canvas, 60 FPS dengan ribuan bar) sebagai primary; opsional **Advanced Charts** (TV Charting Library) untuk fitur pro (drawing tools, Pine-like custom indicators).
- **Indikator built-in:** 150+ termasuk **MA family** (SMA/EMA/WMA/HMA), Bollinger, RSI, Stoch, MACD, ATR, ADX, Ichimoku, Supertrend, VWAP, Volume Profile, Anchored VWAP, Pivot Points (Classic/Fibonacci/Camarilla), Renko, Heikin-Ashi.
- **Pattern recognition (ML):** auto-detect Double Top/Bottom, Head & Shoulders, Triangle, Wedge, Cup & Handle, Flag/Pennant dengan *confidence score*.
- **Custom indicator language:** subset Pine-like (atau Lua) untuk power user.
- **Multi-timeframe:** 1m / 5m / 15m / 30m / 1h / 4h / 1D / 1W / 1M dengan *MTF dashboard* per ticker.
- **Drawing tools:** trendline, channel, fibo retracement/extension, fibo time zone, harmonic patterns (Gartley, Bat, Butterfly), Elliott Wave count assist.

### 4.1.A Elliott Wave Analysis (Wave Counting Engine) — *Planned Improvement*

**Vision:** Setiap emiten di Nubuat menampilkan *current wave count* dengan visualisasi chart + narasi analisis — tanpa user harus draw manual. Powered by algorithm + AI narrative.

**Why this matters:**
- Elliott Wave = framework klasik untuk memetakan psikologi pasar (5-wave impulse + 3-wave correction). Banyak trader teknikal Indonesia mengikutinya tapi struggle counting manually.
- Mayoritas platform lokal (Stockbit, RTI, HOTS) **TIDAK** menyediakan wave count otomatis. AlphaFlow juga tidak.
- Differensiasi unik: kombinasi *algorithmic pivot detection* + *AI narrative* = wave count yang konsisten dan reproducible.

**Komponen yang harus dibangun:**

1. **Pivot Detection Engine** (`lib/elliott/pivots.ts`)
   - ZigZag-based pivot detection dengan adjustable `% threshold` (default 3% untuk daily, 1% untuk intraday).
   - Output: array `{ date, price, type: "high"|"low", strength }` ordered chronological.
   - Filter noise: minimum bar separation, ATR-relative threshold.

2. **Wave Labeling Algorithm** (`lib/elliott/labeler.ts`)
   - Rules-based labeling (Elliott's 3 hard rules):
     - Wave 2 tidak boleh retrace > 100% Wave 1
     - Wave 3 tidak boleh paling pendek di antara 1, 3, 5
     - Wave 4 tidak boleh overlap Wave 1 (kecuali diagonal)
   - Guidelines (soft rules) untuk confidence scoring:
     - Wave 3 biasanya terpanjang (often 1.618× Wave 1)
     - Wave 2 retracement umum 50-61.8%
     - Wave 4 retracement umum 38.2%
     - Alternation: Wave 2 sharp → Wave 4 sideways atau vice versa
   - Output: `WaveSequence` = array `{ label: "1"|"2"|"3"|"4"|"5"|"A"|"B"|"C", startPivot, endPivot, confidence }`
   - Fallback: kalau pattern tidak match impulse, coba corrective (ABC, WXY, triangle).

3. **Wave State Snapshot Schema** (`db/schema/elliott.ts`)
   ```sql
   CREATE TABLE elliott_wave_snapshots (
     id ulid PRIMARY KEY,
     company_kode TEXT NOT NULL,
     timeframe TEXT NOT NULL,           -- '1D' | '1W' | '1M'
     current_wave TEXT NOT NULL,        -- '3 of 5 (Impulse Up)', 'A of ABC (Corrective)'
     wave_degree TEXT,                  -- 'Primary' | 'Intermediate' | 'Minor' | 'Minute'
     sequence JSONB NOT NULL,           -- Array WaveSequence
     pivots JSONB NOT NULL,             -- Array detected pivots
     fibonacci_levels JSONB,            -- Projected targets (1.618, 2.618, 0.382, 0.618)
     confidence NUMERIC NOT NULL,       -- 0-1
     narrative TEXT,                    -- AI-generated 2-paragraph analysis (DeepSeek)
     chart_image_url TEXT,              -- Pre-rendered chart PNG di S3/Vercel Blob
     analyzed_at TIMESTAMPTZ NOT NULL,
     -- Index untuk fast lookup
     UNIQUE (company_kode, timeframe, analyzed_at)
   );
   ```

4. **AI Narrative Generator** (`lib/elliott/narrative.ts`)
   - Input: wave sequence + current count + price context
   - Pakai DeepSeek (`deepseek-chat`) dengan prompt template:
     > "Berdasarkan wave count {kode} timeframe {tf}: saat ini berada di Wave {current} dari sequence impulse/corrective. Jelaskan dalam 2 paragraf bahasa Indonesia: (a) implikasi posisi saat ini terhadap trend, (b) skenario base case + bear case dengan target Fibonacci tertentu."
   - Cache hasil di DB; re-compute jika ada pivot baru.

5. **Chart Rendering Pipeline** (`lib/elliott/chart-render.ts`)
   - Server-side render PNG via `node-canvas` atau `puppeteer` (headless Chrome):
     - Background candlestick chart 250 bars
     - Wave labels (1, 2, 3, 4, 5 atau A, B, C) di pivot point
     - Connecting lines (impulse = solid, corrective = dashed)
     - Fibonacci retracement levels (0.382, 0.500, 0.618, 0.786) sebagai horizontal lines
     - Projected target zones (rectangle dengan fill alpha 20%)
   - Output: PNG 1200×600 di-upload ke Vercel Blob, URL disimpan di `chart_image_url`
   - Re-render on schedule (daily EoD) untuk semua emiten aktif.

6. **Worker Job** (`worker/jobs/analyze-elliott.ts`)
   - Cron: 1 jam setelah EoD ingest (default `0 17 * * 1-5`)
   - Iterate ~980 emiten:
     - Run pivot detection
     - Run wave labeler (fall back gracefully kalau gagal)
     - Generate AI narrative (batch 20 emiten per DeepSeek call untuk efisiensi)
     - Render chart PNG
     - Upsert ke `elliott_wave_snapshots`
   - Expected runtime: ~15 menit per timeframe (1D/1W/1M = ~45 menit total)

7. **UI Integration**
   - **Ticker page Technical tab:** "Elliott Wave" card di bawah Wyckoff card
     - Pre-rendered chart image (lazy-loaded)
     - Current wave label besar: "**Wave 3 of 5** (Impulse Up)"
     - Confidence bar
     - AI narrative collapsed/expanded
     - Fibonacci target zones table (next likely target with probability)
     - Multi-timeframe quick switch: 1D / 1W / 1M
   - **Compare page:** Wave alignment indicator — "BBCA Wave 3, BMRI Wave 4" untuk sector-wide setup detection.
   - **Screener filter:** "Currently in Wave X" dropdown (mis. cari semua emiten Wave 2 retracement = buy zone).
   - **AI Copilot tool:** `get_elliott_wave_for_ticker` — return current wave + scenario.

8. **Educational Layer**
   - Hover tooltip pada wave label: "Wave 3 = impulsive uptrend setelah Wave 2 correction. Typically terkuat, often extends 1.618× Wave 1."
   - Link ke artikel akademi (planned): "Belajar Elliott Wave dalam 10 menit"

**Limitations / Honest Caveats:**
- Wave counting **inheren subjektif** — ada multiple valid counts. Algorithm pakai "most probable" interpretation.
- Bekerja paling baik di trending market; sideways/choppy = low confidence.
- Bukan crystal ball — minimum 30% kesalahan label di edge cases. UI harus transparent tentang ini.
- Computational cost untuk wave detection on-demand bisa mahal — prefer pre-compute daily lalu serve cached snapshot.

**Phasing roadmap:**
- **P0 (foundation):** Pivot detection + simple impulse labeling (3 hard rules), single timeframe 1D.
- **P1 (depth):** Multi-timeframe + corrective patterns (ABC), Fibonacci targets.
- **P2 (AI):** Narrative generation + chart rendering pipeline.
- **P3 (advanced):** Wave degree hierarchy, alternate counts, real-time intraday updates.

**Effort estimate:** 2-3 sprints (4-6 minggu) untuk P0-P2. P3 adalah ongoing refinement.

### 4.2 Fundamental Analysis
- **Financial statements** 10 tahun (Income, Balance Sheet, Cash Flow) — quarterly & annual — dengan **common-size** dan **YoY/QoQ delta**.
- **Ratio engine:** Profitability (ROE, ROA, ROIC, GPM, OPM, NPM), Leverage (DER, DAR, ICR), Liquidity (Current, Quick, Cash), Efficiency (Asset Turnover, Inventory Days, AR Days), Valuation (PER, PBV, PSR, EV/EBITDA, EV/Sales, PEG).
- **Fundachart-style visualizer** — bandingkan **financial item** & **financial metric** antar emiten + overlay harga.
- **Valuation models:**
  - **DCF** (FCFF & FCFE) dengan WACC adjustable
  - **DDM** (Gordon Growth & 2-stage)
  - **Relative Valuation** vs peer & sector median
  - **Reverse DCF** (apa yang implied dari harga sekarang)
  - **Graham Number**, **Lynch Fair Value**
- **Earning surprise tracker** — recap quarterly EPS, beat/miss vs consensus.
- **Dividend tracker** — historical yield, payout ratio, cum date, ex date, *projected next dividend* (Bayesian).
- **Corporate action calendar** — stock split, rights issue, M&A, RUPS, tender offer.
- **Insider & related party** — laporan kepemilikan ≥5% (KSEI), transaksi *insider*, *related party transactions*.

### 4.3 Bandarmology
*Bandarmology = membaca jejak "bandar" (big-money) di pasar — bukan teori konspirasi, tapi statistik aliran dana.*

- **Bandar Detector** — broker mana yang akumulasi/distribusi *net* (daily & rolling 5/10/20 hari) per ticker.
- **Foreign Flow / NBSA** — *Net Buy/Sell Asing* dengan resolusi **1D, 1H, 15m, 5m** (untuk scalper).
- **Volume Spike** — z-score volume hari ini vs rolling 20-day average; tag *unusual volume*.
- **Accumulation/Distribution Line (ADL)** — klasik Marc Chaikin.
- **OBV, CMF, MFI** — money-flow indikator klasik.
- **Bid-Offer Imbalance** — *order book pressure* dari Level-2 (kalau tersedia via data vendor).
- **Net Trading Value by Investor Type** — Foreign vs Domestic, Institutional vs Retail (data KSEI/IDX).
- **Smart Money vs Dumb Money divergence** — proxy: aksi top-5 broker institusi (CC=CGS, RG=Mirae, BK=Mandiri, dll) vs broker retail (YP=Mirae Sekuritas, PD=Indo Premier, dll).
- **Bandar Phase Tagger** — auto-label: *Accumulation / Markup / Distribution / Markdown* (Wyckoff-style).

### 4.4 Brokermology
*Brokermology = analisis perilaku broker spesifik (Top 5 Buyer/Seller) dan korelasinya dengan price action.*

- **Broker Summary** per ticker per hari — top 10 buyer & seller dengan *net*, *avg price*, *value*.
- **Broker Concentration Index** — Herfindahl-Hirschman pada top buyer/seller (deteksi *concentrated accumulation*).
- **Broker Lead-Lag Network** — graf broker→ticker untuk identifikasi *broker yang sering "duluan" sebelum rally*.
- **Broker Performance Track Record** — historical: kalau broker X net-buy di ticker Y, return T+5 / T+20 berapa?
- **Broker Cluster Analysis** — clustering broker berdasarkan *style* (HFT, prop, retail-flow, institutional).
- **Flow-Price R² Correlation** — *confidence score* apakah aliran broker tertentu memang men-drive harga (mencegah false signal).

### 4.5 Macro & Sentiment
- **Macro dashboard Indonesia** — BI Rate, inflasi (CPI/PPI), kurs USD/IDR, neraca perdagangan, cadangan devisa, GDP growth.
- **Global macro overlay** — Fed rate, US 10Y yield, DXY, S&P 500, Hang Seng, Nikkei, komoditas (CPO, batu bara, nikel, emas, brent).
- **Sentiment engine:**
  - **News sentiment** (Indonesia-tuned NLP: IndoBERT/IndoLEM + LLM)
  - **Social sentiment** (Stockbit stream, X/Twitter, Telegram channel publik) — *opt-in & ethical scraping*.
  - **Fear & Greed Index Indonesia** — proprietary composite (volatility, breadth, momentum, put-call ratio kalau ada, foreign flow).
- **Event calendar** — RUPS, earnings, dividen, BI RDG, Fed FOMC, US CPI, OPEC+ meeting.

### 4.6 Bloomberg Terminal-Like Capabilities
| Bloomberg Function | Nubuat Equivalent | Hotkey |
|---|---|---|
| `<TICKER> <GO>` profile | Ticker profile + verdict | `<TICKER> <Enter>` |
| `DES` description | `DES` | `dDES` |
| `GIP` intraday price | `GIP` | `Gg` |
| `EQS` equity screen | `EQS` | `es` |
| `RV` relative valuation | `RV` | `rv` |
| `BMAP` broker map | `BMAP` | `bm` |
| `FA` fundamental | `FA` | `fa` |
| `NSE` news search | `NSE` | `ns` |
| `PORT` portfolio | `PORT` | `po` |
| `WATCH` watchlist | `WL` | `wl` |
| `ALRT` alerts | `ALRT` | `al` |
| `CALC` calculator | `CALC` | `c` |

- **Command palette** (Cmd/Ctrl+K) — fuzzy search ticker, function, news, page.
- **Multi-monitor layout** — workspace bisa di-detach ke window terpisah (Tauri/Electron desktop).
- **Workspace save/share** — export JSON, share via URL singkat.

---

## 5. Fitur Unggulan (Killer Features)

### 5.1 Daily Picks Engine — *"Saham Hari Ini"*
Pipeline harian (jalan pre-market 07:30 WIB & intraday refresh):
1. **Universe filter** — likuiditas (avg value 20D > Rp 1 Mrd), bukan suspensi/UMA/Papan Pemantauan Khusus high-risk.
2. **Multi-factor scoring** (0–100) berbobot regime-adaptive:
   - Technical setup (30%) — breakout, pullback ke MA, oversold reversal, MA cross, divergence
   - Bandarmology (25%) — net foreign + broker concentration + volume spike
   - Fundamental quality (20%) — ROE, growth, valuation vs peer
   - Sentiment & news (10%) — fresh positive catalyst
   - Macro/sector tailwind (10%) — sector rotation strength
   - Risk penalty (5%) — high beta, illiquid, governance flag
3. **Setup classification** — *Continuation / Reversal / Breakout / Pullback / Range*.
4. **Entry zone** — supply/demand zone + volume node + fib confluence.
5. **Stop Loss** — `min(swing_low, entry - 1.5×ATR(14))` clipped ke level support.
6. **Take Profit** — TP1 = 1R, TP2 = 2R, TP3 = next resistance / measured move.
7. **Reward/Risk** dilaporkan; pick hanya dipublish kalau R/R ≥ 1.5.
8. **Time horizon** — tag: *Intraday / Swing 3–5d / Swing 1–3w / Position 1–3m*.
9. **Confidence score** — disclaimer eksplisit + historical hit rate per setup type.

**Output UI:** 5–10 pick/hari dengan card visual (chart preview + zone overlay + R/R) + reasoning narrative dari AI Copilot.

### 5.2 Research Aggregator
- **Sumber:**
  - **Sekuritas:** BRI Danareksa (brights.id), Mandiri Sekuritas, Mirae Asset Sekuritas, Sucor, Verdhana, Maybank, Trimegah, Sinarmas, RHB, Samuel, MNC Sekuritas, Phillip, Henan Putihrai
  - **Media:** Kontan, Bisnis Indonesia, IDX Channel, CNBC Indonesia, Bareksa, Stockbit Snips, Investor Trust, Kompas Ekonomi
  - **Filing resmi:** IDX e-Reporting, KSEI, OJK pengumuman
  - **Database:** Investasiku, Lembar Saham, Eddyelly, datasahambei
- **Pipeline:**
  1. **Crawl & ingest** — scheduled scraper (compliant w/ robots.txt + ToS; legal review wajib).
  2. **OCR & PDF parse** — laporan sekuritas mayoritas PDF; pakai pdfplumber + Tesseract + LLM untuk *table extraction*.
  3. **NLP extraction** — emiten ticker (NER), rating (BUY/HOLD/SELL), target price, thesis, key risks, period.
  4. **Deduplication & consensus** — agregat target price → median, mean, std dev, jumlah analyst.
  5. **Display per ticker:**
     - Consensus rating gauge (1=Strong Sell → 5=Strong Buy)
     - Target price chart (min/median/max) vs harga sekarang
     - List laporan original (judul, sekuritas, tanggal, rating, TP) → klik untuk full text
     - **AI Synthesis** — paragraf ringkas "Apa kata sekuritas?" (LLM)

### 5.3 AI Copilot (*"Nubuat AI"*)
- **Model:** Claude Sonnet 4.6 untuk daily Q&A (cost-efficient); Claude Opus 4.7 untuk *deep research mode*.
- **Capabilities:**
  - Q&A: "Kenapa BBRI naik hari ini?" → menggabungkan news, broker flow, sektor performance.
  - Comparison: "Bandingkan ANTM dan MDKA untuk swing trade 2 minggu."
  - Screener via natural language: "Cari saham banking dengan PE < 10 dan ROE > 15%."
  - Chart annotation: "Apa setup teknikal BBNI sekarang?" → highlight zone di chart.
  - Earnings deep dive: "Analisa LK Q1 2026 TLKM" → ringkas + flag anomali.
  - Macro: "Dampak Fed cut rate 25 bps ke IHSG?"
- **Architecture:** RAG (Retrieval-Augmented Generation) dari *knowledge base* (research reports + filing + news) + *tool use* (call internal API untuk live data) + *prompt caching* (Anthropic prompt cache untuk system prompt + universe metadata) untuk efisiensi biaya.
- **Guardrails:** explicit disclaimer "bukan ajakan jual/beli", confidence score, *citation* setiap klaim.

### 5.4 Backtesting & Paper Trading
- **Backtest engine** — vectorized (numpy/polars) untuk speed, support strategy builder no-code + Python/Pine-like script.
- **Walk-forward & out-of-sample** wajib di setiap *preset* untuk hindari overfit.
- **Paper trading** — virtual portfolio Rp 100 jt, eksekusi T+0 simulasi (slippage model 0.05% + biaya broker simulasi).
- **Strategy marketplace** (v2) — user share/sell strategi (revenue share 70/30).

### 5.5 Watchlist, Alerts, Portfolio
- **Watchlist** — folder hierarchical, sortable column, conditional formatting.
- **Alerts** — price, volume, technical event (MA cross, RSI overbought), fundamental release (LK published), news mention, broker accumulation threshold. Multi-channel: in-app, push, email, WhatsApp (via WA Business API), Telegram bot.
- **Portfolio tracking** — manual entry + (v2) connect broker via OAuth (kalau broker buka API).

### 5.6 Edukasi & Community (Soft Moat)
- **Akademi Nubuat** — kursus terstruktur (Technical, Fundamental, Bandarmology) tier-locked.
- **Daily Brief Newsletter** — pagi 06:30 WIB, push ke email + in-app.
- **Discord/Telegram premium** — moderasi ketat, no pump-dump, mentor session mingguan.
- **Hall of Fame** — leaderboard paper trading + virtual badge.

---

## 6. Coverage Universe BEI (per 11 Mei 2026)

### 6.1 Strategi Coverage Bertahap

| Phase | Ticker count | Catatan |
|---|---|---|
| MVP (M0) | **IDX80** (80 ticker) | Liquid, mudah di-cover, validasi engine |
| Beta (M3) | **IDX Composite top 300** | + LQ45, IDX30, IDXBUMN20, sektor leader |
| GA (M6) | **All listed (±945)** | Termasuk papan pengembangan/akselerasi/pemantauan khusus |
| Scale (M12) | **+ Obligasi pemerintah & korporasi, ETF, Reksadana, Waran terstruktur** | Multi-asset terminal |

### 6.2 Data Yang Wajib Tersedia per Emiten
- **Identitas:** kode, nama, sektor IDX-IC, sub-sektor, papan, tanggal IPO, market cap, free float
- **Pricing:** OHLCV intraday (1m, 5m, 15m, 1H, 1D, 1W, 1M) historical ≥10 tahun
- **Order book:** Level-1 (best bid/ask) real-time; Level-2 (depth) untuk tier Pro+
- **Broker summary:** harian top 10 buyer/seller per ticker (historical ≥5 tahun)
- **Foreign flow:** harian, NBSA intraday 5m/15m/1H
- **Financial statements:** 10 tahun quarterly + annual (audited & unaudited)
- **Corporate actions:** dividend, split, rights issue, M&A, RUPS schedule
- **Filing:** keterbukaan informasi IDX, laporan tahunan, sustainability report
- **Shareholders:** ≥5% holder per kuartal (KSEI), insider transaction
- **Research reports:** historical compilation per ticker
- **News:** ≥3 tahun history, real-time stream
- **Index membership:** IDX30, LQ45, IDX80, KOMPAS100, IDXBUMN20, JII, JII70, SRI-KEHATI, IDXG30, etc.

### 6.3 Indeks BEI Yang Wajib Di-track
IDX30, LQ45, IDX80, KOMPAS100, IDXBUMN20, IDXSMC-LIQ, IDXSMC-COMP, JII, JII70, IDX-MES BUMN 17, IDX Quality 30, IDX Value 30, IDX Growth 30, IDX High Dividend 20, IDX SRI-KEHATI, IDX ESG Leaders, IDXG30, Bisnis-27, Investor33, MNC36, PEFINDO i-Grade, SMinfra18, Infobank15.

---

## 7. Arsitektur Frontend

### 7.1 Stack Rekomendasi

| Layer | Pilihan Utama | Alternatif | Alasan |
|---|---|---|---|
| **Framework Web** | **Next.js 15** (App Router, RSC) | Remix, SvelteKit | Ekosistem, SSR/ISR, deployment Vercel/AWS mudah |
| **Bahasa** | **TypeScript 5.5+** | — | Type safety mutlak untuk finansial |
| **State management** | **TanStack Query** + **Zustand** | Redux Toolkit | Server-state separation, ringan |
| **UI primitives** | **Radix UI** + **shadcn/ui** | Mantine, Ant Design | Headless, accessible, customizable |
| **Styling** | **Tailwind CSS v4** + CSS variables | styled-components | Speed + theme switching |
| **Chart engine** | **TradingView Lightweight Charts** (free, 45KB, canvas) | TV Charting Library (advanced), Highcharts | Performa 60fps multi-chart |
| **Data grid** | **AG Grid** (community, pro untuk fitur enterprise) | TanStack Table | Virtualization 10k+ rows |
| **Real-time** | **WebSocket** (custom) + **TanStack Query** subscribe | SSE fallback | Bi-directional low-latency |
| **Forms** | **React Hook Form** + **Zod** | Formik | Performance + schema validation |
| **i18n** | **next-intl** | i18next | Indonesia/English bilingual |
| **Analytics** | **PostHog** (self-hosted) + **Sentry** | Mixpanel, Datadog RUM | Privacy-friendly, product analytics |
| **Desktop app** | **Tauri 2.0** | Electron | Lighter (~5MB vs ~150MB), Rust backend |
| **Mobile** | **React Native 0.75+** + **Expo** (managed) | Flutter | Code sharing dengan web, ekosistem JS |

### 7.2 Layout & UX Principle
- **3-pane workspace** default: left (navigation/watchlist), center (chart/dashboard), right (panel: news, broker flow, AI chat).
- **Command palette** (Cmd+K) untuk semua aksi.
- **Keyboard-first** — semua aksi punya hotkey (tampilkan via `?`).
- **Dark mode default** + light mode + AMOLED mode.
- **Density toggle** — *comfortable* (retail) vs *compact* (pro trader, Bloomberg-like).
- **Responsive** — desktop priority, tablet ok, mobile companion (alerts + portfolio + Daily Picks).

### 7.3 Performance Budget
- **TTFB** < 200ms (CDN edge)
- **LCP** < 1.5s
- **Chart render** < 100ms untuk 1000 candle
- **Bundle (initial)** < 200KB gzipped
- **Real-time update latency** end-to-end < 500ms

---

## 8. Arsitektur Backend

### 8.1 Service Topology (Microservices, tapi pragmatic — *modular monolith first*)

```
                 ┌─────────────────────────────────────────────┐
                 │       Web / Mobile / Desktop Client          │
                 └─────────────┬───────────────────────────────┘
                               │ HTTPS + WSS
                 ┌─────────────▼───────────────────────────────┐
                 │  API Gateway (Kong / Cloudflare / NGINX)     │
                 │  + Rate limit + Auth (JWT) + WAF             │
                 └─────────────┬───────────────────────────────┘
                               │
        ┌──────────────────────┼──────────────────────────────┐
        │                      │                              │
┌───────▼────────┐   ┌─────────▼────────┐         ┌──────────▼────────┐
│  Core API      │   │  Realtime Hub    │         │  AI Copilot       │
│  (Go / Rust)   │   │  (NATS / Redis   │         │  (Python +        │
│  - User        │   │   Streams)       │         │   FastAPI +       │
│  - Subs        │   │  - WS broadcast  │         │   Anthropic SDK)  │
│  - Watchlist   │   │  - Tick fanout   │         │  - RAG            │
│  - Alerts      │   │                  │         │  - Tool use       │
└───────┬────────┘   └─────────┬────────┘         └──────────┬────────┘
        │                      │                             │
┌───────▼────────┐   ┌─────────▼────────┐         ┌──────────▼────────┐
│ Analytics      │   │ Market Data      │         │ Research          │
│ Engine         │   │ Ingestor         │         │ Aggregator        │
│ (Python +      │   │ (Go / Rust)      │         │ (Python + Celery) │
│  Polars)       │   │ - IDX feed       │         │ - Scraper         │
│ - Daily Picks  │   │ - Vendor APIs    │         │ - PDF/OCR         │
│ - Backtest     │   │ - Normalizer     │         │ - NER + summarize │
│ - Bandarmology │   │ - Persister      │         │                   │
└───────┬────────┘   └─────────┬────────┘         └──────────┬────────┘
        │                      │                             │
        └──────────────────────┼─────────────────────────────┘
                               │
        ┌──────────────────────┼─────────────────────────────┐
        │                      │                             │
┌───────▼────────┐   ┌─────────▼────────┐         ┌──────────▼────────┐
│ PostgreSQL 16  │   │ QuestDB / CH     │         │ Vector DB         │
│ (OLTP)         │   │ (Time-series)    │         │ (pgvector /       │
│ - Users        │   │ - OHLCV          │         │  Qdrant)          │
│ - Billing      │   │ - Tick           │         │ - Embeddings      │
│ - Metadata     │   │ - Broker summary │         │   research/news   │
└────────────────┘   └──────────────────┘         └───────────────────┘

           Object Storage (S3 / Cloudflare R2): PDF, snapshots, exports
           Cache: Redis (session, hot quote, leaderboard)
           Queue: Redis Streams / NATS JetStream / Kafka
           Search: Meilisearch / Typesense (ticker, news full-text)
```

### 8.2 Stack per Service

| Service | Language | Framework | Rationale |
|---|---|---|---|
| **Core API** | **Go 1.23** | Fiber / Echo / Chi | Concurrency, low latency, mature |
| **Market Data Ingestor** | **Rust** (atau Go) | Tokio / async | Throughput, zero-copy parsing FIX/binary |
| **Realtime Hub** | **Go** | NATS JetStream or Redis Streams | Pub/sub fanout, ack semantics |
| **Analytics Engine** | **Python 3.12** | FastAPI + Polars + DuckDB | DS ecosystem, vectorized compute |
| **AI Copilot** | **Python** | FastAPI + Anthropic SDK + LangGraph | LLM orchestration, prompt caching |
| **Research Aggregator** | **Python** | Celery + Playwright + pdfplumber | Scraping & ML pipeline |
| **Billing** | **Node.js** (atau Go) | NestJS | Webhook handling Midtrans/Xendit |

### 8.3 Data Layer

| Store | Use case | Tech |
|---|---|---|
| **OLTP** | Users, subs, watchlist, alerts, billing, metadata | **PostgreSQL 16** + Citus untuk partition (kalau perlu) |
| **Time-series (OHLCV, tick, indicators)** | High write, ASOF JOIN, downsampling | **QuestDB** (primary — fastest untuk financial tick) atau **ClickHouse** (kalau analytics-heavy) |
| **Backtest aggregates** | Heavy aggregation | **ClickHouse** |
| **Cache** | Hot quote, session, leaderboard | **Redis 7** (cluster) |
| **Search** | Ticker lookup, news full-text | **Meilisearch** atau **Typesense** |
| **Vector / RAG** | Research embeddings, semantic search | **pgvector** (kalau scale moderate) atau **Qdrant** |
| **Object storage** | PDF laporan, snapshot, export user | **Cloudflare R2** (no egress fee) atau **S3** |
| **Queue / Stream** | Job, tick fanout, event bus | **NATS JetStream** atau **Redis Streams**; Kafka kalau scale tinggi |

**Pilihan time-series DB:**
- **QuestDB (rekomendasi utama)** — benchmark: 25ms untuk 5-min OHLCV bar dari raw tick (vs ClickHouse 547ms, Timescale 1021ms); ASOF JOIN native (krusial untuk financial). Ingestion 4M rows/sec.
- **ClickHouse** — kalau workload analytics-heavy & multi-tenant aggregation.
- **TimescaleDB** — kalau tim mau ekosistem PostgreSQL tunggal (trade off: lebih lambat).

### 8.4 Data Sources (Market Data)

| Tier | Vendor | Latency | Note |
|---|---|---|---|
| **Tier 1 (official)** | **IDX Direct Data Feed** (Real-time/Delayed/EoD/Historical) | <50ms | Lisensi langsung BEI, mahal tapi authoritative |
| **Tier 2 (vendor)** | **OHLC.dev** | Real-time + historical (stocks, bonds, derivatives, warrants) | Redis-cached, good DX |
| **Tier 2** | **iTick** | <50ms WebSocket | REST + WSS |
| **Tier 2** | **Invezgo** | Real-time + broker + foreign flow | Indonesia-native, broker data lengkap |
| **Tier 3** | **ICE** | Streaming L1/L2 | Enterprise |
| **Auxiliary** | KSEI (shareholder), OJK (filing), e-IPO | Daily | Scrape/API |

**Strategi:** mulai dengan **vendor (Invezgo + OHLC.dev)** untuk kecepatan time-to-market, migrate ke **IDX direct** di M9 saat user base & revenue justify lisensi.

### 8.5 Hosting / Cloud

| Pilihan | Pros | Cons |
|---|---|---|
| **AWS Jakarta region (ap-southeast-3)** | Latency rendah ke user Indonesia, ekosistem matang | Cost lebih tinggi |
| **GCP Jakarta** | BigQuery, Vertex AI integration | Service availability terbatas |
| **Self-managed di Biznet/CBN/DCI Indonesia** | Lokal, complient PDP | Ops overhead |
| **Hybrid:** Cloudflare edge + AWS Jakarta origin | CDN global + origin lokal | Optimal |

**Rekomendasi:** **AWS ap-southeast-3 (Jakarta)** + **Cloudflare** (CDN, WAF, R2). Compliance dengan UU PDP (Pelindungan Data Pribadi) wajib — data pribadi user diam di Indonesia.

### 8.6 Observability
- **Logs:** Loki + Grafana atau Datadog
- **Metrics:** Prometheus + Grafana
- **Traces:** OpenTelemetry → Tempo/Jaeger
- **Error tracking:** Sentry
- **APM:** Datadog APM atau New Relic
- **Synthetic monitoring:** Checkly (uptime + UX flow)

### 8.7 CI/CD
- **Repo:** Monorepo (Turborepo / Nx) untuk frontend + shared TS schema; backend repo terpisah per service
- **CI:** GitHub Actions (atau GitLab CI)
- **CD:** ArgoCD ke Kubernetes (EKS); atau Render/Fly.io untuk MVP speed
- **Infra as Code:** Terraform + Helm
- **Feature flag:** GrowthBook (open-source) atau LaunchDarkly

---

## 9. Data Pipeline & ML/AI

### 9.1 Daily Picks Engine Pipeline

```
Pre-market (07:30 WIB)
   │
   ├─→ Fetch latest EoD data (D-1 close)
   ├─→ Recompute indicators (TA, Bandarmology, Brokermology)
   ├─→ Score each ticker (multi-factor, regime-adaptive weights)
   ├─→ Apply universe filter (likuid, non-suspended)
   ├─→ Setup classification (continuation/reversal/breakout/...)
   ├─→ Define entry/SL/TP zones
   ├─→ R/R filter ≥ 1.5
   ├─→ Rank top 10
   ├─→ LLM narrative generation (Claude Sonnet 4.6)
   └─→ Publish + push notification

Intraday (every 15 min during 09:00–15:30 WIB)
   └─→ Refresh score for active picks, alert on SL breach / TP1 hit
```

### 9.2 ML Models
- **Regime classifier** — HMM atau gradient boosting untuk tag *bull/bear/range* per ticker dan IHSG.
- **Pattern recognition** — CNN/Transformer untuk chart pattern (training data: historical + manual labeling).
- **Earnings surprise predictor** — gradient boosting fitur: revisions, momentum, prior beats.
- **Anomaly detection** — Isolation Forest pada volume + flow untuk *unusual activity flag*.
- **News classifier** — IndoBERT fine-tuned untuk sentiment + relevance.
- **NER for research extraction** — fine-tuned mengenali ticker, rating, target price dari PDF sekuritas.

### 9.3 LLM Strategy
- **Provider:** Anthropic (Claude Sonnet 4.6 default; Opus 4.7 untuk deep mode)
- **Optimization:**
  - **Prompt caching** untuk system prompt + universe metadata (turunkan biaya 90% untuk repeated queries)
  - **Extended thinking** untuk task analitis kompleks
  - **Tool use** — LLM panggil internal API: `get_quote()`, `get_broker_summary()`, `screen_stocks()`, `get_fundamentals()`
- **Guardrails:**
  - System prompt eksplisit: bukan ajakan jual/beli, sumber wajib disitir
  - Output structured (Pydantic schema) → konversi UI card
  - **Rate limit per user** sesuai tier (Free 5/hari, Starter 50/hari, Pro 500/hari, Elite unlimited)
- **Cost target:** rata-rata $0.05 per active user/hari → $1.50/bulan; subscription Rp 99k (≈$6) ber-margin sehat.

### 9.4 Research Aggregation Pipeline

```
Scheduled crawler (per source)
   │
   ├─→ Fetch (Playwright/HTTP) — respect robots.txt + rate limit + ToS
   ├─→ Dedup (hash + URL + timestamp)
   ├─→ Parse:
   │     ├─→ HTML article → readability + Mercury parser
   │     └─→ PDF report → pdfplumber + Tesseract + LLM table extraction
   ├─→ NER: ticker mention, rating (BUY/HOLD/SELL), target price, period
   ├─→ Embed (text-embedding) → pgvector / Qdrant
   ├─→ Summarize (Claude Sonnet) — bahasa Indonesia 150 kata
   ├─→ Index in Postgres (relational) + Meilisearch (full-text)
   └─→ Push to user feed (kalau watchlist match)
```

**Legal note:** banyak laporan sekuritas berhak cipta & dikirim ke klien institusi. Strategi:
1. Mulai dengan **public domain** — yang dirilis sekuritas di website mereka (BRI Danareksa brights.id, MOST.co.id riset, dll) → aman.
2. Hindari laporan klien-only kecuali ada **partnership formal** atau **konten lisensi**.
3. Untuk *consensus aggregation*, fokus pada **rating & target price snippet** (faktual data) + link ke source — *fair use* lebih aman dari full reproduction.
4. **Legal review wajib** sebelum production.

---

## 10. Monetisasi (Subscription B2C)

### 10.1 Tiering

| Tier | Harga | Target | Fitur |
|---|---|---|---|
| **Free / Basic** | Rp 0 | Akuisisi | Quote real-time delayed 15m, watchlist 10 ticker, 1 chart/page, basic TA (20 indikator), Daily Brief, AI 5 query/hari |
| **Starter** | **Rp 99k/bulan** (Rp 990k/tahun) | Active retail | Quote real-time, watchlist unlimited, full TA (150 indikator), Bandarmology basic (broker summary 1D), Daily Picks 3/hari, AI 50 query/hari |
| **Pro** | **Rp 299k/bulan** (Rp 2.99jt/tahun) | Swing/active trader | + Brokermology full, Daily Picks 10/hari + intraday update, Research Aggregator, Multi-chart workspace, Alerts unlimited, Backtest (3 strategy), AI 500 query/hari, Mobile + Desktop app |
| **Elite** | **Rp 899k/bulan** (Rp 8.99jt/tahun) | Power trader/semi-pro | + L2 depth, intraday foreign flow 5m, Paper trading, Strategy marketplace, Priority Discord, AI unlimited + Opus mode, API access (read-only, rate-limited), Concierge onboarding |
| **Institutional / Team** | Custom (mulai Rp 25jt/bulan) | Sekuritas/asset mgmt | Multi-seat, white-label, SLA, dedicated support, custom data feed |

### 10.2 Payment Gateway
- **Primary: Midtrans** — recurring (subscription tokenization GoPay/Credit Card), VA semua bank, e-wallet (Gopay, OVO, Dana, ShopeePay).
- **Secondary: Xendit** — backup + BI-FAST sub-second settlement + multicurrency (untuk pembayaran luar negeri di masa depan).
- **Backup: Stripe** — credit card internasional (kalau mau ekspansi).
- **Catatan regulasi:** POJK 32/2025 untuk fintech payment compliance.

### 10.3 Pricing Psychology
- **Annual discount 17%** (2 bulan gratis) untuk dorong cashflow.
- **7-day free trial** Pro untuk semua user baru → konversi target 6–10%.
- **Referral** — kasih 1 bulan Pro untuk referrer + referee.
- **Student discount** 50% dengan verifikasi .ac.id.
- **Cohort lifetime deal** awal — early adopter Pro lifetime Rp 4.99jt (limited 500 seat) untuk modal awal & komunitas.

### 10.4 Proyeksi Revenue (Bottom-up)

| Bulan | Free | Starter | Pro | Elite | MRR (Rp) | ARR (Rp) |
|---|---|---|---|---|---|---|
| M6 | 5.000 | 200 | 80 | 10 | 51,7 jt | 620 jt |
| M12 | 25.000 | 1.500 | 600 | 80 | 396 jt | **4,75 Mrd** |
| M24 | 80.000 | 5.000 | 2.500 | 350 | **1,56 Mrd** | **18,8 Mrd** |
| M36 | 200.000 | 12.000 | 7.000 | 1.000 | **3,98 Mrd** | **47,8 Mrd** |

*Asumsi: churn bulanan 5% Starter, 3% Pro, 2% Elite. Free→Paid konversi 4%.*

---

## 11. Compliance & Regulasi

### 11.1 Lisensi & Izin (Indonesia)
- **Penasihat Investasi (OJK)** — diatur Keputusan Ketua Bapepam V.C.1 + SEOJK 7/SEOJK.04/2017.
  - **Wajib** kalau produk memberikan *personalized investment advice*.
  - **Workaround:** sajikan sebagai *analytics tool* + *educational content* + *general market commentary*. Daily Picks tetap bisa dirilis selama berupa *informasi/analisis*, bukan *advice personal*, dengan *disclaimer eksplisit*.
  - **Best practice:** ajukan izin Penasihat Investasi di M9–M12 untuk legitimasi & moat.
- **Perusahaan Efek** — tidak diperlukan (tidak melakukan order eksekusi).
- **Sistem Elektronik (PSE)** — daftar di Kominfo (sekarang Kemkomdigi) sebagai PSE Lingkup Privat.
- **UU PDP** (UU 27/2022) — wajib lapor DPO, data Indonesia tinggal di Indonesia (atau ada transfer agreement).

### 11.2 Disclaimer Wajib
> *"Seluruh informasi, analisis, dan rekomendasi yang disajikan dalam Nubuat adalah untuk tujuan edukasi dan informasi semata, bukan merupakan ajakan untuk membeli atau menjual efek tertentu. Keputusan investasi adalah tanggung jawab pribadi. Kinerja masa lalu bukan jaminan kinerja masa depan."*

### 11.3 Anti Pump-Dump Policy
- Tidak boleh ada rekomendasi *paid promotion* ticker tertentu.
- Daily Picks **transparent rule-based**, tidak manual override.
- Discord/Telegram moderasi ketat: ban *pom-pom*, signal grup tertutup.

### 11.4 Data Source Compliance
- **IDX/KSEI/OJK** — public domain atau lisensi data feed resmi.
- **Sekuritas reports** — hanya yang publish ke public website mereka; kalau perlu yang exclusive → partnership formal.
- **News scraping** — robots.txt + ToS compliance + atribusi.

---

## 12. Roadmap (24 Bulan)

### M0–M3: MVP (Discovery → Beta Private)
- Tim: 2 BE, 2 FE, 1 designer, 1 PM/Founder, 1 data engineer
- Universe: IDX80
- Fitur: Quote, basic chart (Lightweight Charts), watchlist, TA 30 indikator, Bandarmology basic (broker summary D-1, foreign flow daily), Daily Picks v1 (5/hari rule-based), AI Copilot Q&A basic
- Data: vendor (Invezgo + OHLC.dev)
- Stack: Next.js + Go + Postgres + QuestDB + Redis
- Auth: email + Google OAuth
- Payment: belum (free closed beta)
- Channel: closed beta 500 user via waitlist

### M3–M6: Beta Public (Launch Starter Tier)
- Universe expand: IDX Composite top 300
- Fitur: Full TA, Brokermology v1, Daily Picks intraday refresh, Research Aggregator v1 (5 sekuritas + 3 media), Alerts, Backtest no-code basic
- Mobile companion (RN Expo)
- Payment: Midtrans recurring (Starter Rp 99k)
- Target: 1.000 free, 100 paid

### M6–M9: GA + Pro Tier
- Universe: All listed BEI (±945)
- Fitur: Pro tier features, Desktop Tauri app, Multi-chart workspace, Strategy marketplace beta, Backtest advanced
- Lisensi: ajukan izin Penasihat Investasi
- Target: 5.000 free, 500 paid

### M9–M12: Elite + Scale
- Direct IDX data feed (turunkan latency, eliminasi vendor margin)
- L2 depth, intraday foreign flow 5m
- AI Copilot v2 (Opus mode, multi-step research)
- Education academy launch
- Target: 15.000 free, 1.500 paid

### M12–M18: Multi-Asset
- Obligasi, ETF, Reksadana, Waran terstruktur
- International ticker (untuk diversifikasi user)
- Institutional tier (white-label untuk sekuritas)

### M18–M24: Ecosystem
- Strategy marketplace open (revenue share 70/30)
- Broker integration (OAuth ke Stockbit/Mirae/Indo Premier untuk portfolio sync)
- API public (developer plan)
- Ekspansi regional: Singapore, Malaysia, Thailand, Vietnam

---

## 13. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **Lisensi data IDX mahal** | High | High | Mulai vendor, negosiasi pricing tier-based, ajukan partnership BEI |
| **Regulasi OJK ketat (Penasihat Investasi)** | Medium | High | Legal counsel sejak awal, positioning *educational*, ajukan izin di M9 |
| **LLM cost membengkak** | Medium | Medium | Prompt caching, tier rate limit, cache common queries, fine-tune small model untuk task spesifik |
| **Akurasi Daily Picks rendah → user churn** | Medium | High | Walk-forward validation wajib, transparent track record, conservative R/R filter |
| **Skrap sekuritas → cease & desist** | Medium | Medium | Hanya public domain + partnership; legal review |
| **Kompetitor besar (Stockbit/Mirae) tiru fitur** | High | Medium | Speed of execution, focus on AI + research aggregation moat, community |
| **Data quality issue (tick salah, broker summary delayed)** | Medium | High | Multi-vendor cross-check, anomaly detection pre-publish |
| **Pump-dump abuse via produk** | Medium | High | Rule-based picks, no paid promotion, community moderation, anti-collusion detection |
| **Server downtime saat jam bursa** | Low | Critical | Multi-AZ, auto-failover, on-call rotation, status page |
| **PDP compliance violation** | Low | Critical | Data residency Indonesia, DPO, audit tahunan |

---

## 14. KPI & North Star Metric

### 14.1 North Star
**Weekly Active Trader (WAT)** — user yang membuka aplikasi ≥3x/minggu DAN melakukan ≥1 *trading-related action* (lihat detail ticker, add watchlist, set alert, baca Daily Pick, query AI).

### 14.2 Tier KPI

**Acquisition**
- Signup/bulan
- CAC (Cost per Acquisition) target < Rp 150k
- LTV/CAC target ≥ 3:1

**Activation**
- D1, D7, D30 retention
- Time to first Daily Pick view < 5 menit
- Onboarding completion rate > 70%

**Engagement**
- WAT/MAU ratio target ≥ 40%
- Session duration median ≥ 12 menit
- Charts viewed per session ≥ 3
- AI queries per active user/week ≥ 5

**Conversion**
- Free → Paid conversion ≥ 4%
- Trial → Paid conversion ≥ 30%
- Tier upgrade Starter → Pro ≥ 15%/tahun

**Retention / Revenue**
- MRR growth ≥ 15%/bulan (early), 5%/bulan (mature)
- Net Revenue Retention ≥ 110%
- Gross churn ≤ 5%/bulan (Starter), 3% (Pro), 2% (Elite)

**Product Quality**
- Daily Picks hit rate (TP1 hit before SL) — track per setup, target ≥ 55%
- Daily Picks average R/R realized ≥ 1.3
- AI Copilot user satisfaction (thumbs up) ≥ 80%
- p95 latency real-time tick < 500ms
- Uptime ≥ 99.9% (jam bursa)

---

## 15. Brand & Naming

**Working name candidates:**
- **Nubuat** — "prophecy/forecast" dalam bahasa Indonesia (kuat, sesuai folder kerja `/Users/haimac/nubuat`)
- **Arta** — Sanskrit/Jawa untuk "kekayaan"
- **Tirta** — "aliran" → sesuai aliran modal
- **Veredikta** / **Verdikt** — verdict-based analytics
- **AlphaSiap** — siap = ready, alpha = excess return

**Rekomendasi:** **Nubuat** — distinctive, Indonesia-native, mudah diingat, sesuai dengan janji produk (memberikan *nubuat* berbasis data, bukan tebakan).

**Tagline candidates:**
- *"Nubuat — Sains di balik Setiap Trade"*
- *"Bukan tebakan. Nubuat."*
- *"Bloomberg-grade. Harga retail."*

---

## 16. Tim & Hiring Plan (M0–M12)

| Role | M0 | M3 | M6 | M12 |
|---|---|---|---|---|
| Founder/CEO/PM | 1 | 1 | 1 | 1 |
| Frontend Engineer | 1 | 2 | 3 | 4 |
| Backend Engineer | 1 | 2 | 3 | 4 |
| Data Engineer | 1 | 1 | 2 | 3 |
| ML/Quant | 0 | 1 | 1 | 2 |
| Designer (Product + UX) | 1 | 1 | 1 | 2 |
| QA | 0 | 0 | 1 | 2 |
| DevOps/SRE | 0 | 0 | 1 | 1 |
| Content/Research (saham analyst) | 0 | 1 | 2 | 3 |
| Growth/Marketing | 0 | 1 | 1 | 2 |
| Customer Success | 0 | 0 | 1 | 2 |
| Compliance/Legal (advisor → in-house) | advisor | advisor | advisor | 1 |
| **Total** | **5** | **10** | **17** | **27** |

**Funding ballpark:**
- Pre-seed (M0–M6): USD 300–500k → MVP + 6 bulan runway
- Seed (M6–M18): USD 1.5–3M → expand tim, lisensi IDX, marketing
- Series A (M18+): USD 8–15M → multi-asset, regional expansion

---

## 17. Appendix

### 17.1 Referensi Riset
**Pasar & Emiten:**
- IDX (idx.co.id) — official statistics & filing
- BRI Danareksa Research (brights.id)
- MOST.co.id Riset (Mandiri Sekuritas)
- Sahamu.com — sektor klasifikasi
- Lembar Saham (lembarsaham.com) — analisa fundamental
- Investasiku — edukasi & data IDX30/LQ45/IDX80
- Moneynesia — daftar emiten 12 sektor
- e-IPO (e-ipo.co.id) — pipeline IPO
- Kontan Emiten (emiten.kontan.co.id)

**Benchmark Produk:**
- AlphaFlow — flow.klinikpenyesalan.com
- Stockbit Pro — stockbit.com/info/pro-tools
- RTI Business
- HOTS Mirae Asset
- IPOT Indo Premier
- TradingView, Bloomberg Terminal

**Bandarmology Resources:**
- Stockbit Help — Bandar Detector documentation
- Bandarmology.net
- Pasbana, datasahambei.com (educational)
- Medium: Kevin Daffa Arrahman — "Step by Step Foreign Flow Analysis on IDX"

**Tech References:**
- TradingView Lightweight Charts (github.com/tradingview/lightweight-charts)
- QuestDB Benchmarks (questdb.com/blog)
- KX Benchmarks (TSBS) — kx.com/blog
- Anthropic Claude API documentation
- IDX API vendors: OHLC.dev, iTick (itick.org), Invezgo (invezgo.com), ICE Developer

**Regulasi:**
- OJK SEOJK 7/SEOJK.04/2017 — Penasihat Investasi electronic submission
- Bapepam V.C.1 — Perizinan Penasihat Investasi
- POJK 32/2025 — Fintech payment regulation
- UU 27/2022 — Pelindungan Data Pribadi

**Payment Gateway:**
- Midtrans (midtrans.com)
- Xendit (xendit.co)

### 17.2 Open Questions / Next Step
1. **Validasi user research** — 30 wawancara trader retail aktif (sample dari komunitas Stockbit, Telegram trading) untuk validasi pricing & top fitur.
2. **Lisensi data IDX** — meeting BEI Data Services untuk kuotasi langsung vs vendor.
3. **Legal counsel** — pilih law firm spesialis pasar modal (Hadiputranto Hadinoto / Assegaf Hamzah / Makarim & Taira) untuk advise lisensi.
4. **Prototyping** — Figma high-fidelity prototype 3 flow utama (Daily Picks, Ticker Deep Dive, AI Q&A) untuk usability test.
5. **MVP scope freeze** — putuskan 1 *killer feature* untuk MVP launch (rekomendasi: **Daily Picks + Bandarmology + AI Copilot**, defer Backtesting & Strategy Marketplace ke v2).
6. **Co-founder/tech lead hire** — kalau founder solo.
7. **Pendanaan** — siapkan deck pre-seed, target angel/early-stage fund Indonesia (East Ventures, AC Ventures, Alpha JWC, Init-6, Kopital).

---

*Dokumen ini adalah baseline strategis. Setiap bagian akan didetailkan menjadi spec terpisah (PRD per fitur, RFC arsitektur, design doc per service) di fase eksekusi.*
