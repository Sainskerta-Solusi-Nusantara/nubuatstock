# Nubuat Improvement Plan

**Status:** Living document — direvisi setiap kali ada riset benchmark baru atau permintaan user. Dieksekusi setelah fitur core stabil dan tervalidasi.

**Last updated:** 2026-05-19 (audit lanjutan §8)

---

## 1. Konteks & Sumber

Improvement plan ini dikompilasi dari:
1. **Benchmark riset:**
   - **AlphaFlow** (flow.klinikpenyesalan.com) — bandarmology + Wyckoff + verdict scoring. Didetail di [`ANALISIS_APLIKASI_SAHAM.md`](./ANALISIS_APLIKASI_SAHAM.md) §2.2.
   - **NeoBDM** (neobdm.tech) — bandarmology niche dengan klasifikasi 4-pelaku unik (Non-Retail / Sultanmologi / Foreign / Zombimologi), pricing ultra-agresif (Rp 35rb/bln). Detail riset di §2 doc ini.
   - Kompetitor mainstream (Stockbit, RTI, HOTS, IPOT, Ajaib, TradingView) — sudah didetail di analisis utama §2.3.
2. **Permintaan user eksplisit** dalam sesi pengembangan.
3. **Gap teknis** yang teridentifikasi saat development (mis. data ingestion belum lengkap).

---

## 2. NeoBDM Benchmark Summary

### Positioning
**Web-app screener & analitik saham IDX dengan niche bandarmology / inventory analysis paling dalam di pasar Indonesia.** Founder: Ko Wira. Berjalan sejak 2017-an, community-driven growth (tutorial influencer organic, bukan iklan).

### Fitur Signature

| Fitur | Deskripsi | Status di Nubuat |
|---|---|---|
| **Transaction Screener** | Tabel emiten dengan final price, % change, kolom Foreign & Non-Retail allocation | ⚠️ Partial — Screener kami fundamental-based, belum punya kolom flow per-pelaku |
| **Frequency Analyzer (Spike Detection)** | Deteksi konsentrasi: 1 player besar vs banyak retail (bukan sekadar volume tinggi) | ❌ Belum ada |
| **Rotation Chart (4-kuadran sektor)** | RRG-style: Improving / Outperform / Underperform / Bottom-fishing | ⚠️ Punya Sector Heatmap, tapi belum 4-kuadran rotation visualization |
| **Sector Activity Chart (capital rotation)** | Flow uang antar market-cap (large → mid/small) | ❌ Belum ada |
| **Broker Stalker** | Filter per-broker (mis. JP Morgan/BK foreign, atau broker retail untuk contrarian) | ❌ Belum ada (schema `broker_summary_daily` exist tapi belum di-ingest) |
| **Klasifikasi 4-pelaku unik** | Non-Retail / Sultanmologi / Foreign / Zombimologi (bandar IPO underwriter) | ❌ Konsep menarik, perlu adaptasi taxonomy |
| **Market Summary W4/W3/W2 + D3/D2/D1** | Time-window comparison flow untuk lihat momentum shift | ❌ Belum ada |

### Pricing (entry-level ultra-agresif)
| Tier | Harga |
|---|---|
| 1 bulan | Rp 35.000 |
| 2 bulan | Rp 68.000 (~Rp 34rb/bln) |
| 6 bulan | Rp 200.000 (~Rp 33rb/bln) |

### Strengths NeoBDM
1. Niche bandarmology terdalam di pasar Indonesia (Spike Detection + 4-pelaku klasifikasi).
2. Harga ultra-murah → low barrier to try.
3. Methodology konsisten: "follow the smart money" diterapkan di semua fitur.
4. Community-driven growth (no iklan, tutorial organic dari Jihad Brahmantyo, @ceritamarket, Emir Parengkuan).

### Weaknesses → Peluang Nubuat
1. **UI/UX jadul** (di-confirm publik @dojjunn: "Ko Wira coding sendiri, UI/UX masih jadul") — Nubuat menang lewat design system modern.
2. **Mobile experience lemah** — Nubuat bisa mobile-first.
3. **Landing page kosong** — tidak ada public pricing/demo/features. Calon customer wajib signup dulu = friction tinggi.
4. **Tidak ada layer fundamental** — fokus sempit bandarmology. Nubuat punya **DCF + verdict + screener fundamental** = hybrid.
5. **Tidak ada AI / LLM native** — pengguna pakai NeoBDM + ChatGPT manual (TikTok @ceritamarket). Nubuat punya **AI Copilot terintegrasi**.
6. **Tidak ada community / edukasi in-app** — ebook (Rp 77rb) dibuat user lain (Whisper), bukan official.
7. **Tidak ada real-time alerts** ter-confirm — analisis post-market saja.

---

## 3. Improvement Categories (Prioritized)

Format priority:
- **P0** = High impact, low effort, build next (1-2 sprint)
- **P1** = High impact, medium effort (2-4 sprint)
- **P2** = Medium impact atau high effort (1-2 quarter)
- **P3** = Nice-to-have / future research

### 3.A. Wave & Pattern Analysis

#### 3.A.1 Elliott Wave Analysis Engine — **P1**
Detail lengkap sudah ter-spec di [`ANALISIS_APLIKASI_SAHAM.md`](./ANALISIS_APLIKASI_SAHAM.md) §4.1.A.

**Vision:** Setiap emiten menampilkan auto-detected wave count (1-2-3-4-5 atau A-B-C) dengan pre-rendered chart image + AI narrative.

**Komponen kunci:**
- Pivot Detection Engine (ZigZag-based)
- Wave Labeler (Elliott's 3 hard rules + soft guidelines)
- DB schema `elliott_wave_snapshots`
- AI narrative generator (DeepSeek)
- Server-side chart rendering (PNG via node-canvas)
- Worker job: cron 1 jam post-EoD, ~45 min untuk 980 emiten × 3 timeframe

**Phasing:** P0 pivot+impulse 1D → P1 multi-TF+ABC → P2 AI+chart → P3 wave degree hierarchy.

**Effort:** 2-3 sprint.

**Differentiator:** Stockbit/RTI/HOTS/AlphaFlow/NeoBDM TIDAK punya auto wave count.

---

#### 3.A.2 Auto Pattern Recognition — **P1**

**Vision:** Algorithm + ML detection untuk pola chart klasik. Tampil di Technical tab tiap ticker sebagai "Detected Patterns" card dengan annotation di chart.

**Pola wajib di-support (chronological order developmental):**

**Continuation Patterns (P0 batch):**
- **Bullish Flag** (uptrend → konsolidasi rectangular menurun → breakout up)
- **Bearish Flag** (mirror)
- **Bullish Pennant** (small symmetrical triangle setelah strong move)
- **Bearish Pennant**
- **Cup and Handle** (rounded bottom + small pullback handle → breakout)
- **Inverse Cup and Handle**
- **Rectangle / Trading Range Breakout**

**Reversal Patterns (P1 batch):**
- **Double Top / Double Bottom**
- **Triple Top / Triple Bottom**
- **Head and Shoulders** (klasik bearish reversal)
- **Inverse Head and Shoulders** (bullish)
- **Rounding Top / Rounding Bottom**
- **V-Reversal** (sharp turn)

**Indecision / Transition (P2 batch):**
- **Symmetrical Triangle**
- **Ascending Triangle** (bullish bias)
- **Descending Triangle** (bearish bias)
- **Wedge — Rising** (bearish reversal)
- **Wedge — Falling** (bullish reversal)
- **Diamond Top / Bottom**

**Candlestick Patterns (P2 batch — separate from chart pattern):**
- Hammer, Hanging Man, Shooting Star, Inverted Hammer
- Engulfing (Bullish/Bearish), Harami, Piercing Line, Dark Cloud Cover
- Morning Star, Evening Star, Three White Soldiers, Three Black Crows
- Doji variants (Long-Legged, Dragonfly, Gravestone)

**Implementation approach:**

1. **`lib/patterns/detectors.ts`** — pure algorithm per pattern:
   - Each detector function: `detectCupAndHandle(bars: Bar[]): PatternMatch[]`
   - Return: `{ pattern: "cup_handle", startBar, endBar, confidence, keyLevels: { neckline, target, stopLoss }, narrative }`

2. **`lib/patterns/aggregator.ts`** — run all detectors per ticker, dedup overlapping matches, rank by confidence.

3. **Schema** `pattern_detections`:
   ```sql
   CREATE TABLE pattern_detections (
     id ulid PRIMARY KEY,
     company_kode TEXT NOT NULL,
     timeframe TEXT NOT NULL,
     pattern_type TEXT NOT NULL,         -- 'cup_handle', 'bull_flag', etc.
     pattern_category TEXT NOT NULL,     -- 'continuation' | 'reversal' | 'indecision' | 'candlestick'
     direction TEXT NOT NULL,            -- 'bullish' | 'bearish'
     start_date DATE NOT NULL,
     end_date DATE NOT NULL,
     confidence NUMERIC NOT NULL,        -- 0-1
     status TEXT NOT NULL,               -- 'forming' | 'completed' | 'invalidated'
     key_levels JSONB NOT NULL,          -- { breakout: 1500, target: 1800, stop: 1400 }
     volume_confirmation BOOLEAN,        -- did volume confirm breakout?
     narrative TEXT,                     -- AI-generated
     chart_image_url TEXT,
     detected_at TIMESTAMPTZ NOT NULL,
     UNIQUE (company_kode, timeframe, pattern_type, start_date)
   );
   ```

4. **UI integration:**
   - **Ticker page Technical tab:** "Detected Patterns" section di bawah Wyckoff + Elliott Wave
     - List pattern aktif (forming + completed last 90d)
     - Status badge (Forming / Completed / Invalidated)
     - Key levels: breakout price, target, stop loss
     - Confidence score bar
     - "View on chart" → toggle annotation overlay di main chart
   - **Screener filter baru:** "Currently forming Cup & Handle", "Bullish Flag breakout last 5d", dll.
   - **Daily Picks integration:** pattern signals di-weighted ke pick scoring.
   - **AI Copilot tool baru:** `get_active_patterns_for_ticker`.

5. **Worker job:** `worker/jobs/detect-patterns.ts` — cron 1 jam post-EoD, run semua detector pada 980 emiten, 3 timeframe (1D/1W). Estimasi 20-30 menit dengan parallelization.

**Effort:** 3-4 sprint untuk P0 batch (7 continuation patterns), 2-3 sprint untuk P1 batch (reversal), 2 sprint untuk candlestick (P2).

**Differentiator:** Stockbit punya beberapa indicator manual; tidak ada auto-detection annotation di IDX platform. TradingView punya tapi mahal & global.

---

### 3.B. Screener Enhancements

#### 3.B.1 Technical Indicator Filters — **P0**

**Current state:** Screener kami sekarang fundamental-only (PE/PBV/ROE/dividend yield/sector). Belum support filter berdasarkan indikator teknikal.

**Vision:** Tambah category "Technical Filters" di screener dengan kemampuan filter berdasarkan indikator + preset strategy.

**Indikator yang wajib di-support:**

**Momentum:**
- **RSI 14** — min/max value (mis. RSI < 30 untuk oversold; RSI > 70 untuk overbought)
- **Stochastic %K & %D** — multiple settings:
  - **Stochastic 10, 5, 5** (untuk Mode Swing Santai — per permintaan user) — bisa filter "below 20 = oversold zone" atau "golden cross" atau "above 80 then turning down"
  - Stochastic 5, 3, 3 (fast — short term scalping)
  - Stochastic 14, 3, 3 (default — standard analysis)
- **MACD (12, 26, 9)** — filter:
  - MACD line > Signal line (bullish)
  - MACD line < Signal line (bearish)
  - Histogram turning positive (just crossed up)
  - Histogram turning negative (just crossed down)
- **Williams %R 14**
- **CCI 20**
- **MFI 14** (volume-weighted RSI — sudah dipakai di Bandarmology card)

**Trend:**
- **Price vs SMA 20 / 50 / 200** (above / below)
- **SMA stack** (SMA20 > SMA50 > SMA200 = strong uptrend)
- **Golden Cross** (SMA50 baru cross di atas SMA200 last N hari)
- **Death Cross** (SMA50 baru cross di bawah SMA200)
- **EMA 9 / 21 / 55** sama variants
- **ADX 14** (trend strength) — min value (mis. ADX > 25 = strong trend)
- **Parabolic SAR** (current dot di atas/bawah harga)

**Volatility:**
- **Bollinger Bands 20, 2** — filter:
  - Price below lower band (oversold)
  - Price above upper band (overbought)
  - Band squeeze (Band width terendah dalam 6 bulan = potential breakout)
  - Band expansion (just expanded from squeeze)
- **ATR 14** — min/max (filter berdasarkan volatility level)

**Volume:**
- **Volume spike** — volume hari ini > N × avg 20d
- **OBV trend** (rising / falling)
- **A/D Line trend**
- **Chaikin Money Flow** (positive / negative)

**Pattern (cross-reference dengan §3.A.2):**
- "Currently in Wave X" (Elliott)
- "Forming Cup & Handle" / pattern apa pun yang aktif
- "Near support level"
- "Near resistance level"
- "52-week high breakout"
- "52-week low breakdown"

#### 3.B.2 Strategy Mode Presets — **P0**

Karena banyaknya indikator, preset strategi mode-based membantu user awam:

**Mode Swing Santai (Conservative Swing Trader)** — per permintaan user eksplisit:
- Stochastic 10, 5, 5: %K below 20 dan turning up (oversold + reversal)
- RSI 14: between 30-50 (recovering from oversold)
- Price > SMA50 (medium-term uptrend intact)
- MACD histogram turning positive
- Volume > avg 20d (confirmation)
- ATR within last 3 month range (no extreme volatility)
- Min ROE > 8% (fundamental sanity check)
- Sort: Stochastic %K asc (most oversold first)

**Mode Day Trader (Aggressive Intraday):**
- RSI 14: between 40-60 (mid-range, room to move)
- Volume > 2× avg 20d (high interest)
- ATR > median (ada movement)
- Price > VWAP today
- MACD histogram positive AND increasing

**Mode Breakout Hunter:**
- Bollinger Band squeeze last 20d (compression)
- Volume spike on most recent bar
- Price at upper Bollinger Band
- ADX > 20 AND rising
- Pattern: Triangle/Wedge/Flag completion

**Mode Reversal Catcher:**
- RSI 14 < 30 OR > 70 (extreme)
- Stochastic 14,3,3 < 20 OR > 80
- Bullish/Bearish divergence (price-RSI)
- Pattern: Double Top/Bottom OR H&S forming

**Mode Dividend Income** — sudah ada di "Dividend Aristocrat" preset (extend dengan tech filter for safety: above SMA200 = trend protection)

**Mode Quality Compounder** — sudah ada (extend dengan SMA stack uptrend filter)

**Effort:** Filter engine extension 2 sprint; preset library + UI 1 sprint = total 3 sprint.

#### 3.B.3 Saved Custom Screens — **P1**

User bisa save filter combo as named screen ("Strong Buy Setup", "Watchlist B").

Schema `saved_screens`:
```sql
CREATE TABLE saved_screens (
  id ulid PRIMARY KEY,
  user_id ulid NOT NULL,
  name TEXT NOT NULL,
  filters JSONB NOT NULL,           -- ScreenerFilters serialized
  is_alert BOOLEAN NOT NULL DEFAULT false, -- run daily, notify if hits
  ...withTimestamps
);
```

Bonus: kalau `is_alert = true`, worker check daily dan kirim notifikasi kalau hasil filter berubah.

**Effort:** 1 sprint.

---

### 3.C. Bandarmology Layer 2 (NeoBDM-inspired)

#### 3.C.1 Data Ingestion: Foreign Flow & Broker Summary — **P0 blocker**

**Current state:** Schema `foreign_flow_daily` dan `broker_summary_daily` sudah ada tapi **EMPTY** (data belum di-ingest). Bandarmology card Layer 2 placeholder.

**Source options:**
1. **IDX daily summary CSV** — tersedia tapi butuh login + anti-bot bypass.
2. **IDX Channel API** (Stockbit partner).
3. **3rd party data vendor** (KSEI, Reuters Eikon).

**Effort:** Investigation 1 sprint, automation 2 sprint.

#### 3.C.2 Broker Profile Tagging — **P1**

Tag setiap broker dengan profile untuk smart filtering:
- **Foreign-heavy** (JP Morgan, Macquarie, UBS, CIMB Niaga Sekuritas, BK)
- **Retail-heavy** (Indo Premier, Mirae Asset, MNC Sekuritas)
- **Institutional-heavy** (Mandiri Sekuritas, BCA Sekuritas, Trimegah)
- **IPO underwriter / Zombimologi** (broker yang sering jadi underwriter — punya inventory bawah)

Inspired by NeoBDM's Broker Stalker.

Schema:
```sql
ALTER TABLE brokers ADD COLUMN profile_tags TEXT[];
-- Values: 'foreign', 'retail', 'institutional', 'underwriter', 'syariah'
```

UI: Broker Stalker page (`/brokers/[code]`) dengan top emiten yang mereka beli/jual + tag profile.

#### 3.C.3 4-Pelaku Classification (Nubuat adaptation) — **P1**

Adaptasi konsep NeoBDM tapi dengan branding Nubuat yang lebih netral & informatif:

| NeoBDM term | Nubuat adaptation | Definisi |
|---|---|---|
| Non-Retail | **Institusi** | Pension fund, mutual fund, asuransi |
| Sultanmologi | **Bandar Lokal** | Big player domestik (sultan/HNW) |
| Foreign | **Asing** | Investor luar negeri |
| Zombimologi | **Underwriter / Inventory Holder** | Broker yang pegang inventory dari IPO/private placement |

UI: per ticker, donut chart aktivitas 30d split 4-pelaku ini.

#### 3.C.4 Spike Detection / Frequency Analyzer — **P1**

**Vision:** Replicate NeoBDM's signature feature.

**Algorithm:**
- Per emiten, hitung distribusi `transaction_size` (avg lot per trade) dalam window 5d / 20d.
- **Spike** = transaction concentration anomaly: kalau 1 broker melakukan banyak trade besar di hari tertentu = potensi single big buyer.
- Output: `frequency_concentration_score` (0-1) per ticker per hari.
- Visualization: histogram trade size + heatmap timeline (red = retail-heavy, blue = institutional spike).

**Requires:** broker_summary_daily data + intraday tick data (lebih bagus).

**Effort:** 2 sprint setelah data tersedia.

#### 3.C.5 Rotation Chart (4-Quadrant Sector) — **P1**

**Vision:** Relative Rotation Graph (RRG) per sektor — 4-quadrant scatter:
- X-axis: relative strength vs IHSG
- Y-axis: momentum (rate of change of relative strength)
- Quadrant: Leading (upper-right) / Weakening (lower-right) / Lagging (lower-left) / Improving (upper-left)

Klik sektor → list emiten dengan rotation chart per emiten dalam sektor.

Inspired by NeoBDM's Rotation Chart + traditional RRG.

**Effort:** 2 sprint.

#### 3.C.6 Sector Capital Flow Heatmap — **P2**

**Vision:** Visualisasi flow modal antar market cap (large → mid → small) over time. Logic: kalau large-cap dump → kemana modal pindah?

Display: Sankey diagram (flow) atau time-series stacked bar chart per market cap bucket.

---

### 3.D. Paper Trading & Portfolio

#### 3.D.1 Paper Trading System — **P0**

**Current state:** Skema billing punya `feature.paper_trading` flag tapi tidak ada schema/UI.

**Vision:** User punya virtual portfolio Rp 100jt default, bisa buy/sell ticker IDX dengan harga real-time, leaderboard performance per user.

**Schema baru:**
```sql
CREATE TABLE paper_portfolios (
  id ulid PRIMARY KEY,
  user_id ulid NOT NULL,
  name TEXT NOT NULL,
  cash_balance_idr NUMERIC NOT NULL,
  initial_capital_idr NUMERIC NOT NULL DEFAULT 100000000,
  ...withTimestamps
);

CREATE TABLE paper_positions (
  id ulid PRIMARY KEY,
  portfolio_id ulid NOT NULL,
  company_kode TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  avg_buy_price_idr NUMERIC NOT NULL,
  ...withTimestamps
);

CREATE TABLE paper_trades (
  id ulid PRIMARY KEY,
  portfolio_id ulid NOT NULL,
  company_kode TEXT NOT NULL,
  side TEXT NOT NULL,                -- 'buy' | 'sell'
  quantity INTEGER NOT NULL,
  price_idr NUMERIC NOT NULL,
  total_value_idr NUMERIC NOT NULL,
  fee_idr NUMERIC NOT NULL DEFAULT 0,
  executed_at TIMESTAMPTZ NOT NULL,
  source TEXT NOT NULL,              -- 'manual' | 'daily_pick_follow' | 'screener_setup'
  ...withTimestamps
);

CREATE TABLE paper_leaderboard_snapshots (
  id ulid PRIMARY KEY,
  portfolio_id ulid NOT NULL,
  snapshot_date DATE NOT NULL,
  total_value_idr NUMERIC NOT NULL,
  return_pct NUMERIC NOT NULL,
  rank INTEGER,
  ...withTimestamps
);
```

**UI:**
- `/portfolio` — main portfolio view: cash, positions, P&L, equity curve
- `/portfolio/trade` — buy/sell modal dengan real-time price
- `/leaderboard` — top performers (weekly/monthly/all-time)
- Integration: "Follow this pick" button di Daily Picks → auto buy/sell

**Effort:** 4 sprint.

---

### 3.E. Edukasi & Community (Soft Moat)

#### 3.E.1 In-app Academy — **P1**

Course modules dengan progress tracking:
- **Beginner:** Apa itu saham, cara baca chart, basic indikator (RSI/MA/Volume)
- **Intermediate:** Bandarmology, Wyckoff phase, Elliott Wave, Pattern recognition
- **Advanced:** DCF valuation, options/derivatif (future), portfolio management

Format: artikel + video embed + quiz + certification badge.

**Effort:** 3-4 sprint (development) + ongoing content production.

#### 3.E.2 Community Feed / Stockstream Lite — **P2**

User bisa post analysis singkat (tweet-length), mention ticker → auto-link, attach chart screenshot. Lighter version dari Stockbit community, fokus quality bukan volume.

**Risk:** Moderation overhead — perlu admin tools + spam detection.

---

### 3.F. Mobile Native App — **P2**

React Native + Expo dengan parity ke web. Priority screen:
1. Ticker page (chart + verdict)
2. Daily Picks
3. Watchlist + Alerts (push notifications)
4. News feed

**Effort:** 8-12 sprint (substantial), perlu dedicated mobile team.

---

### 3.G. Real-time Features

#### 3.G.1 Real-time Price Alerts — **P1**

Currently: alerts schema ada tapi runs on EoD check.

**Upgrade:** Stream intraday quotes (5-min interval) via vendor real-time, trigger alerts immediately.

Push notification ke mobile app + email + in-app toast.

#### 3.G.2 Live Dashboard Watch — **P2**

Auto-refresh dashboard tiap 30 detik saat market open, dengan visual cue (flash) untuk perubahan signifikan.

---

### 3.H. AI / LLM Layer Enhancements

#### 3.H.1 AI Auto-Summary Daily — **P1**

Setiap pagi (07:00 WIB), AI generate:
- IHSG outlook
- Top 5 picks of the day with reasoning
- Major news that moves market
- Earnings calendar for the week

Format: 1-paragraph executive summary di top of dashboard + email digest.

#### 3.H.2 AI Conversational Backtest — **P2**

User: "Jika saya beli BBRI tiap RSI < 30 dan jual saat RSI > 70, profitnya berapa 5 tahun terakhir?"
→ AI parse strategy → run backtest → return result + chart.

**Effort:** 3-4 sprint (NLP layer + backtest API integration).

#### 3.H.3 AI Pattern Explanation — **P1**

Per pattern detection (cup & handle, dll), AI generate 2-paragraf explanation:
- Apa artinya pattern ini secara umum
- Specific context untuk ticker ini
- Historical precedent (kalau available)

---

### 3.I. Public Marketing Site

Currently: landing page minimal. NeoBDM weakness juga (no public features/pricing page).

**Improvements:**
- Public **/features** page dengan screenshots tiap modul
- Public **/pricing** page dengan tier comparison clear (Free / Starter / Pro / Enterprise)
- Public **/demo** dengan video walkthrough 2-3 menit
- **Compare vs competitors** matrix (Nubuat vs Stockbit vs RTI vs AlphaFlow)
- Customer testimonials + case studies

**Effort:** 2-3 sprint (design + copy).

---

## 4. Prioritization Matrix

| Improvement | Priority | Effort | User Impact | Differentiator |
|---|---|---|---|---|
| Pattern Recognition (continuation batch) | P1 | 3-4 sprint | High | ⭐⭐⭐ |
| Screener Technical Filters (Stoch 10,5,5 dll) | P0 | 3 sprint | High | ⭐⭐ |
| Mode Swing Santai preset | P0 | 1 sprint | High (specific user ask) | ⭐⭐⭐ |
| Foreign Flow + Broker Data Ingestion | P0 | 3 sprint | High (unlock Bandarmology L2) | ⭐⭐ |
| Elliott Wave Engine | P1 | 2-3 sprint | High | ⭐⭐⭐⭐ |
| Rotation Chart 4-quadrant | P1 | 2 sprint | Medium-High | ⭐⭐⭐ |
| Paper Trading | P0 | 4 sprint | High (completes "test before risk" promise) | ⭐⭐ |
| Saved Custom Screens + Alerts | P1 | 1 sprint | Medium | ⭐ |
| Broker Stalker (NeoBDM-inspired) | P1 | 2 sprint | Medium-High | ⭐⭐⭐ |
| 4-Pelaku Classification | P1 | 1 sprint | Medium | ⭐⭐ |
| Spike Detection (Frequency Analyzer) | P1 | 2 sprint | High | ⭐⭐⭐ |
| In-app Academy | P1 | 4 sprint + content | Medium (retention) | ⭐⭐ |
| Reversal Pattern batch | P1 | 2-3 sprint | Medium | ⭐⭐ |
| Candlestick Pattern batch | P2 | 2 sprint | Medium | ⭐ |
| Real-time Alerts | P1 | 2 sprint | High | ⭐⭐ |
| AI Auto-Summary Daily | P1 | 2 sprint | High (engagement) | ⭐⭐⭐ |
| AI Pattern Explanation | P1 | 1 sprint | Medium | ⭐⭐ |
| Public Marketing Site | P1 | 2-3 sprint | High (acquisition) | ⭐⭐ |
| Mobile Native App | P2 | 8-12 sprint | High (long-term) | ⭐⭐ |
| AI Conversational Backtest | P2 | 3-4 sprint | Medium-High | ⭐⭐⭐⭐ |
| Sector Capital Flow Heatmap | P2 | 2 sprint | Medium | ⭐⭐ |
| Community Feed | P2 | 3-4 sprint + mod | Medium (retention) | ⭐ |

---

## 5. Suggested Execution Roadmap (3 Sprint blok)

### Sprint Block 1 — "Make Existing Features Smart" (8 minggu, ~4 sprint)
1. **Screener Technical Filters** + Stochastic 10,5,5 + Mode Swing Santai preset (P0 user ask)
2. **Pattern Recognition — Continuation batch** (Bullish/Bearish Flag, Pennant, Cup & Handle, Rectangle)
3. **Foreign Flow + Broker Data Ingestion** (unlock Bandarmology Layer 2 yang sudah punya UI)
4. **Saved Custom Screens + Alerts**

### Sprint Block 2 — "Distinctive Analytics" (8 minggu, ~4 sprint)
1. **Elliott Wave Engine P0** (pivot detection + impulse labeling 1D)
2. **Pattern Recognition — Reversal batch** (Double Top/Bottom, H&S, Triple variants)
3. **Rotation Chart 4-quadrant** (RRG-style)
4. **AI Auto-Summary Daily** + AI Pattern Explanation

### Sprint Block 3 — "Sticky Engagement" (8-12 minggu)
1. **Paper Trading System** (4 sprint)
2. **Real-time Alerts**
3. **Broker Stalker** + 4-Pelaku Classification + Spike Detection
4. **Elliott Wave P1** (multi-TF + corrective patterns)

### Sprint Block 4 — "Growth & Acquisition"
1. **Public Marketing Site** (transparent pricing, demo, comparison)
2. **In-app Academy** (kickoff dengan 6 modul Beginner)
3. **AI Conversational Backtest**

### Sprint Block 5+ — "Scale" (1-2 quarter)
1. **Mobile Native App** (iOS + Android)
2. **Community Feed**
3. **Sector Capital Flow Heatmap**
4. **Candlestick Pattern batch**

---

## 6. Open Questions / Decisions Needed

1. **NeoBDM-style 4-pelaku branding** — apakah Nubuat mau pakai branding catchy (Sultanmologi/Zombimologi style) atau formal/netral (Institusi/Bandar Lokal/Asing/Underwriter)?
2. **Pattern detection accuracy threshold** — minimum confidence apa yang ditampilkan ke user? (Saran: 0.7 untuk default visible, 0.5+ untuk admin view)
3. **Paper trading fee model** — pakai fee broker simulasi (mis. 0.15% buy + 0.25% sell) atau zero-fee?
4. **Real-time data vendor** — IDX direct (mahal), 3rd party (delay 15 menit), atau pakai vendor delay-quote untuk MVP?
5. **Pricing positioning vs NeoBDM** — Nubuat saat ini lebih premium (Rp 99rb+/bln). Tetap di posisi premium atau add aggressive entry tier (Rp 39rb/bln "Lite" tier)?
6. **Mobile app priority** — bangun React Native sekarang atau optimize PWA dulu (lower effort, sufficient for 80% use case)?

---

## 7. Catatan

Dokumen ini **bukan kontrak** — prioritas akan bergeser berdasarkan:
- Feedback user real (post-launch)
- Insight A/B testing kalau ada
- Resource availability
- Riset benchmark baru

Setiap item di sini sebaiknya divalidasi dengan minimum viable test sebelum full development. Banyak fitur "must-have" dari riset benchmark ternyata low-usage di real production.

**Owner:** Founder + product team
**Cadence review:** Per sprint planning (2 minggu sekali)

---

## 8. Audit Lanjutan — 2026-05-19

Update setelah eksekusi sprint Mei (Trial signup, Pitchdeck PDF, Logo fix, Verdict factor fix, 400-commit history reconstruction). Tujuan section ini: scanning ulang seluruh codebase + flow user dari sudut pandang **production-readiness, retensi, dan unit economics**. Item dikelompokkan per severity & estimasi effort. Tanggal target = working day estimate dari hari ini.

### 8.1 P0 — Hutang Teknis yang Blokir Launch

| # | Item | Effort | Detail |
|---|---|---|---|
| 1 | **Fix 9 tsc errors di `app/api/research/[id]/pdf/route.ts`** | 5 menit | File pakai JSX tapi extension `.ts`. Rename → `route.tsx`. Saat ini build CI akan fail. |
| 2 | **Email verification gate** | 4 jam | Alif (user real pertama) email_verified=false, masuk app tanpa verifikasi. Setup: kirim magic-link via Resend on signup, blok login sampai verified. Wajib sebelum monetisasi. |
| 3 | **Upstash Redis quota** | 1 jam | Limit 500K req/bulan sudah tercapai 12 Mei. Upgrade ke paid tier (Rp ~150rb/bln) atau migrasi ke self-hosted Redis di VPS. |
| 4 | **Pre-commit hook bypass dampak** | 30 menit | Husky pre-commit jalan `tsc --noEmit` — saat ini ada 9 error pending (item #1). Setelah rename PDF route, pastikan hook lulus supaya developer lain tidak terbiasa `--no-verify`. |
| 5 | **5 placeholder TODO di dashboard** | 6 jam | Dashboard masih hardcode (tier resolver Free, top picks dummy, indices dummy, recent conversations dummy). Wire ke real API yang sudah ada. |
| 6 | **Pitchdeck screenshots capture** | 30 menit + 5 menit run | `scripts/capture-pitchdeck-screenshots.ts` sudah dibuat tapi belum dijalankan. Jalankan 1× saat dev server up untuk populate `public/pitchdeck/screenshots/` — supaya PDF tidak placeholder. |

**Target selesai:** 2026-05-22 (3 hari)

### 8.2 P1 — Risiko Bisnis & Compliance

| # | Item | Effort | Detail |
|---|---|---|---|
| 7 | **Disclaimer accept gate enforcement** | 2 jam | Modal accept disclaimer sudah ada tapi belum dipaksa pada first login real user. Wajib untuk perlindungan legal OJK & UU PDP. |
| 8 | **Audit log immutability** | 1 hari | Tabel `audit_logs` saat ini bisa di-update/delete admin. Tambah row-level lock atau append-only constraint untuk forensik. |
| 9 | **Payment webhook signature verification** | 4 jam | Verifikasi Midtrans/Xendit webhook signature sudah ada code-nya tapi belum integration-test dengan ngrok. Test end-to-end pakai sandbox key. |
| 10 | **Rate limit per-IP, bukan per-user, di endpoint publik** | 3 jam | Saat ini rate limit pakai `user_id` — endpoint publik (signup, login, search) bisa di-abuse oleh attacker yang bikin akun baru terus. Pasang IP-based bucket layer di middleware. |
| 11 | **Backup database otomatis** | 4 jam | Neon Postgres default daily backup 7 hari. Untuk Pro tier ke atas, set cron lib worker dump ke S3 weekly (Glacier deep archive — cheap). |
| 12 | **Data caveat warning di Daily Picks** | 1 jam | Saat ini Daily Picks tampil dengan SR/SL/TP konkret tanpa disclaimer di card. Tambah footer "_Bukan rekomendasi jual/beli. Risiko investasi ditanggung sendiri._" sesuai POJK 5/2024. |

**Target selesai:** 2026-05-30 (1.5 minggu)

### 8.3 P1 — Performance & UX

| # | Item | Effort | Estimated impact |
|---|---|---|---|
| 13 | **Test coverage** | 2 minggu | Hanya 5 test file untuk 543 source. Target minimum: 80% line coverage di `lib/verdict`, `lib/elliott`, `lib/picks`, `lib/billing` (semua high-stake logic). Pakai Vitest yang sudah terkonfigurasi. |
| 14 | **Skeleton loading di semua halaman heavy** | 1 hari | Ticker page TTFB sudah 200ms dengan snapshot cache, tapi chart render masih 1-2s. Tambah skeleton supaya layout tidak shift. |
| 15 | **Image lazy loading + WebP conversion** | 4 jam | Logo emiten 940 PNG di-load via Google favicon (variable size). Pakai Next.js `<Image>` dengan `loading="lazy"` + AVIF output supaya bandwidth ~70% lebih kecil. |
| 16 | **Critical CSS extraction** | 1 hari | Tailwind v4 generate 87KB CSS di build. Kalau di-split per-route + inline critical, FCP turun ~200ms. |
| 17 | **Service Worker (PWA)** | 2 hari | App belum installable. PWA setup + offline cache untuk static assets bikin retention naik (industry data: +20% DAU di mobile). |
| 18 | **Prefetch tickers di hover Watchlist** | 2 jam | Hover state Watchlist row tidak prefetch detail page. Tambah `<Link prefetch>` atau manual `router.prefetch()` — UX feel "instant". |
| 19 | **Bundle analyzer audit + chunking** | 1 hari | `.next` build = 303 MB. Jalankan `ANALYZE=1 npm run build` (script sudah ada), identifikasi top 5 chunk besar, code-split via dynamic import. |
| 20 | **Mobile responsive audit** | 3 hari | Banyak halaman desktop-first (Dashboard, Compare, Backtest). Mobile breakpoint kadang scroll horizontal. Test 360x740 (Android entry) + 390x844 (iPhone 14). |

### 8.4 P2 — Fitur & Differensiasi

| # | Item | Effort | Note |
|---|---|---|---|
| 21 | **Bandarmology real data ingestion** | 1 minggu (blocked: vendor) | Foreign flow + broker summary masih placeholder. Negosiasi vendor (Invezgo / OHLC.dev) — quote Rp 8-15jt/bulan. Tanpa ini, NeoBDM tetap unggul. |
| 22 | **Real-time intraday quote 5-menit** | 1 minggu (blocked: vendor) | Sama vendor di atas. Saat ini hanya EoD. Trader aktif butuh ini. |
| 23 | **AI Copilot streaming markdown render** | 2 hari | Saat ini chat render markdown setelah final, bukan progressive. Pakai `react-markdown` dengan throttle 60ms untuk feel "ChatGPT-style". |
| 24 | **Onboarding tour first-time user** | 2 hari | Pakai library `intro.js` atau custom. Walkthrough 5 step: Watchlist → Ticker Detail → Copilot → Daily Picks → Subscription. Conversion trial→paid biasa naik 30%. |
| 25 | **In-app changelog notifier** | 1 hari | Last release notes belum di-surface ke user. Tambah toast "Apa yang baru" di navbar bell icon kalau ada CHANGELOG entry baru sejak last login. |
| 26 | **Search ticker dengan typo tolerance** | 1 hari | Saat ini exact match. Pakai PostgreSQL `pg_trgm` similarity → "BBR" → BBRI; "TLKOM" → TLKM. |
| 27 | **Telegram alert channel** | 3 hari | Email + in-app sudah ada. Telegram channel paling populer di komunitas trader ID. Bot token user-managed. |
| 28 | **Daily Picks public archive page** | 1 hari | `/picks/archive` — list semua daily picks bulan lalu dengan T+1/T+5/T+20 outcome. Transparency = trust = retention. SEO-friendly juga. |
| 29 | **Strategy marketplace (read-only beta)** | 1 minggu | Power user share backtested strategy → others fork. Network effect & content moat. NeoBDM tidak punya ini. |
| 30 | **Sector rotation alerts** | 4 jam | Existing RRG chart tapi belum ada alert "Sektor X masuk kuadran Leading". Tambah trigger di alert engine. |

### 8.5 P2 — Operasional

| # | Item | Effort | Detail |
|---|---|---|---|
| 31 | **Status page** | 1 hari | `status.nubuat.id` — auto-update dari uptime monitor (UptimeRobot / Better Stack free tier). Buat trust selama pre-product-market-fit. |
| 32 | **Sentry alerting routing** | 4 jam | Sentry sudah aktif tapi semua error masuk inbox biasa. Pisah by severity: Critical → Telegram/SMS, High → email, Low → digest harian. |
| 33 | **Cost dashboard granular** | 1 hari | Saat ini total DeepSeek cost di-track. Breakdown per-tier dan per-tool supaya tahu Pro user benefit-cost analysis. |
| 34 | **Daily picks evaluator harian otomatis** | 2 jam | Sudah ada lib `lib/picks/evaluator` tapi cron job belum aktif. Schedule BullMQ daily 16:30 WIB (post-market close). |
| 35 | **Email drip campaign trial → paid** | 3 hari | Trial 7 hari, tapi tidak ada email reminder D+3, D+5, D+7. Conversion lift typical 15-25%. |
| 36 | **Customer support inbox SLA tracker** | 1 hari | Inbox sudah ada (lib/support). Tambah SLA: respon Pro tier <2 jam, Free <24 jam. Visible ke user. |
| 37 | **Vendor failover untuk Yahoo Finance** | 4 jam | Single point of failure. Yahoo down → semua ticker page rusak. Implement fallback ke `lib/market-data/alpha-vantage.ts` (free tier 25 calls/day = cukup untuk emergency). |
| 38 | **Database query monitoring** | 4 jam | Pakai Drizzle logger atau pg_stat_statements untuk identify N+1 / slow query. Threshold: > 100ms p95. |
| 39 | **Lighthouse CI integrate ke GitHub Actions** | 2 jam | Sudah ada `.lighthouserc.json`. Tambah ke `.github/workflows/ci.yml` supaya PR yang regress performance gagal merge. |

### 8.6 P3 — Strategis / Long Bet

| # | Item | Effort | Note |
|---|---|---|---|
| 40 | **API publik (read-only) untuk Elite tier** | 1 bulan | Quote, screener result, daily picks via REST + API key. Lock-in untuk power user / quant trader. |
| 41 | **MetaTrader-style chart workspace** | 2 bulan | Multi-chart, split layout, drawing tools. Banyak trader migrasi karena UX ini lebih nyaman. |
| 42 | **Akademi (in-app course)** | 2 bulan | 6 modul beginner → intermediate. Recurring revenue dari course sale + entry funnel untuk subscription. |
| 43 | **Crypto IDX/Crypto Indo coverage** | 1 bulan | Tambah Pintu/Tokocrypto data, sentiment & screener. Audience overlap dengan trader saham retail. |
| 44 | **Region expansion: MY/SG screen** | 3 bulan | KLSE & SGX punya struktur mirip BEI. Reuse engine. |

### 8.7 Gap Compliance / Risiko Hukum

| # | Item | Status | Action |
|---|---|---|---|
| 45 | OJK lisensi Penasihat Investasi | Belum diurus | Konsultasi PK Legal Q3 2026. Sambil tunggu, rebrand "Daily Picks" → "Ide Trading" lebih aman. |
| 46 | UU PDP — Data export & deletion user | Belum implement | Endpoint `/api/account/export` (JSON dump semua data) + `/api/account/delete` (soft delete + 30-day grace). |
| 47 | Cookie consent banner | Tidak ada | Wajib untuk EU + best practice ID. PostHog, Sentry, GA cookies butuh consent. |
| 48 | KYC light untuk trial-fraud prevention | Tidak ada | User bisa bikin email throwaway terus dapat 7-day trial repeated. Mitigation: phone OTP / device fingerprint. |
| 49 | Terms of Service & Privacy Policy versioning | Sudah versi v1 | Pakai version flag — user re-accept kalau version bump. Sudah ada schema, perlu UI flow. |

### 8.8 Quick Wins (< 2 jam masing-masing, total 1 hari)

1. **Favicon resolution upgrade** — saat ini 32x32, ganti ke 192 + 512 untuk Android PWA install icon
2. **Open Graph image dynamic** — pakai `next/og` generate OG image per-ticker
3. **`robots.txt` allow research page tapi disallow admin**
4. **Sitemap.xml prioritize ticker + research pages**
5. **404 page custom** dengan link ke screener
6. **Loading bar global** pakai `next-nprogress-bar`
7. **Dark mode default detection** dari `prefers-color-scheme`
8. **Keyboard shortcut hint di Command Palette** — "Cmd+K" tooltip
9. **Sticky CTA "Mulai Trial" di mobile** untuk halaman /features dan /pricing
10. **Footer year auto** (jangan hardcode 2026 → pakai `new Date().getFullYear()`)

### 8.9 Prioritization Heatmap

```
                  Effort →
                  Low (≤4j) │ Medium (1-3d) │ High (>1w)
Impact High    │  1, 2, 3   │  5, 7, 14, 24 │  13, 21, 22
       Medium  │ 12, 18, 26 │  15, 17, 27   │  29, 41, 42
       Low     │ 4, 10, 30  │  16, 23, 32   │  40, 43, 44
```

**Aksi minggu ini (5 hari kerja, ±40 jam):**
- Hari 1: P0 batch (#1-6) — 12 jam total
- Hari 2: Email verification + payment webhook test (#2, #9) — 8 jam
- Hari 3: Audit log + Daily Picks disclaimer + Rate limit IP (#8, #10, #12) — 8 jam
- Hari 4: Quick wins batch (#8.8 semua) — 8 jam
- Hari 5: Test coverage push untuk `lib/verdict` + `lib/billing` (#13 partial) — 8 jam

Estimasi total: 44 jam = 1 sprint solo, atau 2 hari kalau ada 3 developer pair.

---

**Catatan untuk diri sendiri:** Setelah item P0 + P1 selesai (target akhir Mei 2026), ini siap launch ke 500 closed beta. Item P2 dijalankan paralel sambil kumpulkan data DAU/retention untuk validasi prioritas P3 strategis.
