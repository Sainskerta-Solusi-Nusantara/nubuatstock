# Progress Report — Nubuat

> **Living document** untuk tracking eksekusi Nubuat dari M0 (Discovery) sampai M24 (Ecosystem). Update setiap minggu. Acuan strategis: `ANALISIS_APLIKASI_SAHAM.md`.

---

## 0. Document Header

| Field | Value |
|---|---|
| **Version** | v0.6 |
| **Last updated** | 15 Jun 2026 |
| **Owner** | dobeon.com@gmail.com (Founder/CEO/PM) |
| **Cadence** | Weekly update (setiap Jumat 17:00 WIB) |
| **Sumber** | `ANALISIS_APLIKASI_SAHAM.md`, `PLAN_UIUX_WIREFRAME.md` |
| **Tier pricing** | Free · Starter (Rp 99k) · Pro (Rp 299k) · Elite (Rp 899k) |

### Status Legenda

| Icon | Meaning |
|---|---|
| 🟢 | Done — selesai, verified, deployed |
| 🟡 | In progress — sedang dikerjakan |
| 🔴 | Blocked — terhenti karena dependency/issue |
| ⚪ | Not started — belum dimulai |
| 🔵 | Deferred — sengaja ditunda ke phase berikutnya |
| ⚫ | Cancelled — keputusan untuk tidak dilanjutkan |

### Cara Update

1. Buka section yang relevan.
2. Ubah status icon (🟢/🟡/🔴/⚪/🔵/⚫).
3. Tambah catatan singkat di kolom *Notes*.
4. Update `Last updated` di header.
5. Tambah entry di **Section 11 (Weekly Status Update)**.
6. Bump version dan log di **Section 13 (Changelog)**.

---

## 1. Executive Status Snapshot

| Metric | Value |
|---|---|
| **Current phase** | M0–M3 — MVP build / pre-closed-beta hardening |
| **Phase progress** | **MVP build ~94%** · **Closed-beta launch-readiness ~90%** (per 11 Jun 2026) |
| **North Star: Weekly Active Trader (WAT)** | 0 (target M6: 500, M12: 6.000, M24: 32.000) |
| **MRR** | Rp 0 (target M6: Rp 52 jt, M12: Rp 396 jt, M24: Rp 1,56 Mrd) |
| **Paid users** | 0 (target M6: 290, M12: 2.180, M24: 7.850) |
| **Free users** | 0 (target M6: 5.000, M12: 25.000, M24: 80.000) |
| **Runway** | TBD (pending pre-seed funding) |
| **Team size** | 1 (Founder solo) — hiring 4 untuk M0 closure |
| **Biggest win this week** | Prod LIVE (login/glossary/about 200, env-fallback Neon-Vercel + better-auth secret fixed). DB prod ter-migrate + seed penuh: **fundamentals 965/980** (db:enrich), **798 logo self-host** di Vercel Blob (logos:sync), glossary, tiers, copy/tagline. **220 berita** + sentiment. Search ticker menonjol di menu utama mobile (analisis utama). SEO per-halaman (generateMetadata + OG + JSON-LD), mobile responsive 13 halaman, nada "kamu" full-sweep, BuildInfo (versi+waktu deploy) di dashboard. |
| **Biggest risk this week** | (1) **Worker BullMQ belum di-deploy** ke Railway/Render → cron prod (EOD, news, picks, sentiment) belum auto-jalan; data terisi tapi belum self-refresh. (2) Vendor data bandarmology/real-time belum dikontrak (blokir L2 — broker/foreign flow). (3) Resend API key + Google OAuth belum di-set di prod (signup jalan tanpa email-verify gate; Google login nonaktif sampai creds di-set). (4) Test coverage masih rendah. |
| **Next milestone** | Closed beta 500 user — sisa (aksi founder): deploy worker (`WORKER_DEPLOY.md`), set Resend + Google OAuth via `/admin/integrations`, keputusan vendor data, naikkan test coverage. Build & data prod sudah siap. |

---

## 2. Milestone Tracker (M0 → M24)

### M0–M3: MVP (Discovery → Beta Private) — *Closed Beta 500 user*

**Status:** 🟡 In progress (5%)

**Goals:**
- Bangun MVP single-canvas dengan Daily Picks + Bandarmology basic + AI Copilot.
- Universe IDX80 (80 ticker liquid).
- Closed beta 500 user via waitlist.
- Validate core hypothesis: trader retail bersedia bayar Rp 99k untuk kompresi multi-lens + AI.

**Deliverables checklist:**

- [ ] ⚪ Pre-seed funding USD 300–500k closed
- [ ] ⚪ Co-founder/Tech lead hire
- [ ] ⚪ Hire 2 Backend Engineer
- [ ] ⚪ Hire 2 Frontend Engineer
- [ ] ⚪ Hire 1 Designer (Product + UX)
- [ ] ⚪ Hire 1 Data Engineer
- [ ] ⚪ Legal counsel onboard (pasar modal advisor)
- [ ] ⚪ Vendor data signed (Invezgo + OHLC.dev contract)
- [ ] 🟡 Strategic discovery doc v0.1 (selesai)
- [ ] 🟡 Design plan v0.1 (selesai)
- [ ] ⚪ User research: 30 interview trader retail
- [ ] ⚪ Brand identity (logo, color, type) finalized
- [ ] ⚪ Figma design system v1 (foundations + components)
- [ ] ⚪ High-fi prototype 3 critical flow
- [ ] ⚪ Usability test 30 user (5 persona × 6)
- [ ] ⚪ Tech architecture spike: Next.js 15 + Go + QuestDB
- [ ] ⚪ Data ingest pipeline IDX80 EoD historical
- [ ] ⚪ Auth (email + Google OAuth)
- [ ] ⚪ Watchlist v1
- [ ] ⚪ Ticker page basic (Overview + Technical chart)
- [ ] ⚪ Bandarmology basic (D-1 broker summary, daily foreign flow)
- [ ] ⚪ Daily Picks v1 rule-based engine
- [ ] ⚪ AI Copilot Q&A basic (Anthropic Claude Sonnet 4.6 integration)
- [ ] ⚪ Onboarding wizard 4-step
- [ ] ⚪ Closed beta waitlist landing page
- [ ] ⚪ Discord community setup
- [ ] ⚪ 500 beta users invited
- [ ] ⚪ Analytics setup (PostHog, Sentry)
- [ ] ⚪ Beta feedback synthesis report

**Success criteria:**
- 500 beta users onboarded, ≥40% Weekly Active.
- Median session duration ≥8 menit.
- Daily Picks hit rate (TP1 before SL, walk-forward) ≥50% pada test data.
- NPS ≥30 dari beta cohort.

**Dependencies:**
- Funding (blocking semua hiring).
- Vendor data contract.
- Legal opinion untuk positioning *educational tool*.

**Risks:**
- Funding delay → MVP slip.
- Vendor data quality issue (broker summary lag, missing ticker).
- Daily Picks hit rate <50% → core value prop weak.

---

### M3–M6: Beta Public (Launch Starter Tier)

**Status:** ⚪ Not started

**Goals:**
- Launch publik dengan Starter tier (Rp 99k/bulan).
- Expand universe ke IDX Composite top 300.
- Activate payment gateway (Midtrans recurring).
- 1.000 free user, 100 paid (target end of M6).

**Deliverables checklist:**

- [ ] ⚪ Universe expand IDX Composite top 300
- [ ] ⚪ Full TA (150 indikator)
- [ ] ⚪ Brokermology v1 (broker concentration, lead-lag basic)
- [ ] ⚪ Daily Picks intraday refresh (15 menit cadence)
- [ ] ⚪ Research Aggregator v1 (5 sekuritas + 3 media)
- [ ] ⚪ PDF parser pipeline (pdfplumber + Tesseract + LLM extraction)
- [ ] ⚪ Alerts system multi-channel (push, email)
- [ ] ⚪ Backtest no-code basic (3 strategy slot)
- [ ] ⚪ Mobile companion app (React Native + Expo, iOS + Android)
- [ ] ⚪ Push notification infrastructure (FCM + APNs)
- [ ] ⚪ Midtrans recurring integration
- [ ] ⚪ Pricing page + checkout flow
- [ ] ⚪ Free trial 7-day mechanism
- [ ] ⚪ Subscription management UI (cancel, upgrade, switch)
- [ ] ⚪ Referral program v1
- [ ] ⚪ Email marketing automation (Daily Brief 06:30 WIB)
- [ ] ⚪ Discord/Telegram premium channel
- [ ] ⚪ Help center & FAQ (50+ articles)
- [ ] ⚪ Customer Success process documented

**Success criteria:**
- 1.000 free, 100 paid (target).
- Free → Paid conversion ≥3% (target ≥4% mature).
- D7 retention ≥35%, D30 ≥20%.
- Daily Picks hit rate ≥55% (TP1 before SL).

**Dependencies:**
- M0 MVP success.
- Beta feedback iteration.

**Risks:**
- Conversion <3% → pricing/value mismatch.
- Mobile App Store review delays.
- PDF parser accuracy <80% → research quality issue.

---

### M6–M9: GA + Pro Tier

**Status:** ⚪ Not started

**Goals:**
- General Availability, launch Pro tier (Rp 299k).
- Universe expand ke ALL listed (±945 ticker).
- Desktop app (Tauri) launch.
- Apply Penasihat Investasi license.
- 5.000 free, 500 paid (combine Starter + Pro).

**Deliverables checklist:**

- [ ] ⚪ Universe ALL listed (±945)
- [ ] ⚪ Papan Pemantauan Khusus risk flagging
- [ ] ⚪ Pro tier features bundle
- [x] 🟢 Multi-chart workspace (Terminal Pro, grid 1/2/4)
- [x] 🟢 Workspace save/share via URL (?ws=base64)
- [ ] ⚪ Command palette `Cmd+K`
- [x] 🟢 Bloomberg-style function codes (DES/FA/GIP/EQS/RV/BMAP)
- [ ] ⚪ Desktop app (Tauri 2.0 — Win/Mac/Linux)
- [ ] ⚪ Strategy marketplace beta (read-only browse)
- [x] 🟢 Backtest advanced (walk-forward + Monte Carlo)
- [x] 🟢 AI Buddy v1.5 (tool use + inline citations)
- [ ] ⚪ Research Aggregator expand (10 sekuritas + 6 media + IDX filing)
- [ ] ⚪ Penasihat Investasi license application submitted
- [ ] ⚪ Compliance audit (UU PDP, POJK 32/2025)
- [ ] ⚪ ISO 27001 SOC 2 prep
- [ ] ⚪ Status page (status.nubuat.id) launched
- [ ] ⚪ SLA 99.9% during market hours

**Success criteria:**
- 5.000 free, 500 paid.
- Pro tier conversion ≥20% from Starter.
- p95 real-time tick latency <500ms.
- Uptime ≥99.9% market hours.

**Dependencies:**
- Penasihat Investasi license advisory.
- Data quality cross-check infra.

**Risks:**
- License application rejected/delayed.
- Universe expansion → data quality issue.
- Pro tier features overlap with Starter → cannibalization.

---

### M9–M12: Elite + Scale

**Status:** ⚪ Not started

**Goals:**
- Launch Elite tier (Rp 899k) dengan L2 depth, intraday foreign flow 5m, AI Opus mode, API access.
- Migrate ke IDX direct data feed.
- Education academy launch.
- 15.000 free, 1.500 paid.

**Deliverables checklist:**

- [ ] ⚪ IDX Direct Data Feed contract signed
- [ ] ⚪ Migrate from vendor to direct feed (parallel run 4 weeks)
- [ ] ⚪ L2 depth feed integration
- [ ] ⚪ Intraday foreign flow 5m
- [x] 🟢 AI Buddy v2 (Deep Mode: multi-step agentic, Elite-gated)
- [x] 🟢 Paper Trading (virtual Rp 100jt + slippage 15bps)
- [ ] ⚪ Strategy Marketplace v1 (publish, ratings)
- [ ] ⚪ API access (read-only, rate-limited per tier)
- [ ] ⚪ Concierge onboarding (Elite white-glove)
- [ ] ⚪ Akademi Nubuat launch (3 kursus initial)
- [x] 🟢 Hall of Fame leaderboard (/leaderboard + snapshot harian)
- [ ] ⚪ WhatsApp Business API alerts (Pro+)
- [ ] ⚪ Multi-monitor support (Tauri detach pane)
- [ ] ⚪ Backtest scriptable (Python/Pine-like DSL)
- [ ] ⚪ Anomaly detection alert (volume + flow outliers)

**Success criteria:**
- 15.000 free, 1.500 paid.
- MRR Rp 396 jt (ARR Rp 4,75 Mrd).
- Elite tier 80+ active.
- Akademi enrollment ≥20% paid users.
- LTV/CAC ≥3:1.

**Dependencies:**
- IDX license approval (procurement timeline 3–4 bulan).
- Penasihat Investasi license granted.

**Risks:**
- IDX license cost overruns.
- Strategy marketplace abuse (pump-dump).
- API misuse (scraping).

---

### M12–M18: Multi-Asset

**Status:** ⚪ Not started

**Goals:**
- Expand asset class: obligasi, ETF, reksadana, waran terstruktur.
- International ticker (US, regional ASEAN — diversifikasi).
- Institutional tier launch (custom Rp 25 jt+/bulan).

**Deliverables checklist:**

- [ ] ⚪ Bond data feed (SBN, korporasi)
- [ ] ⚪ ETF coverage (semua ETF listed BEI)
- [ ] ⚪ Reksadana data + comparator
- [ ] ⚪ Waran terstruktur (HSBC, JP Morgan, etc)
- [ ] ⚪ Multi-asset portfolio aggregation
- [ ] ⚪ US ticker coverage (top 500)
- [ ] ⚪ ASEAN ticker (SGX, KLSE, SET, HOSE) — basic data
- [ ] ⚪ FX cross-rate display
- [ ] ⚪ Institutional tier landing & sales process
- [ ] ⚪ White-label option (custom domain, theming)
- [ ] ⚪ Multi-seat team management
- [ ] ⚪ SSO (SAML/OIDC) for enterprise
- [ ] ⚪ Custom data feed integration (enterprise)
- [ ] ⚪ Dedicated CSM for institutional accounts
- [ ] ⚪ Audit trail & compliance reporting

**Success criteria:**
- 30.000 free, 3.500 paid.
- 5 institutional contracts signed (target Rp 1,2 Mrd ARR institutional).
- Multi-asset DAU usage ≥15% of active users.

**Dependencies:**
- Bond data vendor (PHEI, IBPA).
- International data vendor.
- Enterprise sales hire.

**Risks:**
- Bond data licensing expensive.
- Institutional sales cycle long (6–12 bulan).

---

### M18–M24: Ecosystem

**Status:** ⚪ Not started

**Goals:**
- Strategy marketplace open (revenue share 70/30).
- Broker integration (OAuth Stockbit/Mirae/IPOT untuk portfolio sync & potential auto-execute).
- API public dengan developer plan.
- Ekspansi regional: Singapore, Malaysia, Thailand, Vietnam.

**Deliverables checklist:**

- [ ] ⚪ Strategy marketplace open + monetization
- [ ] ⚪ Strategy author payout system (revenue share)
- [ ] ⚪ Anti-fraud strategy verification
- [ ] ⚪ Broker integration: Stockbit
- [ ] ⚪ Broker integration: Mirae HOTS
- [ ] ⚪ Broker integration: Indo Premier IPOT
- [ ] ⚪ Portfolio sync auto from broker (read-only initial)
- [ ] ⚪ Public API developer portal
- [ ] ⚪ Developer plan tier (Rp 1,5jt/bulan, 100k req/day)
- [ ] ⚪ API rate limiting & metering
- [ ] ⚪ Singapore launch (SGX coverage, en-SG localization)
- [ ] ⚪ Malaysia launch (KLSE, BM, MYR)
- [ ] ⚪ Thailand launch (SET, THB)
- [ ] ⚪ Vietnam launch (HOSE, VND)
- [ ] ⚪ Regional payment gateway integration
- [ ] ⚪ Multi-currency billing
- [ ] ⚪ Series A funding round closed (target USD 8–15M)

**Success criteria:**
- 80.000 free, 8.000 paid (Indonesia).
- 10.000 paid regional.
- MRR Rp 1,56 Mrd Indonesia + Rp 600jt regional.
- Marketplace 100+ published strategies, 30% revenue share contribution.

**Dependencies:**
- Broker partnership BD.
- Regional regulatory survey.
- Series A close.

**Risks:**
- Regional competition (e.g., Smartkarma, Pickyourtrade).
- Broker integration blocked (no OAuth).
- Regulatory complexity multi-country.

---

## 3. Workstream Status

### 3.1 Product & Design

| Field | Value |
|---|---|
| **Lead** | Founder (PM) + Designer (TBD) |
| **Current sprint** | Sprint 0 — Discovery (Week 1–2) |
| **Last sprint output** | Strategic doc v0.1, Design plan v0.1, IA & wireframe (ASCII) |
| **Next sprint plan** | User interview script + recruitment, brand exploration, Figma design system foundations |
| **Blocker** | Designer belum hired |

### 3.2 Frontend Engineering

| Field | Value |
|---|---|
| **Lead** | TBD (target hire M0.2) |
| **Current sprint** | — |
| **Last sprint output** | — |
| **Next sprint plan** | Setup Next.js 15 monorepo (Turborepo), Tailwind v4, shadcn/ui baseline; spike Lightweight Charts integration |
| **Blocker** | No engineer hired yet |

### 3.3 Backend Engineering

| Field | Value |
|---|---|
| **Lead** | TBD (target hire M0.2) |
| **Current sprint** | — |
| **Last sprint output** | — |
| **Next sprint plan** | Go API skeleton (Fiber), Postgres schema (User, Subs, Watchlist), QuestDB OHLCV ingest spike, NATS JetStream pub/sub |
| **Blocker** | No engineer hired yet |

### 3.4 Data Engineering & ML

| Field | Value |
|---|---|
| **Lead** | TBD (target hire M0.2 + 1 ML hire M3) |
| **Current sprint** | — |
| **Last sprint output** | — |
| **Next sprint plan** | Vendor evaluation (Invezgo + OHLC.dev), ingest spike IDX80 EoD historical, regime classifier baseline |
| **Blocker** | Vendor contract pending |

### 3.5 Security & Compliance

| Field | Value |
|---|---|
| **Lead** | Founder + advisor (Hadiputranto Hadinoto / Assegaf Hamzah) |
| **Current sprint** | Legal opinion request |
| **Last sprint output** | — |
| **Next sprint plan** | Engage law firm; UU PDP gap analysis; Penasihat Investasi pre-application research |
| **Blocker** | Legal counsel selection |

### 3.6 Marketing & Growth

| Field | Value |
|---|---|
| **Lead** | Founder (interim) → Growth Lead M3 |
| **Current sprint** | Brand naming exploration |
| **Last sprint output** | Domain `nubuat.id` checked; brand name shortlist |
| **Next sprint plan** | Brand identity brief; landing page wireframe; SEO keyword research; Stockbit/Telegram community mapping |
| **Blocker** | Brand identity in design phase |

### 3.7 Customer Success

| Field | Value |
|---|---|
| **Lead** | TBD (M6 hire) |
| **Current sprint** | — |
| **Last sprint output** | — |
| **Next sprint plan** | Help center IA, FAQ draft, support ticket tool eval (Intercom/Plain) |
| **Blocker** | Not yet hired |

### 3.8 Operations & Finance

| Field | Value |
|---|---|
| **Lead** | Founder |
| **Current sprint** | Pre-seed deck preparation |
| **Last sprint output** | Budget projection, hiring plan |
| **Next sprint plan** | Pitch deck v1, investor list (East Ventures, AC Ventures, Alpha JWC, Init-6, Kopital), legal entity setup (PT) |
| **Blocker** | Fundraising in progress |

---

## 4. Feature Status Matrix

Status code per fase: 🟢 (done) 🟡 (in progress) ⚪ (not started) 🔵 (deferred) 🔴 (blocked) ⚫ (cancelled).

| # | Feature | Tier | M0 | M3 | M6 | M9 | M12 | M18 | M24 | Owner | Notes |
|---|---|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|---|---|
| 1 | Auth (email + OAuth Google/Apple) | All | ⚪ | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | BE | Magic link M3 |
| 2 | Onboarding wizard 4-step | All | ⚪ | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | Design | Persona-based |
| 3 | Dashboard home | All | ⚪ | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | FE | Daily Brief + picks + watchlist |
| 4 | Daily Picks Engine v1 (rule-based) | Starter+ | ⚪ | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | Data | 5/hari rule-based M0 |
| 5 | Daily Picks intraday refresh (15m) | Starter+ | 🔵 | ⚪ | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | Data | M3 |
| 6 | Daily Picks confidence + hit rate | Starter+ | ⚪ | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | Data | Historical track |
| 7 | Watchlist v1 (10 ticker Free) | All | ⚪ | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | BE | Quota by tier |
| 8 | Watchlist folder & sort | All | 🔵 | ⚪ | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | FE | M3 |
| 9 | Ticker page Overview | All | ⚪ | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | FE | 7 tabs |
| 10 | Technical chart (Lightweight Charts) | All | ⚪ | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | FE | Free=20 indikator |
| 11 | Technical full 150 indicators | Starter+ | 🔵 | ⚪ | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | FE | M3 |
| 12 | Pattern recognition ML | Pro+ | 🔵 | 🔵 | ⚪ | 🟢 | 🟢 | 🟢 | 🟢 | ML | M6 |
| 13 | Multi-timeframe dashboard | Pro+ | 🔵 | 🔵 | ⚪ | 🟢 | 🟢 | 🟢 | 🟢 | FE | M6 |
| 14 | Custom indicator language (Pine-like) | Elite | 🔵 | 🔵 | 🔵 | ⚪ | 🟢 | 🟢 | 🟢 | FE+BE | M12 |
| 15 | Fundamental basic (last year + ratio) | All | ⚪ | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | BE | All ratio |
| 16 | Fundamental 10-year history | Pro+ | 🔵 | 🔵 | ⚪ | 🟢 | 🟢 | 🟢 | 🟢 | Data | Quarterly+annual |
| 17 | Fundachart compare | Pro+ | 🔵 | 🔵 | ⚪ | 🟢 | 🟢 | 🟢 | 🟢 | FE | Peer overlay |
| 18 | DCF/DDM/RV/Reverse-DCF builder | Pro+ | 🔵 | 🔵 | ⚪ | 🟢 | 🟢 | 🟢 | 🟢 | BE+ML | Adjustable WACC |
| 19 | Earnings surprise tracker | Pro+ | 🔵 | 🔵 | ⚪ | 🟢 | 🟢 | 🟢 | 🟢 | Data | Quarterly |
| 20 | Dividend tracker + projection | Pro+ | 🔵 | 🔵 | ⚪ | 🟢 | 🟢 | 🟢 | 🟢 | Data | Bayesian |
| 21 | Corporate action calendar | All | ⚪ | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | Data | Split, RUPS |
| 22 | Insider & related party | Pro+ | 🔵 | 🔵 | ⚪ | 🟢 | 🟢 | 🟢 | 🟢 | Data | KSEI scrape |
| 23 | Bandarmology Broker Detector (D-1) | Starter+ | ⚪ | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | Data | D-1 EoD |
| 24 | Foreign Flow daily | All | ⚪ | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | Data | EoD |
| 25 | Foreign Flow intraday 1H | Pro+ | 🔵 | ⚪ | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | Data | M3 |
| 26 | Foreign Flow intraday 5m | Elite | 🔵 | 🔵 | 🔵 | ⚪ | 🟢 | 🟢 | 🟢 | Data | M9 (IDX direct) |
| 27 | Volume spike z-score | Starter+ | ⚪ | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | Data | Anomaly tag |
| 28 | ADL / OBV / CMF / MFI | Starter+ | ⚪ | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | Data | Classic |
| 29 | Bid-Offer Imbalance (L2) | Elite | 🔵 | 🔵 | 🔵 | ⚪ | 🟢 | 🟢 | 🟢 | Data | M9 L2 feed |
| 30 | Smart vs Dumb Money divergence | Pro+ | 🔵 | 🔵 | ⚪ | 🟢 | 🟢 | 🟢 | 🟢 | Data | Top broker proxy |
| 31 | Bandar Phase Tagger (Wyckoff) | Pro+ | 🔵 | 🔵 | ⚪ | 🟢 | 🟢 | 🟢 | 🟢 | ML | Auto-label |
| 32 | Brokermology Top 10 buyer/seller | Pro+ | 🔵 | ⚪ | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | Data | M3 |
| 33 | Broker Concentration HHI | Pro+ | 🔵 | 🔵 | ⚪ | 🟢 | 🟢 | 🟢 | 🟢 | Data | M6 |
| 34 | Broker Lead-Lag Network graph | Pro+ | 🔵 | 🔵 | ⚪ | 🟢 | 🟢 | 🟢 | 🟢 | FE+Data | D3.js graph |
| 35 | Broker Performance Track Record | Pro+ | 🔵 | 🔵 | ⚪ | 🟢 | 🟢 | 🟢 | 🟢 | Data | Historical T+5/T+20 |
| 36 | Broker Cluster Analysis | Pro+ | 🔵 | 🔵 | ⚪ | 🟢 | 🟢 | 🟢 | 🟢 | ML | k-means |
| 37 | Macro Dashboard Indonesia | All | ⚪ | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | Data | BI Rate, kurs |
| 38 | Global Macro overlay | Starter+ | 🔵 | ⚪ | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | Data | Fed, DXY, commodities |
| 39 | News sentiment (IndoBERT+LLM) | Starter+ | 🔵 | ⚪ | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | ML | M3 |
| 40 | Social sentiment (Stockbit, X) | Pro+ | 🔵 | 🔵 | ⚪ | 🟢 | 🟢 | 🟢 | 🟢 | ML | Ethical scrape |
| 41 | Fear & Greed Index Indonesia | All | 🔵 | 🔵 | ⚪ | 🟢 | 🟢 | 🟢 | 🟢 | Data | Composite |
| 42 | Event calendar (RUPS, FOMC, CPI) | All | ⚪ | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | Data | Global+local |
| 43 | AI Copilot Q&A basic | All | 🟡 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | ML | Sonnet 4.6 |
| 44 | AI Copilot tool use + citation | All | 🔵 | ⚪ | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | ML | M3 |
| 45 | AI Copilot Opus mode (deep research) | Elite | 🔵 | 🔵 | 🔵 | ⚪ | 🟢 | 🟢 | 🟢 | ML | M9 |
| 46 | AI Copilot rate limits per tier | All | ⚪ | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | BE | 5/50/500/∞ |
| 47 | Research Aggregator (5 sekuritas + 3 media) | Pro+ | 🔵 | ⚪ | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | Data | M3 PDF parse |
| 48 | Research Aggregator full (15 sekuritas + 8 media + IDX filing) | Pro+ | 🔵 | 🔵 | ⚪ | 🟢 | 🟢 | 🟢 | 🟢 | Data | M6 expand |
| 49 | Research AI Synthesis | Pro+ | 🔵 | ⚪ | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | ML | M3 |
| 50 | Consensus rating + target chart | Pro+ | 🔵 | ⚪ | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | Data | M3 |
| 51 | Backtest no-code basic (3 strategy slot) | Pro | 🔵 | ⚪ | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | BE | M3 |
| 52 | Backtest advanced (walk-forward, MC) | Pro+ | 🔵 | 🔵 | ⚪ | 🟢 | 🟢 | 🟢 | 🟢 | BE | M6 |
| 53 | Backtest scriptable Python/Pine-like | Elite | 🔵 | 🔵 | 🔵 | ⚪ | 🟢 | 🟢 | 🟢 | BE | M9 |
| 54 | Paper Trading | Elite | 🔵 | 🔵 | 🔵 | ⚪ | 🟢 | 🟢 | 🟢 | BE | M9 |
| 55 | Strategy Marketplace browse | Elite | 🔵 | 🔵 | 🔵 | ⚪ | 🟢 | 🟢 | 🟢 | BE | M9 |
| 56 | Strategy Marketplace publish + monetize | Elite | 🔵 | 🔵 | 🔵 | 🔵 | 🔵 | ⚪ | 🟢 | BE | M18 |
| 57 | Portfolio tracker manual | Starter+ | 🔵 | ⚪ | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | BE | M3 |
| 58 | Portfolio import from broker | All | 🔵 | 🔵 | 🔵 | 🔵 | 🔵 | ⚪ | 🟢 | BE | M18 OAuth |
| 59 | Alerts (price, volume, technical) | Starter+ | 🔵 | ⚪ | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | BE | M3 |
| 60 | Alerts multi-channel (push+email) | All | 🔵 | ⚪ | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | BE | M3 |
| 61 | Alerts WhatsApp + Telegram | Pro+ | 🔵 | 🔵 | ⚪ | 🟢 | 🟢 | 🟢 | 🟢 | BE | M6 |
| 62 | Screener basic (preset) | All | ⚪ | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | FE+Data | All ticker |
| 63 | Screener natural language (AI) | Pro+ | 🔵 | 🔵 | ⚪ | 🟢 | 🟢 | 🟢 | 🟢 | ML | M6 |
| 64 | Workspace multi-pane | Pro+ | 🔵 | 🔵 | ⚪ | 🟢 | 🟢 | 🟢 | 🟢 | FE | M6 drag-resize |
| 65 | Workspace save/share via URL | Pro+ | 🔵 | 🔵 | ⚪ | 🟢 | 🟢 | 🟢 | 🟢 | FE | M6 |
| 66 | Command palette `Cmd+K` | All | 🔵 | ⚪ | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | FE | M3 |
| 67 | Function code interface (Bloomberg-style) | Pro+ | 🔵 | 🔵 | ⚪ | 🟢 | 🟢 | 🟢 | 🟢 | FE | M6 |
| 68 | Hotkey help overlay (`?`) | All | 🔵 | ⚪ | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | FE | M3 |
| 69 | Mobile iOS app | Starter+ | 🔵 | ⚪ | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | FE | RN+Expo M3 |
| 70 | Mobile Android app | Starter+ | 🔵 | ⚪ | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | FE | RN+Expo M3 |
| 71 | Desktop Tauri app (Win/Mac/Linux) | Pro+ | 🔵 | 🔵 | ⚪ | 🟢 | 🟢 | 🟢 | 🟢 | FE | M6 |
| 72 | Push notification infra (FCM+APNs) | Starter+ | 🔵 | ⚪ | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | BE | M3 |
| 73 | API access (read-only) | Elite | 🔵 | 🔵 | 🔵 | ⚪ | 🟢 | 🟢 | 🟢 | BE | M9 |
| 74 | Akademi Nubuat (kursus) | Tier-locked | 🔵 | 🔵 | 🔵 | ⚪ | 🟢 | 🟢 | 🟢 | Content | M9 |
| 75 | Daily Brief Newsletter | All | 🔵 | ⚪ | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | Content | M3 06:30 WIB |
| 76 | Discord/Telegram premium | Starter+ | 🔵 | ⚪ | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | Community | M3 |
| 77 | Hall of Fame leaderboard | Elite | 🔵 | 🔵 | 🔵 | ⚪ | 🟢 | 🟢 | 🟢 | BE | M9 |
| 78 | Multi-asset: Bonds | All | 🔵 | 🔵 | 🔵 | 🔵 | 🔵 | ⚪ | 🟢 | Data | M12 |
| 79 | Multi-asset: ETF | All | 🔵 | 🔵 | 🔵 | 🔵 | 🔵 | ⚪ | 🟢 | Data | M12 |
| 80 | Multi-asset: Reksadana | All | 🔵 | 🔵 | 🔵 | 🔵 | 🔵 | ⚪ | 🟢 | Data | M12 |
| 81 | Multi-asset: Waran terstruktur | All | 🔵 | 🔵 | 🔵 | 🔵 | 🔵 | ⚪ | 🟢 | Data | M12 |
| 82 | International: US ticker | Starter+ | 🔵 | 🔵 | 🔵 | 🔵 | 🔵 | ⚪ | 🟢 | Data | M12 |
| 83 | International: ASEAN ticker | Starter+ | 🔵 | 🔵 | 🔵 | 🔵 | 🔵 | ⚪ | 🟢 | Data | M12 |
| 84 | Institutional / Team tier | Custom | 🔵 | 🔵 | 🔵 | 🔵 | 🔵 | ⚪ | 🟢 | Sales | M12 |
| 85 | White-label option | Custom | 🔵 | 🔵 | 🔵 | 🔵 | 🔵 | ⚪ | 🟢 | BE | M12 |
| 86 | SSO (SAML/OIDC) enterprise | Custom | 🔵 | 🔵 | 🔵 | 🔵 | 🔵 | ⚪ | 🟢 | BE | M12 |
| 87 | Broker integration: Stockbit | All | 🔵 | 🔵 | 🔵 | 🔵 | 🔵 | 🔵 | ⚪ | BE | M18 OAuth |
| 88 | Broker integration: Mirae HOTS | All | 🔵 | 🔵 | 🔵 | 🔵 | 🔵 | 🔵 | ⚪ | BE | M18 |
| 89 | Broker integration: IPOT | All | 🔵 | 🔵 | 🔵 | 🔵 | 🔵 | 🔵 | ⚪ | BE | M18 |
| 90 | Public API developer plan | Custom | 🔵 | 🔵 | 🔵 | 🔵 | 🔵 | 🔵 | ⚪ | BE | M18 |
| 91 | Regional Singapore launch | All | 🔵 | 🔵 | 🔵 | 🔵 | 🔵 | 🔵 | ⚪ | All | M18 |
| 92 | Regional Malaysia launch | All | 🔵 | 🔵 | 🔵 | 🔵 | 🔵 | 🔵 | ⚪ | All | M18 |
| 93 | Regional Thailand launch | All | 🔵 | 🔵 | 🔵 | 🔵 | 🔵 | 🔵 | ⚪ | All | M18 |
| 94 | Regional Vietnam launch | All | 🔵 | 🔵 | 🔵 | 🔵 | 🔵 | 🔵 | ⚪ | All | M18 |
| 95 | Real-time tick latency <500ms p95 | Infra | 🔵 | ⚪ | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | BE+Infra | M3 SLA |
| 96 | Uptime ≥99.9% market hours | Infra | 🔵 | 🔵 | ⚪ | 🟢 | 🟢 | 🟢 | 🟢 | DevOps | M6 |

---

## 5. KPI Tracker

### 5.1 Acquisition

| Metric | M6 target | M12 target | M24 target | Current | Trend | Owner |
|---|---:|---:|---:|---:|:---:|---|
| Signup/bulan | 1.000 | 5.000 | 15.000 | 0 | — | Marketing |
| CAC (Rp) | <Rp 150k | <Rp 130k | <Rp 100k | — | — | Marketing |
| LTV/CAC | ≥3:1 | ≥4:1 | ≥5:1 | — | — | Growth |
| Organic traffic /bulan | 50k | 200k | 500k | 0 | — | Marketing |
| Paid CPC (Rp) | <Rp 5k | <Rp 4k | <Rp 3k | — | — | Marketing |

### 5.2 Activation

| Metric | Target | Current | Owner |
|---|---|---|---|
| Onboarding completion rate | ≥70% | — | Design |
| Time to first Daily Pick view | <5 menit | — | Design |
| D1 retention | ≥45% | — | Product |
| D7 retention | ≥35% | — | Product |
| D30 retention | ≥20% | — | Product |

### 5.3 Engagement

| Metric | Target | Current | Owner |
|---|---|---|---|
| WAT (Weekly Active Trader) | M6: 500; M12: 6.000; M24: 32.000 | 0 | Product |
| WAT/MAU ratio | ≥40% | — | Product |
| Session duration median | ≥12 menit | — | Product |
| Charts viewed per session | ≥3 | — | Product |
| AI queries per active user/week | ≥5 | — | ML |

### 5.4 Conversion

| Metric | Target | Current | Owner |
|---|---|---|---|
| Free → Paid conversion | ≥4% | — | Growth |
| Trial → Paid conversion | ≥30% | — | Growth |
| Tier upgrade Starter → Pro (annual) | ≥15% | — | Growth |
| Annual vs Monthly mix | 40% annual | — | Growth |

### 5.5 Retention / Revenue

| Metric | Target | Current | Owner |
|---|---|---|---|
| MRR growth /bulan (early) | ≥15% | — | Founder |
| MRR growth /bulan (mature M12+) | ≥5% | — | Founder |
| Net Revenue Retention | ≥110% | — | CS |
| Gross churn Starter | ≤5%/bulan | — | CS |
| Gross churn Pro | ≤3%/bulan | — | CS |
| Gross churn Elite | ≤2%/bulan | — | CS |

### 5.6 Product Quality

| Metric | Target | Current | Owner |
|---|---|---|---|
| Daily Picks hit rate (TP1 < SL) per setup | ≥55% | — | Data |
| Daily Picks avg R/R realized | ≥1.3 | — | Data |
| AI Copilot user satisfaction (thumbs up) | ≥80% | — | ML |
| p95 latency real-time tick | <500ms | — | BE |
| Uptime market hours | ≥99.9% | — | DevOps |
| App Store rating iOS | ≥4.5 | — | Mobile |
| Play Store rating Android | ≥4.5 | — | Mobile |
| Sentry error rate | <0.5% sessions | — | Eng |

---

## 6. Hiring Tracker

Sumber: `ANALISIS_APLIKASI_SAHAM.md` Section 16.

| # | Role | Target hire date | State | Recruiter notes |
|---|---|---|---|---|
| 1 | Co-founder / Tech Lead (CTO) | M0.2 (Week 8) | open | Critical hire; ekuitas + cash |
| 2 | Frontend Engineer #1 | M0.2 | open | Next.js + TS + Tailwind |
| 3 | Frontend Engineer #2 | M0.3 | open | Mobile RN bonus |
| 4 | Backend Engineer #1 | M0.2 | open | Go + Postgres |
| 5 | Backend Engineer #2 | M0.3 | open | Rust/Go ingest pipeline |
| 6 | Data Engineer #1 | M0.3 | open | Python + QuestDB + Polars |
| 7 | Product Designer | M0.2 | open | Figma + product UX |
| 8 | ML/Quant Engineer #1 | M3 | open | LLM + financial ML |
| 9 | Frontend Engineer #3 | M6 | open | Desktop Tauri experience plus |
| 10 | Backend Engineer #3 | M6 | open | Distributed systems |
| 11 | Data Engineer #2 | M6 | open | NLP + scraping |
| 12 | QA Engineer | M6 | open | Test automation Playwright |
| 13 | DevOps / SRE | M6 | open | K8s + Terraform |
| 14 | Saham Analyst / Content #1 | M3 | open | CFA / pengalaman sekuritas |
| 15 | Saham Analyst / Content #2 | M6 | open | — |
| 16 | Growth / Marketing Lead | M3 | open | Performance marketing |
| 17 | Customer Success | M6 | open | B2C SaaS background |
| 18 | Compliance / Legal in-house | M12 | open | Pasar modal expertise |
| 19 | Frontend Engineer #4 | M12 | open | — |
| 20 | Backend Engineer #4 | M12 | open | — |
| 21 | Data Engineer #3 | M12 | open | — |
| 22 | ML #2 | M12 | open | — |
| 23 | Designer #2 | M12 | open | — |
| 24 | QA #2 | M12 | open | — |
| 25 | Content/Analyst #3 | M12 | open | — |
| 26 | Growth #2 | M12 | open | — |
| 27 | Customer Success #2 | M12 | open | — |

**Recruiter notes:**
- Source: LinkedIn, Glints, Kalibrr, referral from East Ventures portfolio, Indo Java fintech community.
- Comp: target 75 percentile market (sumber: Github Recruit Indo, Talenta).
- Equity pool: 12% for first 10 hires.

---

## 7. Budget & Burn Rate

> Placeholder template — isi monthly setelah pre-seed close.

### 7.1 Cash Position

| Bulan | Cash on hand (USD) | Monthly burn (USD) | Runway (bulan) | Notes |
|---|---:|---:|---:|---|
| M0 | TBD | TBD | TBD | Pre-funding |
| M1 | — | — | — | — |
| M2 | — | — | — | — |
| M3 | — | — | — | — |
| M6 | — | — | — | — |
| M9 | — | — | — | — |
| M12 | — | — | — | — |
| M18 | — | — | — | — |
| M24 | — | — | — | — |

### 7.2 Monthly Cost Breakdown (Estimated)

| Cost line | M3 est (USD/bln) | M6 est | M12 est | M24 est | Notes |
|---|---:|---:|---:|---:|---|
| Payroll | 25.000 | 45.000 | 80.000 | 180.000 | 5 → 10 → 27 → 50+ headcount |
| Cloud (AWS Jakarta + Cloudflare) | 1.500 | 4.000 | 12.000 | 35.000 | Compute + storage + egress |
| Vendor data (Invezgo + OHLC.dev) | 2.500 | 3.500 | 0 | 0 | Replaced by IDX direct M9 |
| IDX direct data feed | 0 | 0 | 15.000 | 25.000 | Tier-based pricing |
| LLM API (Anthropic) | 800 | 2.500 | 8.000 | 25.000 | Sonnet+Opus, cache opt |
| Payment gateway fees (2.5%) | 100 | 1.300 | 9.900 | 39.000 | Of revenue |
| Marketing | 3.000 | 8.000 | 25.000 | 80.000 | Performance + content |
| Legal | 1.500 | 1.500 | 2.000 | 3.000 | Counsel + license |
| Office / coworking | 500 | 1.500 | 4.000 | 12.000 | Hybrid |
| Tools (Figma, GitHub, etc) | 500 | 1.000 | 2.500 | 6.000 | SaaS stack |
| Misc / contingency | 1.000 | 2.000 | 5.000 | 12.000 | 10% buffer |
| **Total monthly burn** | **~36.400** | **~70.300** | **~163.400** | **~417.000** | — |

### 7.3 Funding Plan

| Round | Target close | Amount (USD) | Use of funds | Status |
|---|---|---:|---|---|
| Pre-seed | M0.5 (M2) | 300–500k | MVP + 6mo runway | 🟡 in pitch |
| Seed | M9 | 1.5–3M | Tim + IDX license + marketing | ⚪ |
| Series A | M18+ | 8–15M | Multi-asset + regional | ⚪ |

---

## 8. Risk Register (Live)

Sumber: `ANALISIS_APLIKASI_SAHAM.md` Section 13.

| # | Risk | Likelihood | Impact | Status | Owner | Last review | Action items |
|---|---|---|---|---|---|---|---|
| R1 | Lisensi data IDX mahal | High | High | active | Founder | 11 Mei 2026 | Mulai vendor; negosiasi BEI tier-based di M6 |
| R2 | Regulasi OJK ketat (Penasihat Investasi) | Medium | High | active | Founder + Legal | 11 Mei 2026 | Engage law firm; positioning *educational*; ajukan izin M9 |
| R3 | LLM cost membengkak | Medium | Medium | active | ML Lead | 11 Mei 2026 | Prompt caching; rate limit per tier; cache common queries; fine-tune small model untuk task spesifik |
| R4 | Akurasi Daily Picks rendah → user churn | Medium | High | active | Data + ML | 11 Mei 2026 | Walk-forward validation wajib; transparent track record; R/R conservative ≥1.5 |
| R5 | Scrap sekuritas → cease & desist | Medium | Medium | active | Legal | 11 Mei 2026 | Hanya public domain + partnership; legal review per source |
| R6 | Kompetitor besar (Stockbit/Mirae) tiru fitur | High | Medium | active | Founder | 11 Mei 2026 | Speed of execution; fokus AI + research aggregation moat; community |
| R7 | Data quality issue (tick salah, broker summary delayed) | Medium | High | active | Data | 11 Mei 2026 | Multi-vendor cross-check; anomaly detection pre-publish |
| R8 | Pump-dump abuse via produk | Medium | High | active | Compliance | 11 Mei 2026 | Rule-based picks; no paid promotion; community moderation; anti-collusion detection |
| R9 | Server downtime saat jam bursa | Low | Critical | active | DevOps | 11 Mei 2026 | Multi-AZ; auto-failover; on-call rotation; status page |
| R10 | PDP compliance violation | Low | Critical | active | Legal | 11 Mei 2026 | Data residency Indonesia; DPO appoint; audit tahunan |
| R11 | Funding delay → MVP slip | High | Critical | active | Founder | 11 Mei 2026 | Multi-investor pipeline; bridge angel; lifetime deal cohort backup |
| R12 | Co-founder/Tech lead hire delay | High | High | active | Founder | 11 Mei 2026 | 3 candidate pipeline; offer ekuitas competitive |
| R13 | Vendor data outage at market open | Low | High | active | Data | 11 Mei 2026 | Multi-vendor failover; cache last EoD |
| R14 | Trial → Paid conversion below 30% | Medium | High | active | Growth | 11 Mei 2026 | A/B test trial length, paywall placement, microcopy |
| R15 | Subscription leakage (sharing accounts) | Medium | Medium | active | Eng | 11 Mei 2026 | Device fingerprint; concurrent session limit per tier |

---

## 9. Decision Log

Format: setiap entry mendokumentasikan keputusan signifikan, alternatif, rationale, owner, dan reversibility ("Type 1 = one-way door, Type 2 = two-way door").

### D1 — Database time-series: QuestDB (vs TimescaleDB vs ClickHouse)

- **Tanggal:** 11 Mei 2026
- **Keputusan:** Gunakan **QuestDB** sebagai primary time-series store untuk OHLCV, tick, broker summary.
- **Alternatif:**
  - TimescaleDB — ekosistem Postgres tunggal, tapi 40x lebih lambat ASOF JOIN (1021ms vs 25ms benchmark).
  - ClickHouse — analytics-heavy, tapi 21x lebih lambat ASOF JOIN (547ms).
- **Rationale:** Benchmark KX TSBS menunjukkan QuestDB 4M rows/sec ingestion + native ASOF JOIN — krusial untuk financial. Tim familiar dengan Postgres untuk OLTP, so split OLTP (Postgres) / TS (QuestDB) acceptable.
- **Owner:** Founder + future Tech Lead
- **Reversibility:** Type 2 — bisa migrate ke ClickHouse di M12 kalau analytics workload meningkat.

### D2 — LLM Provider: Anthropic Claude (vs OpenAI vs open-source)

- **Tanggal:** 11 Mei 2026
- **Keputusan:** Gunakan **Anthropic Claude Sonnet 4.6** (default) dan **Opus 4.7** (Elite mode).
- **Alternatif:**
  - OpenAI GPT-4o / o1 — strong reasoning, tapi prompt caching kurang mature.
  - Open-source Llama 3 / DeepSeek — self-host, tapi infra cost & inference latency tinggi untuk MVP.
- **Rationale:** Anthropic prompt caching (90% cost reduction untuk system prompt repeated), tool use mature, extended thinking untuk deep analysis. Sonnet 4.6 cost-efficient untuk daily Q&A, Opus 4.7 untuk Elite deep research.
- **Owner:** Founder + ML Lead
- **Reversibility:** Type 2 — abstraction layer di backend AI service memungkinkan switch provider.

### D3 — Frontend Framework: Next.js 15 (vs Remix vs SvelteKit)

- **Tanggal:** 11 Mei 2026
- **Keputusan:** **Next.js 15** dengan App Router + RSC.
- **Alternatif:**
  - Remix — bagus untuk full-stack, tapi ekosistem komponen lebih kecil.
  - SvelteKit — perf bagus, tapi developer pool Indonesia limited.
- **Rationale:** Ekosistem React + TanStack Query + shadcn/ui paling matang. Deployment Vercel/AWS mudah. Developer pool Indonesia paling besar.
- **Owner:** Founder + future Tech Lead
- **Reversibility:** Type 1 (semi) — pindah framework setelah scale akan mahal.

### D4 — Desktop App: Tauri 2.0 (vs Electron)

- **Tanggal:** 11 Mei 2026
- **Keputusan:** **Tauri 2.0** untuk desktop app (M6).
- **Alternatif:**
  - Electron — mature, banyak ref (Stockbit, Slack), tapi bundle 150MB+.
- **Rationale:** Tauri bundle ~5MB vs Electron 150MB, Rust backend untuk native API access (multi-monitor, system tray, biometric). Performance lebih baik untuk financial app.
- **Owner:** Future Tech Lead
- **Reversibility:** Type 2 — bisa migrate ke Electron kalau Tauri ekosistem kurang.

### D5 — Brand Name: "Nubuat"

- **Tanggal:** 11 Mei 2026
- **Keputusan:** Working name **"Nubuat"** confirmed.
- **Alternatif:** Arta, Tirta, Veredikta/Verdikt, AlphaSiap.
- **Rationale:** Distinctive, Indonesia-native, mudah diingat, semantik fit (memberikan *nubuat* berbasis data, bukan tebakan). Domain `nubuat.id` tersedia. Working folder sudah `/nubuat`.
- **Owner:** Founder + Brand Consultant
- **Reversibility:** Type 1 (eventually) — rebrand mahal setelah brand equity terbangun. Recommend final lock saat M3.

---

## 10. Open Questions / Next Steps

Sumber: `ANALISIS_APLIKASI_SAHAM.md` Section 17.2.

| # | Open question / next step | Owner | Status | Target |
|---|---|---|---|---|
| 1 | Validasi user research — 30 wawancara trader retail aktif (sample dari komunitas Stockbit, Telegram trading) untuk validasi pricing & top fitur | Designer + Founder | ⚪ Not started | M1 |
| 2 | Lisensi data IDX — meeting BEI Data Services untuk kuotasi langsung vs vendor | Founder | ⚪ Not started | M6 |
| 3 | Legal counsel — pilih law firm spesialis pasar modal (Hadiputranto Hadinoto / Assegaf Hamzah / Makarim & Taira) untuk advise lisensi | Founder | 🟡 In progress | M0.2 |
| 4 | Prototyping — Figma high-fi prototype 3 flow utama (Daily Picks, Ticker Deep Dive, AI Q&A) untuk usability test | Designer | ⚪ Not started | M1 |
| 5 | MVP scope freeze — putuskan 1 *killer feature* untuk MVP launch (rekomendasi: **Daily Picks + Bandarmology + AI Copilot**, defer Backtesting & Strategy Marketplace ke v2) | Founder + Tech Lead | 🟡 In progress | M0.2 |
| 6 | Co-founder/tech lead hire — kalau founder solo | Founder | 🟡 In progress | M0.2 |
| 7 | Pendanaan — siapkan deck pre-seed, target angel/early-stage fund Indonesia (East Ventures, AC Ventures, Alpha JWC, Init-6, Kopital) | Founder | 🟡 In progress | M0.5 |
| 8 | Vendor data evaluation — Invezgo vs OHLC.dev vs iTick (POC 2 minggu) | Future Data Lead | ⚪ Not started | M0.3 |
| 9 | Convention konfirmasi: warna naik hijau / turun merah (vs China inverse) — validate dengan 30 user research | Designer | ⚪ Not started | M1 |
| 10 | Sekuritas partnership outreach — BRI Danareksa, Mandiri Sekuritas, Mirae untuk research distribution agreement | Founder + BD | ⚪ Not started | M3 |
| 11 | Pre-seed deck final | Founder | 🟡 In progress | M0.1 |
| 12 | Legal entity (PT) setup | Founder | ⚪ Not started | M0.1 |
| 13 | DPO appointment (UU PDP compliance) | Legal | ⚪ Not started | M3 |
| 14 | Beta waitlist landing page + signup | Marketing | ⚪ Not started | M0.2 |
| 15 | Discord server setup (komunitas seed) | Founder | ⚪ Not started | M0.2 |

---

## 11. Weekly Status Update Template

> Append entry baru di sini setiap Jumat 17:00 WIB. Format konsisten untuk memudahkan tracking trend.

---

### Week of 1–7 Jun 2026

**Highlights**
- 🟢 Fitur **Kepemilikan Saham** (publik, data KSEI BalancePos) live: komposisi Lokal vs Asing per emiten, cari + urut A-Z + pagination angka & lompat huruf. Filter "saham saja" kini pakai universe IDX (956 emiten) — bukan heuristik kode 4 huruf yang ikut hitung ETF/DIRE/EBA (1.040).
- 🟢 **Review ≥1% Ownership** ala klinikpenyesalan di superadmin: tab Ringkasan/Per Investor/Metrik + **peta jaringan interaktif** (zoom/pan/hover/fullscreen, lintas-kepemilikan emiten↔pemegang↔saham lain).
- 🟢 **Ambil semua data ke DB** (arahan founder): holders 7.161 + emiten 956 + data Perubahan (changelog 523 changes, summary top gainers/losers/holders/bought/sold, 68 investor baru) tersimpan RAW di `ownership_1pct_changelog`.
- 🟢 Changelog bell "Apa yang baru" v1.9.0 (Kepemilikan Saham, Ruang Belajar, edit profil, modul Academy lanjutan). Rename "AI & Belajar" → "Ruang Belajar".
- 🟢 **Tab Perubahan Data live** (sebelumnya stub): konsumsi `ownership_1pct_changelog` RAW → Saham Baru/Keluar, Top Diborong/Dilepas (net flow), Top Gainers/Losers per investor-saham, Top Holders, Investor Baru. Panel expandable (25/60 row), label periode `prevDate → currentDate`, fallback rapi saat snapshot <2 atau tanpa perubahan.
- 🟢 **Sumber riset Telegram publik** di admin securities-reports: scraper `t.me/s/<channel>` tanpa token/API key (parse HTML preview, decode entitas, ambil judul/tanggal/URL pesan). 4 channel (Samuel Sekuritas, Dapur Saham, Creative Trader, Saham Pemenang) — live-tested OK; upsert idempotent per `tg:<user>:<msgId>`; sumber error tak menggagalkan sumber lain. Parser dipindah ke util bersama `lib/securities/telegram.ts`.
- 🟢 **Auto-fetch Rekomendasi Sekuritas** (sebelumnya 100% manual): pipeline `fetch Telegram → prefilter heuristik → ekstraksi AI (DeepSeek JSON) → upsert `securities_picks``. AI hanya ambil call eksplisit (kode+aksi+entry/target/SL), mengabaikan market-update/berita/edukasi. Tombol "Refresh dari sumber" di admin + **Vercel Cron harian** (`/api/cron/securities-picks`, weekday 09:00 WIB); idempotent per tgl+sumber+kode. **Live-tested**: 13 kandidat → 2 pick valid (BMRI, WIFI dari Dapur Saham) dalam 26 dtk, 0 error.
- 🟢 **Daily Picks**: confidence Low kini ikut tampil (sebelumnya disembunyikan), diurut setelah High & Medium (stable sort, skor desc dalam tier).
- 🟢 **Perubahan Data multi-periode**: `extractChangelogAll()` simpan semua periode array sumber (bukan arr[0]) + akumulasi antar waktu; UI dropdown selektor periode.
- 🟢 **Biggest Risk #1 ditutup — Worker→Vercel Cron (15 cron)**: data prod self-refresh tanpa BullMQ worker. Tier-1 (evaluate-outcomes, paper-leaderboard, trial-drip, expire-trial, renew-subscriptions, account-deletion-sweep) + Tier-2 rantai EOD (ingest-eod → technical-snapshots → detect-patterns → analyze-elliott → analysis-snapshots → daily-digest, maxDuration 300). Helper `lib/cron/helpers.ts` (auth CRON_SECRET/superadmin, panggil Processor inline).
- 🟢 **Users & Roles**: last login kini tercatat (`databaseHooks.session.create.after` tulis `lastLoginAt`+IP; sebelumnya better-auth tak nulis) + panel **Statistik Registrasi** (kartu + bar chart pendaftaran/hari 14h + distribusi tier).
- 🟢 **Securities-reports**: `normalizeCategory()` (Daily/Weekly/Monthly/Company/Economic/Technical/Telegram/Lainnya) badge+filter; 3 sumber baru (Samuel RSS, NH Korindo, KB Valbury) + cutoff 2 tahun. IDX BEI ❌ blocked Cloudflare (manual saja).
- 🟢 **Elliott Wave P2**: `projection.ts` (target Fibonacci + guidelineScore 0-100 + degree) + `narrative.ts` (AI DeepSeek). Wired ke kartu UI: proyeksi target, bar kualitas count, **tombol Penjelasan AI on-demand** (`/api/elliott/narrative`). 16 test.
- 🟢 **Screener NL** (BETA): `parseNlQuery()` query bahasa natural → DeepSeek JSON → ScreenerFilters (zod), route `/api/screener/nl`, section "Cari dengan AI". Live-tested.
- 🟢 **Klasifikasi KSEI 9-tipe**: terverifikasi sudah live (956/956 emiten, agregat pasar + per-emiten); item lama di doc ternyata stale.
- 🟢 Unit test modul baru (40 test: htmlToText, prefilter picks, extractChangelogAll, elliott projection). tsc 0, lint bersih, build hijau (136/136).

**Lowlights**
- 🟡 IDX BEI research feed terblokir Cloudflare (perlu headless/proxy) — di luar pola fetch publik.
- 🟡 Next.js drift (pkg 15.1.11 vs node_modules 15.5.18) — prod hijau; rekonsiliasi ditunda (risiko > nilai).
- 🟡 AI narrative Elliott masih on-demand per-klik (belum di-cache; worker tak generate massal demi hemat AI).

**Next Week**
- (opsional) cache narasi Elliott (Redis); IDX BEI via pendekatan alternatif; tambah sumber riset lain.

---

### Week of 11–17 Mei 2026 (Sprint 0)

**Highlights**
- 🟢 Strategic discovery document `ANALISIS_APLIKASI_SAHAM.md` selesai v0.1 (765 baris).
- 🟢 Design plan + ASCII wireframe `PLAN_UIUX_WIREFRAME.md` selesai v0.1.
- 🟢 Working name *Nubuat* confirmed; domain `nubuat.id` reserved.
- 🟢 Pre-seed pitch deck drafted (v0.1).

**Lowlights**
- 🔴 Co-founder/Tech Lead belum hired.
- 🔴 Pre-seed funding belum closed.
- 🔴 Vendor data contract belum signed.

**Numbers**
- Team: 1 (founder solo)
- WAT: 0
- MRR: Rp 0
- Cash: TBD (pre-funding)
- Beta signups: 0

**Next Week**
- Engage 2 law firm untuk legal counsel selection.
- Outreach 5 candidate untuk Tech Lead role.
- Reach out to 3 investor (East Ventures, AC Ventures, Init-6) untuk pitch meeting.
- Begin user interview recruitment (target 30 trader).

**Asks**
- Intro ke Tech Lead candidate dengan pengalaman fintech / financial product.
- Intro ke East Ventures / AC Ventures / Init-6 partner.
- Feedback dari 2–3 trader veteran tentang Daily Picks Engine spec.

---

### Week of 18–24 Mei 2026 (Sprint 1)

**Highlights**
- *(TBD)*

**Lowlights**
- *(TBD)*

**Numbers**
- *(TBD)*

**Next Week**
- *(TBD)*

**Asks**
- *(TBD)*

---

### Week of 25–31 Mei 2026 (Sprint 1, week 2)

> **Snapshot progres (29 Mei 2026):** MVP build **~88%** · Launch-readiness closed-beta **~85%**.
> Baseline pembanding untuk update berikutnya. Estimasi per-area:
>
> | Area | Sebelum sesi | Sesudah sesi |
> |---|---|---|
> | Deploy & CI/CD | 🟢 95% (deploy aman, framework preset fixed) | 🟢 95% |
> | Compliance & security (launch-blocker) | 🟡 60% | 🟢 ~90% (email-gate, webhook sig, rate-limit IP, UU PDP, audit immutability, cookie consent, market-auth regresi) |
> | Diferensiator (Elliott/Pattern/Screener) | 🟡 65% | 🟢 ~90% (Elliott P0+P1, pennant+inverse cup, Swing Santai) |
> | UI/UX & copy | 🟡 70% | 🟢 ~88% (tagline, nada "kamu", kontras teks, 404, OG) |
> | Konten publik (About/Glossary) | ⚪ 0% | 🟢 90% (kode siap; glossary perlu push+seed prod) |
> | Logo emiten self-host | 🔴 hotlink Google | 🟢 LIVE di Vercel Blob (public) — 61 emiten lokal ter-upload; prod tinggal run |
> | Glossary admin CMS | ⚪ 0% | 🟢 90% (/admin/glossary CRUD + publish + revalidate ISR) |
> | Data vendor (bandarmology/real-time) | 🔴 20% (placeholder) | 🔴 20% (blokir vendor) |
> | Test coverage | 🔴 ~10% | 🟢 ~30% (**336 unit test**, +268 sesi ini) |
> | PWA / archive / search UX | ⚪ — | 🟢 PWA installable, /picks-archive publik, search pg_trgm typo-tolerant |

**Highlights**
- **Launch-blockers (Jalur A):** email verification gate + better-auth IP rate-limit; verifikasi signature webhook Midtrans/Xendit (timing-safe, 401, 12 test); rate-limit per-IP endpoint publik; **pulih regresi keamanan** (`/api/market/*` tanpa auth pasca middleware dihapus → `requireSession`); UU PDP endpoint export & soft-delete akun (+30 hari); cookie consent banner; audit-log immutability (migration append-only); cron picks-evaluator + worker account-deletion-sweep.
- **Diferensiator (Jalur B):** Elliott Wave **P0+P1** (pivot ZigZag, 3 hard rules, impulse + corrective A-B-C, multi-TF) lengkap dengan 37 test; pattern recognition tambah pennant + inverse cup&handle; screener technical filters + preset **Mode Swing Santai**; ToS/Privacy versioning re-accept.
- **UI/UX:** tagline brand → "Nubuat 👍 - Nubie Berbuat Mulanya Nyangkut Menuju Yahud"; nada bahasa semi-formal "kamu" (~46 lokasi: copy, notif, AI prompt, legal); kontras token teks dinaikkan (WCAG AA, light & dark); 404 custom + OpenGraph image.
- **Konten baru:** halaman **About Us** (visi: ritel trauma → Nubuat teman bertumbuh, SEO + JSON-LD) & **Glossary** (64 istilah, DB + ISR + search + pagination + per-term `/glossary/[slug]` schema.org DefinedTerm).
- **Logo self-host:** pipeline `npm run logos:sync` (download → WebP 128px → Vercel Blob → simpan URL). **LIVE** — 61 emiten lokal ter-upload ke store public, verified HTTP 200 image/webp.
- **Fitur lanjutan:** Glossary admin CMS (`/admin/glossary` CRUD); dark-mode default ikut OS + toggle 3-state; **PWA installable** (manifest + ikon 192/512 via next/og); **/picks-archive** publik (track record T+1/5/20 + hit-rate, SEO+ISR+disclaimer); AI Copilot render markdown progresif (throttle rAF); **search typo-tolerant** (pg_trgm, "TLKOM"→TLKM); picks outcome-evaluator diekstrak jadi modul murni + 20 test.
- **Infra:** branch `feat/launch-blockers-elliott-screener-uiux`, **6 commit** (belum push). tsc 0 error, **336 unit test lulus**, build hijau. DB lokal di-refresh (copy/tagline + glossary + logo tampil).

**Lowlights**
- **Next.js version drift:** `node_modules` = 15.5.18 padahal `package.json` pin 15.1.11 (versi yang dulu dihindari karena regresi `/404 <Html>` di Vercel). Verifikasi build lokal jalan di 15.5.18, bukan versi target Vercel — wajib rekonsiliasi.
- Copy DB-driven: perubahan tagline/teks hanya tampil setelah **re-seed** (seed pakai `onConflictDoNothing`); prod belum di-re-seed.
- Migration belum dijalankan: kolom soft-delete akun, tabel glossary, constraint audit immutability.

**Numbers**
- Commit (branch `feat/launch-blockers-elliott-screener-uiux`): **20 commit**, belum di-push ke GitHub — nunggu perintah founder.
- Unit test: 68 → **431** (+363: verdict 48, valuation 42, picks 54+20, billing 41, search 10, drip 14, reversal 14, rotation 18, ai-summary 15, spike 9, four-actor 15, dll). tsc error: 0. Build: ✅.
- Bandarmology L2: spike detection + **4-pelaku classification** (engine+UI siap, data nunggu vendor) — ter-mount di tab Bandarmology ticker. RRG rotation 4-kuadran. AI auto-summary harian. **In-app Academy** (4 modul/15 lesson). AI Pattern Explanation. Prod release runbook (`RELEASE.md` + `npm run post-deploy`).
- Versi Next.js: **deploy AMAN** (pin exact 15.1.11). Dev pakai **Turbopack** (typedRoutes kondisional: off di turbo, on di build) — CSS Tailwind v4 jalan.
- **Trial = Pro 7 hari** distandarkan; `/pricing` baca DB (Starter 99k/Pro 299k/Elite 899k), publik (nav "Harga" tak perlu login).
- **Login fixed**: DB lokal kosong → seed 3 akun demo + grandfather emailVerified. Tema balik **dark default**.
- **Logo self-host LIVE** (61 emiten Vercel Blob public). Glossary + admin CMS. PWA, /picks-archive, /status, search pg_trgm, vendor failover Yahoo→AlphaVantage, onboarding tour, email drip trial→Pro, Lighthouse CI, changelog notifier, reversal+continuation patterns lengkap.
- Prod TODO: migration (akun/glossary/audit/pg_trgm) + re-seed copy + `logos:sync` + `grandfather-verify`.

**Next Week**
- Rekonsiliasi versi Next.js (pin vs installed) sebelum deploy.
- Jalankan migration + re-seed copy ke DB produksi (via superadmin atau pipeline).
- Set `BLOB_READ_WRITE_TOKEN` + `npm run logos:sync` (self-host logo).
- Commit About Us + Glossary + logo pipeline; keputusan vendor data bandarmology.

**Asks**
- Keputusan storage logo (✅ Vercel Blob dipilih) → butuh founder buat Blob store + token.
- Keputusan kontrak vendor data (Invezgo/OHLC.dev) untuk unlock Bandarmology L2.

---

### Week of 1–7 Juni 2026 (Sprint 2)

**Highlights**
- *(TBD)*

**Lowlights**
- *(TBD)*

**Numbers**
- *(TBD)*

**Next Week**
- *(TBD)*

**Asks**
- *(TBD)*

---

### Week of 8–14 Juni 2026 (Sprint 2, week 2)

**Highlights**
- *(TBD)*

**Lowlights**
- *(TBD)*

**Numbers**
- *(TBD)*

**Next Week**
- *(TBD)*

**Asks**
- *(TBD)*

---

> *Tambah weekly entry di atas baris ini ↑ (most recent on top setelah Week 1).*

---

## 12. Sprint Schedule (Reference)

| Sprint | Date range | Theme |
|---|---|---|
| Sprint 0 | 11–17 Mei 2026 | Discovery & docs |
| Sprint 1 | 18–31 Mei 2026 | Funding + hiring + research |
| Sprint 2 | 1–14 Jun 2026 | Tech architecture + brand identity |
| Sprint 3 | 15–28 Jun 2026 | MVP scaffold begin |
| Sprint 4 | 29 Jun – 12 Jul 2026 | Auth + watchlist + ticker page |
| Sprint 5 | 13–26 Jul 2026 | Chart engine + indicators |
| Sprint 6 | 27 Jul – 9 Aug 2026 | Daily Picks engine v1 |
| Sprint 7 | 10–23 Aug 2026 | Bandarmology basic |
| Sprint 8 | 24 Aug – 6 Sep 2026 | AI Copilot integration |
| Sprint 9 | 7–20 Sep 2026 | Onboarding + dashboard |
| Sprint 10 | 21 Sep – 4 Oct 2026 | Closed beta prep |
| Sprint 11 | 5–18 Oct 2026 | Beta launch + feedback |
| Sprint 12 | 19 Oct – 1 Nov 2026 | Iteration |
| Sprint 13 | 2–15 Nov 2026 | Beta polish, pre-public |

---

## 13. Changelog

| Version | Date | Author | Changes |
|---|---|---|---|
| v0.1 | 11 Mei 2026 | Founder | Initial draft. Status snapshot, milestone tracker M0–M24, workstream status, feature matrix (96 fitur), KPI tracker, hiring tracker, budget template, risk register (15 risiko), decision log (5 keputusan), weekly status template, sprint schedule. |
| v0.2 | 29 Mei 2026 | Founder + Claude | Update snapshot: phase → MVP/pre-closed-beta, progress MVP ~88% / launch-readiness ~85% (sebelumnya stale "5%"). Log sesi 29 Mei di Minggu 25–31 Mei: tutup launch-blocker P0/P1 (email-gate, webhook sig, rate-limit, UU PDP, audit immutability, cookie consent, market-auth fix), diferensiator (Elliott P0+P1, pattern, screener Swing Santai), UI/UX (tagline, nada "kamu", kontras teks), About Us + Glossary, pipeline logo Vercel Blob. 121 unit test, tsc 0, build hijau. |
| v0.3 | 2 Jun 2026 | Founder + Claude | Tab **Perubahan Data** ownership ≥1% live (Saham Baru/Keluar, Top Diborong/Dilepas, Top Gainers/Losers, Top Holders, Investor Baru) dari `ownership_1pct_changelog`. **Sumber riset Telegram publik** (scraper `t.me/s/` tanpa token, 4 channel, live-tested). **Auto-fetch Rekomendasi Sekuritas** via ekstraksi AI DeepSeek (prefilter→JSON→upsert, live-tested 13 kandidat→2 pick). **Daily Picks** confidence Low ikut tampil (diurut setelah High/Medium). tsc 0, lint bersih. |
| v0.4 | 9 Jun 2026 | Founder + Claude | **Data pipeline pulih + observability.** Akar masalah "News/Picks kosong berhari-hari": tim hapus semua Vercel Cron (niat pindah VPS worker yg belum jalan) → **17 cron dikembalikan**. **Panel pemicu manual** di `/superadmin/system` (News/EOD/Technical/Pattern/Elliott/Analysis/Picks/Securities) + status data terakhir + **banner alert data stale**. **5 sumber news** baru (IDX Channel, Kontan, Katadata-finansial, Bisnis, EmitenNews via Google News RSS; +236 artikel). Technical Snapshots diisi (968 emiten) → **fix bug ★1 "Screener preset tidak berfungsi"**. **Screener** ramah pemula: Filter Lanjutan collapsible, 10 baris default + pagination bernomor + sort persist. **Trial → 1 hari** (config+DB+semua copy), feedback wajib **jam ke-3**, drip email berbasis jam (h6/h14/h20). **Fix build PPR** (experimental.ppr dari merge perf/reduce-vercel-cpu butuh Next canary → semua deploy prod Error). Log emiten gagal EOD/Technical. tsc 0, 14+ test drip lulus, build hijau. |
| v0.6 | 15 Jun 2026 | Founder + Claude | **Fix Daily Picks "tidak update" (bug tampilan, bukan generator).** Diagnosa via query DB prod langsung: picks 12 Jun **ada** (10 pick `published`), generator sehat (run 06:00 WIB normal). Akar masalah: halaman `/picks`, API `/picks/today`, dan dashboard memfilter `trade_date == tanggal kalender hari ini` (`eq`), padahal picks selalu berbasis EOD yg **lag ≥1 hari** → tiap akhir pekan & pagi sebelum run, halaman kosong walau data valid ada (mis. 15 Jun minta `15-06` → 0 row). Komentar kode nulis `>= today` tapi implementasi `eq` (niat ≠ kode). **Fix**: helper `getEffectivePickDate(onOrBefore)` resolve `max(trade_date)` published `<= today`; `getTodayPicks` pakai itu → benahi 3 pemanggil sekaligus; header tampilkan tanggal pick aktual + label "(basis penutupan)". Diverifikasi ke DB prod: `15-06`→resolve `12-06`→10 pick tampil. tsc 0. Deploy CLI manual prod (READY, alias `nubuat.sainskerta.net`). |
| v0.5 | 11 Jun 2026 | Founder + Claude | **Track record & reliability Daily Picks.** **Daily Picks Sekuritas** disembunyikan dari user (sumber stale) → pindah ke `/superadmin/system` (badge internal) sampai sumber kuat. **Winrate jujur**: kolom `verdict` di `pick_outcomes` (win=TP1-sebelum-SL / loss / ambiguous / expired) + **resolusi urutan TP-vs-SL via intraday Yahoo 5m on-the-fly** (range `1mo`); ganti metrik lama `tp1HitRate` yg inflate (both-hit dihitung menang → tampil 90%). Hasil all-time: **T+1 84.1% (37W/7L), T+5 80.0% (16W/4L)**, nol ambigu. Headline winrate di `/picks/performance` + kartu `/superadmin/system`. **Otomasi pipeline picks pagi**: rantai EOD 05:10 → technical/pattern/elliott/analysis → **Daily Picks 06:00 WIB** (dow `0-4` krn 06:00 WIB=23:00 UTC H-1) + **safety-retry 07:30 WIB** (idempoten); fix `picks-generate` `maxDuration` 60→300 (sumber timeout). Diagnosa "picks sering tak jalan": timeout + cron sempat dihapus tim + timing rapuh. **WA Mirae ingest (Baileys, DORMANT)**: userbot baca WA Channel → ekstraksi AI DeepSeek → `securities_picks` label internal (bukan verbatim); auth-state Postgres (`wa_auth_state`), `npm run wa:login`/`wa:listen`, nomor bot +6281284190511 — nyala setelah worker/VPS + pairing. tsc 0. Deploy: 5× CLI manual (Vercel git-link diputus → push tak auto-deploy). |

---

*Living document — update minimal weekly. Kirim PR untuk perubahan struktural; minor update bisa direct commit dengan note di Changelog.*
