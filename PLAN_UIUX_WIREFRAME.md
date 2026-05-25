# Plan UI/UX & Wireframe — Nubuat

> **Dokumen:** Rencana UI/UX, sistem desain, wireframe ASCII, dan rencana riset usability.
> **Tanggal:** 11 Mei 2026
> **Owner Design:** Lead Product Designer Nubuat (dobeon.com@gmail.com)
> **Status:** v0.1 — Discovery & Design Foundation
> **Acuan utama:** `ANALISIS_APLIKASI_SAHAM.md` (Section 3 Vision, 4 Modul Analisis, 5 Killer Features, 7 Frontend, 10 Monetisasi, 12 Roadmap, 14 KPI, 16 Tim).

---

## Daftar Isi

1. Design Principles
2. User Personas
3. User Journey Maps
4. Information Architecture
5. Wireframe ASCII (≥25 layout)
6. Design System Spec
7. Interaction Patterns Library
8. Accessibility (WCAG 2.2 AA) Checklist
9. Localization & Cultural Considerations
10. Microcopy Guidelines
11. Mobile UX Specific
12. Design QA & Handoff
13. Prototyping & Usability Testing Plan

---

## 1. Design Principles

Tujuh prinsip ini menjadi *guardrail* setiap keputusan desain Nubuat. Setiap PR desain wajib lulus *principle check* sebelum *handoff*.

### 1.1 Data Density with Clarity
**Definisi:** Tampilkan data sebanyak mungkin tanpa mengorbankan keterbacaan. Trader pro butuh banyak angka di satu layar (seperti Bloomberg), tapi retail butuh hirarki visual yang jelas.

**Penerapan:**
- Density toggle (*comfortable* vs *compact*) tersedia di setiap halaman terminal.
- Numerik finansial selalu *right-aligned* dengan font mono variable (Geist Mono / Inter Variable Mono).
- Hirarki warna: angka primer (harga) lebih kontras dari angka sekunder (perubahan), dan angka tersier (volume, value) lebih redup.
- *Tabular numerals* aktif (`font-feature-settings: "tnum"`) agar kolom angka rapi.

### 1.2 Keyboard-First
**Definisi:** Setiap aksi penting bisa diakses tanpa mouse. Power trader bisa menavigasi seluruh aplikasi via hotkey ala Bloomberg `<TICKER> <GO>`.

**Penerapan:**
- Command palette `Cmd/Ctrl+K` di setiap *route*.
- Hotkey global: `g d` (go to dashboard), `g p` (picks), `g w` (watchlist), `?` (help overlay).
- Function code Bloomberg-style: ketik ticker langsung di mana saja → fuzzy match → enter untuk buka.
- Skip link & visible focus ring di setiap interaksi.
- Tooltip menampilkan shortcut (mis. `+ Watchlist (W)`).

### 1.3 Trust through Transparency
**Definisi:** Setiap angka, skor, atau rekomendasi harus bisa ditelusuri sampai *raw data* dan *metodologi*. Tidak ada *black box*.

**Penerapan:**
- Verdict score 0–10 disertai *factor breakdown* (klik untuk expand) dan *historical track record* per setup type.
- Setiap rekomendasi Daily Pick punya *expand* yang menampilkan kalkulasi entry/SL/TP, R/R, dan asumsi.
- AI Copilot wajib *cite source* dengan link ke laporan/news asli.
- Disclaimer eksplisit "Bukan ajakan jual/beli" pada setiap card Daily Pick.
- Page `/methodology/<feature>` mendokumentasikan rumus & data window.

### 1.4 Indonesia-Native Tone
**Definisi:** Bahasa, format, dan konteks budaya Indonesia diperlakukan sebagai *first-class*, bukan sekadar terjemahan.

**Penerapan:**
- Bahasa Indonesia formal-modern (gunakan "Anda"), bukan terjemahan harfiah dari English.
- Istilah lokal: *cum date*, *ex date*, *tutup harga*, *kustodian*, *RUPS*, *aksi korporasi* dipakai langsung tanpa terjemahan kaku.
- Format angka Rupiah: `Rp 1.250.000` (titik sebagai *thousands separator*), persen `+1,25%` (koma desimal).
- Tanggal & waktu: `Sen, 11 Mei 2026 09:30 WIB` (WIB ditampilkan eksplisit).
- Tone: *knowledgeable mentor*, tidak menggurui, tidak hype.

### 1.5 Mobile-Companion-Not-Replica
**Definisi:** Mobile bukan miniaturisasi desktop, melainkan *companion* dengan fokus berbeda: alerts, daily picks, watchlist quick check, portfolio glance, AI Q&A.

**Penerapan:**
- Mobile tidak menampilkan multi-pane workspace, command palette, atau backtest builder.
- Daily Picks di mobile berbentuk *swipeable card* yang dioptimalkan untuk *thumb zone*.
- Push notification adalah *primary entry point* untuk mobile.
- Chart di mobile menggunakan gesture (pinch zoom, two-finger pan) dan menyembunyikan *drawing tools* di sheet.
- Action *destructive* (jual posisi paper trading, hapus watchlist) selalu butuh konfirmasi sheet.

### 1.6 Progressive Disclosure
**Definisi:** Tampilkan informasi sesuai konteks pengguna. Pemula lihat ringkasan; pro bisa *drill-down* ke detail level mikro.

**Penerapan:**
- Tier-aware UI: fitur Pro/Elite tampil sebagai *teaser* (locked) bagi tier lebih rendah, bukan disembunyikan total.
- Pada ticker page: tab `Overview` (default) dengan ringkasan; tab `Technical`, `Fundamental`, `Bandarmology`, dst untuk drill-down.
- Verdict score 0–10 di header, klik untuk *factor breakdown*; klik *factor* untuk *raw signals*; klik *raw signal* untuk *source data*.
- Tooltip → popover → side drawer → full page (eskalasi level detail).

### 1.7 Accessible by Default
**Definisi:** WCAG 2.2 AA bukan retrofit, melainkan dipertimbangkan saat *first design pass*. Termasuk *cognitive load* untuk trader pemula.

**Penerapan:**
- Kontras minimum 4.5:1 untuk teks, 3:1 untuk UI element & data viz.
- Warna hijau/merah finansial selalu disertai *icon* (`▲▼`) dan *sign* (`+/−`) untuk *colorblind* user.
- Live region (`aria-live="polite"`) untuk tick update; tidak boleh *intrusive* untuk *screen reader*.
- Setiap chart memiliki *data table alternative* yang bisa diakses via tombol `View as table`.
- `prefers-reduced-motion` menonaktifkan tick blink dan transition non-esensial.

### 1.8 Speed is a Feature
**Definisi:** Perceived performance adalah pengalaman; *skeleton*, *optimistic UI*, dan *prefetch* wajib.

**Penerapan:**
- TTFB <200ms, LCP <1.5s, chart render <100ms untuk 1000 candle.
- Optimistic update pada watchlist add/remove, alert toggle.
- Prefetch ticker page saat hover di list (Next.js `prefetch`).
- Skeleton dengan dimensi tepat (no CLS).

### 1.9 Composable Workspace
**Definisi:** Pengguna bisa menyusun layout sendiri (Pro+); workspace dapat disimpan dan dibagikan.

**Penerapan:**
- Drag-resize panel di workspace Pro+.
- Workspace template: `Day Trader`, `Swing Trader`, `Fundamental Investor`, `Researcher`.
- Save/share workspace via URL singkat (`nubuat.id/w/abc123`).

### 1.10 Responsibility & Risk Framing
**Definisi:** Mengingatkan pengguna bahwa trading mengandung risiko, tanpa membuat aplikasi terasa *defensive* atau *patronizing*.

**Penerapan:**
- Daily Pick card menampilkan *historical hit rate per setup type* dengan tone faktual.
- Saat user *paper trade* posisi pertama, modal edukasi tentang *position sizing*.
- *Confidence score* selalu disertai *honest description* (mis. *"Confidence 7/10 — berdasarkan 142 setup serupa, hit rate 58%"*).
- Tidak ada *celebration animation* berlebihan saat profit di paper trading.

---

## 2. User Personas

Lima persona ini menjadi *target audience* utama. Setiap persona di-validasi melalui 6 *user interview* (Section 13).

### Persona 1 — Trader Awam Pemula (*Newbie*)

| Atribut | Detail |
|---|---|
| Nama | **Dimas Pratama** |
| Usia | 24 tahun |
| Profesi | Karyawan startup tech, Jakarta |
| AUM | Rp 15–50 juta |
| Pengalaman | 6 bulan trading, baru lulus dari grup *belajar saham* Telegram |
| Device | Smartphone (Android), occasional laptop |
| Frustration | Bingung sinyal mana yang valid; takut salah beli; tidak paham laporan keuangan; sering FOMO ikut *pom-pom* di X/Twitter |
| Jobs-to-be-done | "Bantu saya tahu saham mana yang layak dibeli hari ini, dengan risiko terukur, dan jelaskan kenapa." |
| Hari tipikal | 07:00 cek push *Daily Brief* di HP → 09:30 cek 1–2 ticker di watchlist saat istirahat ngantor → 12:00 baca news terpilih → 15:30 cek kembali sebelum tutup pasar → akhir pekan baca *Akademi Nubuat* |
| Fitur prioritas | Daily Picks dengan narasi AI, *Akademi Nubuat*, Watchlist, Alerts, Mobile push |
| Tier yang cocok | **Starter (Rp 99k/bulan)** — entry yang affordable |

### Persona 2 — Swing Trader Aktif (*Sweet Spot*)

| Atribut | Detail |
|---|---|
| Nama | **Rama Adhitya** |
| Usia | 32 tahun |
| Profesi | Freelance konsultan finance, Surabaya |
| AUM | Rp 200 juta – Rp 800 juta |
| Pengalaman | 5 tahun, *full-time trader part-time* di sela proyek |
| Device | MacBook Air + iPhone, 1 monitor 27" |
| Frustration | Stockbit terlalu *community-noise*; AlphaFlow bagus untuk flow tapi tanpa fundamental; sering buka 4 tab untuk research |
| Jobs-to-be-done | "Saya butuh *single canvas* untuk *swing 3–10 hari* — chart, broker flow, fundamental quick check, news, semuanya tanpa pindah tab." |
| Hari tipikal | 07:30 buka *Daily Brief* di laptop → 09:00 review watchlist & alert overnight → 09:30 entry/manage posisi → 12:00 lunch + screen sektor → 14:00 update strategi → 15:30 review hari → 21:00 cek news global |
| Fitur prioritas | Multi-pane workspace, Daily Picks dengan entry/SL/TP, Bandarmology + Brokermology, Research Aggregator, Backtest, AI Copilot |
| Tier yang cocok | **Pro (Rp 299k/bulan)** — *sweet spot persona* paling profitabel |

### Persona 3 — Day Trader Pro (*Power User*)

| Atribut | Detail |
|---|---|
| Nama | **Bagas Wirawan** |
| Usia | 38 tahun |
| Profesi | Independent trader (ex-prop trader sekuritas), Bandung |
| AUM | Rp 1,5 Mrd – Rp 5 Mrd |
| Pengalaman | 12 tahun, sebelumnya prop trader |
| Device | 3 monitor (2x 27" + 1x ultrawide), MacBook Pro, iPad untuk mobile alert |
| Frustration | Bloomberg terlalu mahal; tools lokal terlalu retail; butuh L2 depth + intraday foreign flow 5m + hotkey ala terminal |
| Jobs-to-be-done | "Saya butuh latency rendah, L2 depth, intraday foreign flow 5-menit, dan hotkey untuk eksekusi *workflow* secepat mungkin." |
| Hari tipikal | 07:00 pre-market scan workspace 3-monitor → 09:00–11:30 aktif intraday → 11:30 short break → 13:30–15:30 second session → 16:00 review + journaling → 19:00 cek macro US futures |
| Fitur prioritas | L2 depth, intraday foreign flow 5m, multi-chart workspace, command palette, hotkey, alerts unlimited, API access |
| Tier yang cocok | **Elite (Rp 899k/bulan)** — power user, ambassador potensial |

### Persona 4 — Investor Fundamental Jangka Panjang (*Buffett Wannabe*)

| Atribut | Detail |
|---|---|
| Nama | **Sari Wulandari** |
| Usia | 41 tahun |
| Profesi | Dokter spesialis + investor pribadi, Yogyakarta |
| AUM | Rp 800 juta – Rp 2 Mrd |
| Pengalaman | 8 tahun, fokus *value investing*, jarang trading harian |
| Device | iPad Pro + iPhone, occasional MacBook saat akhir pekan |
| Frustration | Aplikasi lokal terlalu trader-centric; sulit cari peer comparison; laporan sekuritas tersebar; DCF manual di Excel |
| Jobs-to-be-done | "Saya butuh data fundamental 10 tahun, peer compare, DCF builder, dan agregasi laporan sekuritas dalam satu tempat." |
| Hari tipikal | Mon-Fri: cek portofolio 5 menit pagi → Weekend: 3–4 jam research mendalam (laporan keuangan, DCF, peer compare) |
| Fitur prioritas | Fundamental 10-year, Fundachart compare, DCF/DDM builder, Research Aggregator, Dividend tracker, Corporate action calendar |
| Tier yang cocok | **Pro (Rp 299k/bulan)** atau **Starter + research add-on** |

### Persona 5 — Quant/Algo Hobbyist (*Builder*)

| Atribut | Detail |
|---|---|
| Nama | **Rendra Subagja** |
| Usia | 29 tahun |
| Profesi | Software engineer (backend), Jakarta |
| AUM | Rp 300 juta (50% algorithmic) |
| Pengalaman | 4 tahun coding strategy di Python + 3 tahun trading manual |
| Device | Linux desktop + MacBook + iPhone |
| Frustration | TradingView Pine Script terbatas; broker IDX tidak buka API; backtest engine lokal mahal |
| Jobs-to-be-done | "Saya butuh backtest engine yang cepat, API access untuk pull data, dan strategy marketplace untuk monetize ide saya." |
| Hari tipikal | Weekday: monitor strategy hasil → Weekend: backtest iterasi baru → Discord active di strategy marketplace |
| Fitur prioritas | Backtest no-code + scripted, Paper trading, Strategy marketplace, API access, custom indicator language |
| Tier yang cocok | **Elite (Rp 899k/bulan)** — API access + Strategy marketplace |

---

## 3. User Journey Maps

Setiap journey memetakan *touchpoint*, emosi (😊 positif, 😐 netral, 😟 negatif), painpoint, dan opportunity desain.

### Journey 1 — Onboarding Pertama Kali

**Goal:** Free user signup → KYC ringan → tour → *first Daily Pick view* dalam <5 menit (KPI Activation, Section 14.2).

| # | Step | Touchpoint | Emosi | Painpoint | Opportunity |
|---|---|---|---|---|---|
| 1 | Klik iklan Instagram / referral link | Landing page `/` | 😐 Curious | Loading lama; copy tidak meyakinkan | Hero dengan *live preview* Daily Pick; LCP <1.5s |
| 2 | Klik "Coba Gratis" | `/signup` | 😊 Excited | Form panjang | Form 3 field: email, password, atau `Continue with Google` |
| 3 | Verifikasi email (link) | Email + browser | 😐 | OTP delay; ke spam folder | Magic link 6 detik delivery; *resend* CTA visible |
| 4 | Wizard 1: Tipe trader | `/onboarding/step-1` | 😊 | Terlalu banyak pilihan | 4 kartu persona (Pemula/Swing/Day/Investor) dengan ilustrasi |
| 5 | Wizard 2: Sektor minat | `/onboarding/step-2` | 😊 | Tidak tahu pilih apa | 12 sektor IDX-IC dengan ikon; "Lewati" tersedia |
| 6 | Wizard 3: Tonton 30-detik tour video | `/onboarding/step-3` | 😐 | Video panjang | Video 30 detik dengan caption; "Lewati" prominently shown |
| 7 | Wizard 4: Watchlist seed (BBRI/BBCA/TLKM auto-suggest) | `/onboarding/step-4` | 😊 | Tidak tahu pilih ticker | Suggest 5 ticker populer berdasarkan persona di step 1 |
| 8 | Dashboard pertama dengan 3 Daily Picks preview | `/dashboard` | 😄 Wow | Overload info | Highlight 1 pick "Untuk Anda hari ini" dengan tooltip walkthrough |
| 9 | Klik 1 pick → ticker page | `/ticker/BBRI` | 😄 | Banyak tab tidak tahu mulai | Default tab `Overview`; banner "Setup hari ini dijelaskan AI" |
| 10 | AI Copilot otomatis buka dengan greeting | `/ticker/BBRI?ai=open` | 😄 | — | Pesan: "Halo Dimas, saya bisa bantu jelaskan setup BBRI sekarang. Ketik atau pilih pertanyaan." |

**Success metric:** *Time to first Daily Pick view* <5 menit; onboarding completion ≥70%.

---

### Journey 2 — Trader Pagi (07:30 WIB Notifikasi)

**Goal:** Persona Rama (Swing Trader Pro) mendapat notifikasi *Daily Brief* → buka aplikasi → screen Daily Picks → set alert.

| # | Step | Touchpoint | Emosi | Painpoint | Opportunity |
|---|---|---|---|---|---|
| 1 | 06:30 WIB push email *Daily Brief* tiba | Email | 😊 | — | Email subject: "Daily Brief 12 Mei: 3 setup terbaik & 1 risiko" |
| 2 | 07:30 WIB push web/mobile notification "Picks ready" | Push | 😊 | Notif terlalu banyak | Bundling: 1 notif harian, opt-in per ticker watchlist |
| 3 | Buka desktop app → dashboard `/dashboard` | Desktop Tauri | 😊 | Loading lama | Cache last view, skeleton 100ms, full load <800ms |
| 4 | Scan Daily Picks 10 (Pro tier) | Card list | 😊 | Sulit bedain prioritas | Sort by R/R desc, confidence; filter sector |
| 5 | Klik BBNI pick → ticker page | `/ticker/BBNI` | 😊 | — | Page split: chart kiri, panel kanan dengan entry/SL/TP highlighted |
| 6 | Cek tab `Bandarmology` untuk konfirmasi flow | Tab | 😊 | Tab switch lambat | Tab content prefetch saat hover |
| 7 | Tanya AI: "Kenapa rekomendasi BUY?" | AI panel | 😄 | Jawaban terlalu generic | AI menjawab dengan citation broker flow + news spesifik |
| 8 | Set alert: harga touch 4.500 (entry zone) | Alert modal | 😊 | Form banyak field | 1-click "Alert saat entry zone" preset |
| 9 | Add ke watchlist `Swing Mei` | Watchlist | 😊 | Hapus tidak intuitif | Optimistic update + undo toast 5 detik |
| 10 | Kembali ke dashboard, screen sektor lain | `/dashboard` | 😊 | — | Sidebar tetap konsisten; *back* via `Esc` |

**Success metric:** WAT (Weekly Active Trader); average session ≥12 menit.

---

### Journey 3 — Trader Intraday (Alert Masuk)

**Goal:** Persona Bagas (Day Trader) mendapat alert "BBRI touch entry 4.250", buka chart, cek broker flow, tanya AI, putuskan entry.

| # | Step | Touchpoint | Emosi | Painpoint | Opportunity |
|---|---|---|---|---|---|
| 1 | 10:15 WIB push mobile "BBRI 4.250 touched" | Mobile push | 😊 Urgent | Notif tertunda | Latency push <10s; preview info di notif (price, change) |
| 2 | Tap push → mobile app langsung ke `/ticker/BBRI` | Mobile | 😊 | Reload data | Resume session, cached chart, refresh real-time |
| 3 | Pinch zoom chart 5m timeframe | Chart gesture | 😊 | Drawing tools rumit | Bottom sheet untuk drawing tools |
| 4 | Cek panel `Foreign Flow 5m` (Pro/Elite) | Bottom tab | 😄 | Panel terlalu kecil | Swipe up untuk fullscreen flow chart |
| 5 | Tanya AI Copilot via mic icon | AI sheet | 😄 | Voice STT tidak akurat | Whisper API + ID/EN bilingual |
| 6 | AI jawab: "Foreign net buy 5m terakhir +12 Mrd, broker CC akumulasi 2 hari berturut..." | AI response | 😄 | Response delay | Streaming token, p95 <2s |
| 7 | Switch ke desktop (sync session) | Desktop | 😊 | Logout di mana-mana | Session sync via JWT refresh |
| 8 | Buka workspace `Day Trader Pro` 3-pane | Desktop workspace | 😊 | Layout reset | Workspace persistence per device + sync |
| 9 | Klik command palette `Cmd+K` → ketik `BBRI <GO>` | Cmd palette | 😄 | — | Bloomberg-style: fuzzy match instant |
| 10 | Set bracket alert (TP1, SL) | Alert | 😊 | Field banyak | Pre-fill dari Daily Pick recommendation |

**Success metric:** AI query per active user/week ≥5; p95 real-time tick <500ms.

---

### Journey 4 — Sunday Investor (Research Mode)

**Goal:** Persona Sari (Fundamental Investor) menggunakan akhir pekan untuk mendalami 2–3 emiten fundamental + DCF.

| # | Step | Touchpoint | Emosi | Painpoint | Opportunity |
|---|---|---|---|---|---|
| 1 | Minggu 09:00 buka iPad, masuk Nubuat web | iPad Safari | 😊 | UI desktop tidak responsive di iPad | Tablet layout: 2-pane, *touch-friendly* |
| 2 | Buka tab `Research Aggregator` | `/research` | 😄 | Banyak laporan tidak urut | Filter: sector, sekuritas, rating, tanggal; sort by relevance |
| 3 | Cari laporan UNVR Q1 2026 | Search bar | 😊 | — | Meilisearch instant <50ms |
| 4 | Baca AI Synthesis dari 5 sekuritas | Synthesis card | 😄 | — | "Konsensus: HOLD, target Rp 3.250 (median dari 5 analis)" |
| 5 | Klik laporan original BRI Danareksa | Modal PDF viewer | 😊 | PDF lambat load | PDF.js streaming + sidebar OCR text |
| 6 | Buka tab `Fundamental` UNVR | `/ticker/UNVR/fundamental` | 😄 | Banyak angka | Tabel quarterly dengan toggle common-size; chart 10-year revenue |
| 7 | Buka modul DCF builder | `/ticker/UNVR/dcf` | 😄 | DCF rumit | Wizard 4 step: revenue growth, margin, terminal, WACC; preset "konservatif/moderat/agresif" |
| 8 | Compare UNVR vs ICBP vs MYOR (peer compare) | `/compare?t=UNVR,ICBP,MYOR` | 😄 | — | Side-by-side 5-kolom table + radar chart |
| 9 | Save research note | Note | 😊 | Tidak ada export | Export PDF + Markdown; sync ke email |
| 10 | Set price alert UNVR pada level Lynch fair value | Alert | 😊 | — | "Alert saat harga ≤ Lynch FV (Rp 2.890)" |

**Success metric:** Pro tier retention; tier upgrade Starter → Pro.

---

### Journey 5 — Subscription Upgrade (Free → Paid)

**Goal:** Free user (3 minggu pemakaian) menabrak rate limit → trial Pro 7 hari → konversi bayar.

| # | Step | Touchpoint | Emosi | Painpoint | Opportunity |
|---|---|---|---|---|---|
| 1 | Hari ke-21 free, klik query AI ke-6 hari ini | AI panel | 😟 Frustrated | Hard wall | Pop-up *kontekstual*: "5/5 query free habis. Coba Pro 7 hari gratis tanpa kartu kredit." |
| 2 | Klik "Lihat Pro" | Pricing page `/pricing` | 😐 | Pricing kompleks | Highlight Pro tier with "Most Popular" badge; comparison table sticky |
| 3 | Klik "Mulai Trial 7 Hari" | Trial modal | 😊 | — | Trial tanpa CC; reminder H-2 sebelum berakhir |
| 4 | 5 menit kemudian, dapat AI unlimited + Research Aggregator | App | 😄 | — | "Selamat! Pro features aktif. Mau tour fitur baru?" |
| 5 | Hari ke-5 trial: sudah pakai Research Aggregator 40x | App | 😄 | — | Email midpoint: "Anda sudah pakai 40 laporan minggu ini" |
| 6 | Hari ke-6: email reminder "Trial habis besok, lanjut?" | Email | 😐 | Subscription anxiety | Email dengan testimoni + diskon annual (17% off) |
| 7 | Klik "Lanjut Berlangganan" | `/billing` | 😊 | Form pembayaran panjang | Midtrans Snap: GoPay 2-tap, VA otomatis, kartu autoCharge |
| 8 | Pilih annual Rp 2.99 juta | Checkout | 😊 | Harga besar | Tampilkan "Rp 249.166/bulan jika annual" + cashback program |
| 9 | Bayar via GoPay | Midtrans | 😊 | Redirect lama | Webhook async; immediate optimistic activation |
| 10 | Kembali ke app, badge "Pro" tampil di profile | Dashboard | 😄 | — | Toast "Selamat bergabung Pro! Buka workspace Pro?" |

**Success metric:** Trial → Paid ≥30%; Free → Paid ≥4%.

---

## 4. Information Architecture

### 4.1 Sitemap (ASCII tree)

```
nubuat.id (Public)
├── / (Landing)
├── /pricing
├── /about
├── /blog
│   ├── /blog/<slug>
│   └── /blog/category/<tag>
├── /academy (Akademi Nubuat — preview Free)
├── /research (preview)
├── /legal/terms
├── /legal/privacy
├── /legal/disclaimer
├── /signup
├── /login
├── /forgot-password
└── /verify-email

app.nubuat.id (Authenticated)
├── /dashboard ............................. (All tier)
│   ├── Daily Brief
│   ├── Daily Picks list
│   ├── Watchlist preview
│   ├── Market overview (IHSG, sectoral)
│   └── News feed
├── /picks ................................. (Starter+: 3/hari; Pro+: 10/hari)
│   ├── /picks (list view)
│   └── /picks/<id> (detail with chart)
├── /watchlist ............................. (All tier; quota by tier)
│   ├── /watchlist/<folder>
│   └── /watchlist/manage
├── /ticker/<code> ......................... (All tier)
│   ├── ?tab=overview (default)
│   ├── ?tab=technical
│   ├── ?tab=fundamental ................... (Pro+ deep)
│   ├── ?tab=bandarmology .................. (Starter+ basic; Pro+ deep)
│   ├── ?tab=brokermology .................. (Pro+ only)
│   ├── ?tab=research ...................... (Pro+ only)
│   ├── ?tab=news
│   └── ?tab=ai (Copilot context)
├── /screener .............................. (All tier; preset by tier)
│   ├── /screener/preset/<id>
│   └── /screener/save
├── /workspace ............................. (Pro+ only)
│   ├── /workspace/<id>
│   └── /workspace/new
├── /backtest .............................. (Pro+ basic; Elite advanced)
│   ├── /backtest/builder
│   ├── /backtest/<id>/result
│   └── /backtest/library
├── /paper-trading ......................... (Elite only)
│   ├── /paper-trading/portfolio
│   └── /paper-trading/history
├── /strategy-marketplace .................. (Elite only — v2 M18+)
│   ├── /strategy-marketplace/browse
│   ├── /strategy-marketplace/<id>
│   └── /strategy-marketplace/publish
├── /portfolio ............................. (Starter+)
│   ├── /portfolio/<id>
│   ├── /portfolio/add
│   └── /portfolio/import
├── /alerts ................................ (Starter+ basic; Pro+ unlimited)
│   ├── /alerts/manage
│   └── /alerts/history
├── /research .............................. (Pro+ only)
│   ├── /research/feed
│   ├── /research/<id>
│   └── /research/saved
├── /ai-copilot ............................ (All tier; rate-limited)
│   ├── /ai-copilot/chat
│   └── /ai-copilot/history
├── /academy ............................... (Free preview; tier-locked content)
│   ├── /academy/course/<slug>
│   └── /academy/progress
├── /community ............................. (Starter+ Discord/Telegram link)
├── /settings
│   ├── /settings/profile
│   ├── /settings/preferences (theme, density, lang)
│   ├── /settings/notifications
│   ├── /settings/subscription
│   ├── /settings/billing
│   ├── /settings/api-keys ................. (Elite only)
│   ├── /settings/security
│   └── /settings/sessions
└── /help
    ├── /help/faq
    ├── /help/contact
    └── /help/keyboard-shortcuts
```

### 4.2 Pemetaan Tier Akses

| Section | Free | Starter | Pro | Elite |
|---|:---:|:---:|:---:|:---:|
| Dashboard | ✓ (limited) | ✓ | ✓ | ✓ |
| Daily Picks | preview 1 | 3/hari | 10/hari + intraday | 10/hari + intraday + custom |
| Ticker page Overview | ✓ | ✓ | ✓ | ✓ |
| Ticker Technical | basic | full | full | full + L2 depth |
| Ticker Fundamental | basic | basic | deep + DCF | deep + DCF |
| Bandarmology | locked | broker 1D | full + intraday | full + intraday 5m |
| Brokermology | locked | locked | ✓ | ✓ + network graph |
| Research Aggregator | preview | preview | ✓ | ✓ + priority |
| Workspace multi-pane | locked | locked | ✓ | ✓ + sync |
| Backtest | locked | locked | basic (3 strategy) | unlimited + script |
| Paper Trading | locked | locked | locked | ✓ |
| Strategy Marketplace | browse | browse | publish | publish + revenue |
| AI Copilot | 5/hari | 50/hari | 500/hari Sonnet | unlimited + Opus mode |
| Alerts | 5 active | 50 active | unlimited | unlimited + WA |
| Mobile + Desktop app | mobile only | mobile | mobile + desktop | mobile + desktop |
| API access | locked | locked | locked | read-only |
| Concierge onboarding | locked | locked | locked | ✓ |

---

## 5. Wireframe ASCII

> Catatan: Wireframe di bawah menggunakan plain ASCII (compatible *non-monospace renderer*). Setiap wireframe diakhiri dengan caption yang menjelaskan komponen, interaksi, dan *tier-gate*.

### 5.1 Landing Page (`/`)

```
+===============================================================================+
|  [Nubuat logo]   Produk  Harga  Akademi  Blog  Riset   [Masuk]  [Coba Gratis]|
+===============================================================================+
|                                                                               |
|    Bukan tebakan. Nubuat.                                                     |
|    Bloomberg-grade analytics. Indonesia-native data. Harga retail.            |
|                                                                               |
|    [ Coba Gratis 7 Hari ]   [ Lihat Demo Live ▶ ]                            |
|                                                                               |
|    +---------------------------------------------------------+                |
|    |   < LIVE DEMO: Daily Picks Card BBRI (animated) >        |               |
|    |   Entry 4.250 | SL 4.150 | TP 4.500 | R/R 2.5 | Conf 7/10|               |
|    +---------------------------------------------------------+                |
|                                                                               |
|    Dipercaya oleh 5.000+ trader retail Indonesia*                             |
|    [logo testimoni: Stockbit komunitas, AlphaFlow refugee, dll]               |
+-------------------------------------------------------------------------------+
|  5 Pilar Diferensiasi                                                         |
|  +----------+ +----------+ +----------+ +----------+ +----------+             |
|  | Multi-   | | Daily    | | Research | | AI       | | Bloomberg|             |
|  | Lens     | | Picks +  | | Hub ID   | | Copilot  | | Terminal |             |
|  | Verdict  | | SL/TP    | | (15 sek) | | ID/EN    | | Hotkeys  |             |
|  +----------+ +----------+ +----------+ +----------+ +----------+             |
+-------------------------------------------------------------------------------+
|  Section: Daily Picks Engine — sains di balik setiap trade                    |
|  [screenshot pick card + narrative]                                           |
+-------------------------------------------------------------------------------+
|  Section: Bandarmology — baca jejak smart money                               |
|  [animated broker concentration heatmap]                                      |
+-------------------------------------------------------------------------------+
|  Section: Pricing 4-tier comparison [tabel]                                   |
+-------------------------------------------------------------------------------+
|  Section: FAQ                                                                 |
+-------------------------------------------------------------------------------+
|  Footer: Tentang | Kontak | Karier | Legal | Status | Twitter | LinkedIn      |
+===============================================================================+
```

**Caption:** Hero CTA ganda — *Coba Gratis* (primary, trial 7 hari) & *Lihat Demo Live* (secondary, animated demo). Trust signal di bawah hero (logo testimoni). LCP target <1.5s, hero image *progressive*. Live demo adalah video MP4 muted autoplay dengan *fallback* WebP statis. CTA *sticky* muncul setelah scroll 30%. Tidak ada *dark pattern*: harga transparan di hero.

---

### 5.2 Signup Page (`/signup`)

```
+===============================================================================+
|                              [Nubuat logo]                                    |
+===============================================================================+
|                                                                               |
|        +-----------------------------------------------------------+          |
|        |                                                           |          |
|        |   Mulai Trial Gratis 7 Hari                              |          |
|        |   Tanpa kartu kredit. Batal kapan saja.                  |          |
|        |                                                           |          |
|        |   [  Continue with Google  ]    [  Continue with Apple ] |          |
|        |                                                           |          |
|        |   --- atau ---                                            |          |
|        |                                                           |          |
|        |   Email:    [______________________________]              |          |
|        |   Password: [______________________________] [eye]        |          |
|        |             Min 8 karakter, 1 angka, 1 simbol             |          |
|        |                                                           |          |
|        |   [ ] Saya setuju dengan [Syarat] dan [Privasi]           |          |
|        |                                                           |          |
|        |   [          Buat Akun Gratis          ]                  |          |
|        |                                                           |          |
|        |   Sudah punya akun?  Masuk                                |          |
|        +-----------------------------------------------------------+          |
|                                                                               |
|        Disclaimer: Layanan Nubuat untuk tujuan edukasi & analisis.            |
|        Bukan ajakan jual/beli efek. Investasi adalah tanggung jawab pribadi.  |
+===============================================================================+
```

**Caption:** OAuth (Google, Apple) di atas form email-password untuk reduce friction. Password strength inline. Checkbox legal *unchecked* by default (sesuai best practice). Disclaimer di bawah agar user paham *tone* legal sejak awal. *Reduced motion* untuk loading spinner.

---

### 5.3 Onboarding Wizard Step 1 — Tipe Trader (`/onboarding/step-1`)

```
+===============================================================================+
|  [Nubuat logo]                                                       Step 1/4 |
|  ----[#]----[ ]----[ ]----[ ]----                                             |
+===============================================================================+
|                                                                               |
|        Halo! Bagaimana gaya trading Anda?                                     |
|        Pilih satu yang paling sesuai — Anda bisa ubah kapan saja.             |
|                                                                               |
|        +----------------+  +----------------+  +----------------+             |
|        |  [icon pemula] |  | [icon swing]   |  | [icon day]     |             |
|        |                |  |                |  |                |             |
|        |  Pemula        |  |  Swing Trader  |  |  Day Trader    |             |
|        |  <1 tahun      |  |  3–10 hari     |  |  Intraday      |             |
|        |  pengalaman    |  |  hold          |  |                |             |
|        |                |  |                |  |                |             |
|        |  [ Pilih ]     |  |  [ Pilih ]     |  |  [ Pilih ]     |             |
|        +----------------+  +----------------+  +----------------+             |
|                                                                               |
|        +----------------+  +----------------+                                 |
|        |  [icon long]   |  | [icon quant]   |                                 |
|        |                |  |                |                                 |
|        |  Investor      |  |  Quant /       |                                 |
|        |  Fundamental   |  |  Algo          |                                 |
|        |  >3 bulan hold |  |  Backtest +    |                                 |
|        |                |  |  API           |                                 |
|        |  [ Pilih ]     |  |  [ Pilih ]     |                                 |
|        +----------------+  +----------------+                                 |
|                                                                               |
|                                       [ Lewati ]    [ Lanjut ]                |
+===============================================================================+
```

**Caption:** 5 persona card dengan ilustrasi sederhana. Card berperan sebagai *radio group*. Pilihan menentukan default tier suggestion, watchlist seed, dan workspace template. Tombol *Lewati* tersedia (progressive disclosure principle). Stepper di header menunjukkan progress.

---

### 5.4 Onboarding Wizard Step 2–4 (Summary)

```
Step 2: Sektor minat (multi-select 12 sektor IDX-IC)
  +-----+ +-----+ +-----+ +-----+
  |Bank | |Tech | |Consu| |Energ|
  +-----+ +-----+ +-----+ +-----+
  + 8 sektor lain ...

Step 3: Tour 30-detik video
  +----------------------------+
  |   [video player muted ▶]   |
  |   30 detik tur Nubuat      |
  +----------------------------+
  [ Lewati ]   [ Lanjut ]

Step 4: Watchlist awal
  Sugesti berdasarkan persona Anda:
  [✓] BBRI  [✓] BBCA  [✓] TLKM  [ ] ASII  [ ] UNVR
  + Tambah ticker lain: [_______]
  [ Selesai ]
```

**Caption:** Step 2 default-select 3 sektor populer (Banking, Consumer Staples, Tech). Step 3 *optional*. Step 4 pre-check 3 ticker blue chip; user bisa hapus/tambah. Tombol *Selesai* memicu redirect `/dashboard` dengan tooltip walkthrough.

---

### 5.5 Dashboard Home (`/dashboard`)

```
+===============================================================================+
| [Nubuat] [Search Cmd+K_______]   [IHSG 7.245 +0.45%]   [@] [bell] [avatar]    |
+===============================================================================+
| Side Nav                                                                      |
| [#] Dashboard                                                                 |
| [P] Daily Picks                                                               |
| [W] Watchlist                                                                 |
| [T] Ticker...                                                                 |
| [R] Research      MAIN AREA                                                   |
| [S] Screener      +---------------------------------------------------+       |
| [B] Backtest      | Daily Brief — 12 Mei 2026                          |      |
| [O] Portfolio     | IHSG +0.45% | Foreign Net Buy +Rp 280 Mrd          |      |
| [A] Alerts        | Top sector: Banking +1.2% | Tech -0.8%             |      |
| [AI] AI Copilot   | [Baca selengkapnya ▼]                              |      |
| -----             +---------------------------------------------------+       |
| [⚙] Settings      +----------------------+ +----------------------+           |
|                   | Daily Picks (3/10)   | | Watchlist (12)       |           |
|                   |                      | |                      |           |
|                   | BBRI  4250 +0.95%    | | BBRI  4250 +0.95% ★  |           |
|                   |   Entry 4250         | | BBCA  9525 +0.13% ★  |           |
|                   |   SL 4150 TP 4500    | | TLKM  3450 -0.29%    |           |
|                   |   R/R 2.5 Conf 7/10  | | ASII  4830 +0.62%    |           |
|                   |   [ Detail ]         | | UNVR  3100 -0.32% ★  |           |
|                   +----------------------+ | + 7 lainnya          |           |
|                   | BBNI  5025 +1.21%    | | [ Kelola ]           |           |
|                   |   Entry 5025...      | +----------------------+           |
|                   +----------------------+                                    |
|                   | ANTM  1730 +2.05%    | +----------------------+           |
|                   |   Entry 1735...      | | News terpilih        |           |
|                   +----------------------+ | -----                |           |
|                                            | • BI tahan suku bunga|           |
|                   +----------------------+ |   di 5,5% (Kontan)   |           |
|                   | Market Heatmap       | | • TLKM Q1 beat estim |           |
|                   | (sektoral)           | |   (Bisnis.com)       |           |
|                   |                      | | • Foreign net buy    |           |
|                   | [Banking 1.2%▲]      | |   capai Rp 280 Mrd   |           |
|                   | [Tech -0.8%▼]        | | [Lihat semua]        |           |
|                   | [Consumer 0.4%▲]     | +----------------------+           |
|                   | ... 9 sektor lain    |                                    |
|                   +----------------------+ +----------------------+           |
|                                            | AI Brief (klik utk   |           |
|                                            | tanya)               |           |
|                                            | "Tanya Nubuat AI..." |           |
|                                            +----------------------+           |
+===============================================================================+
```

**Caption:** Tata letak 3-kolom: side nav (collapsible), main grid responsive, right rail untuk news + AI. Density toggle di top right. Setiap card adalah *route-aware* (klik buka full page). Daily Picks card menampilkan count tier (3/10 untuk Starter, 10/10 untuk Pro). Free tier menampilkan 1 pick preview + lock badge. Drag-resize aktif di Pro+ untuk customize layout.

---

### 5.6 Ticker Page — Header & Tabs (`/ticker/BBRI`)

```
+===============================================================================+
| [Nubuat] [BBRI___ <GO>]   [IHSG 7.245 +0.45%]    [@] [bell] [avatar]          |
+===============================================================================+
| < kembali     BBRI · Bank Rakyat Indonesia (Persero) Tbk · Banking · LQ45     |
|                                                                               |
|   Rp 4.250  +40 (+0.95%)  ▲   Vol 125.4 jt   Value Rp 532 Mrd                |
|   Bid 4.245 / Ask 4.250   Day Range 4.220–4.275   52W 3.850–4.620            |
|                                                                               |
|   Verdict Nubuat: 7.4 / 10  [BUY]  ↗ Klik untuk factor breakdown              |
|   Setup: Pullback ke MA20  ·  Time horizon: Swing 3–5d  ·  Conf 7/10          |
|                                                                               |
|   [ + Watchlist ]  [ 🔔 Alert ]  [ 📊 Chart ]  [ 🤖 Tanya AI ]                |
+-------------------------------------------------------------------------------+
| [Overview] [Technical] [Fundamental] [Bandarmology] [Brokermology] [News]     |
| [Research] [AI] [Options*] [Compare]                                          |
+-------------------------------------------------------------------------------+
|                                                                               |
|  TAB CONTENT (default Overview)                                               |
|  +----------------------------+ +------------------------------+              |
|  | Mini chart 1D 5m           | | Key stats                    |              |
|  | [candle chart]             | | Market Cap   Rp 643 T        |              |
|  |                            | | PER          12.4x           |              |
|  +----------------------------+ | PBV          1.8x            |              |
|                                 | ROE          18.5%           |              |
|  +----------------------------+ | Div Yield    5.2%            |              |
|  | Today's flow               | | Beta         0.92            |              |
|  | Foreign  +Rp 45 Mrd        | | Free float   43.2%           |              |
|  | Domestic -Rp 12 Mrd        | +------------------------------+              |
|  | Top buyer  CC (+Rp 22 Mrd) |                                               |
|  | Top seller YP (-Rp 18 Mrd) | +------------------------------+              |
|  +----------------------------+ | Latest news                  |              |
|                                 | • TLKM Q1 beat ...           |              |
|  +----------------------------+ | • Foreign net buy banking    |              |
|  | AI Summary (auto)          | | • BBRI dividend update       |              |
|  | "BBRI menunjukkan pullback  | +------------------------------+              |
|  |  ke MA20 dengan dukungan   |                                               |
|  |  foreign net buy dan       | +------------------------------+              |
|  |  akumulasi broker CC..."   | | Research consensus           |              |
|  | [Sumber: 3 broker reports] | | BUY 4  HOLD 1  SELL 0        |              |
|  | [Tanya lebih lanjut →]     | | Target median Rp 4.700       |              |
|  +----------------------------+ +------------------------------+              |
+===============================================================================+
```

**Caption:** Header menampilkan harga real-time, verdict score (klik expand), CTA primary 4 (Watchlist, Alert, Chart fullscreen, AI). Tab horizontal dengan tier-lock badge (Bandarmology lock untuk Free, Brokermology lock untuk Starter ke bawah). Tab Overview menampilkan ringkasan dari setiap tab lain (progressive disclosure principle). AI Summary auto-generate tiap pagi pre-market, dengan citation.

---

### 5.7 Ticker Page — Tab Technical

```
+-------------------------------------------------------------------------------+
| [Overview] [TECHNICAL*] [Fundamental] [Bandarmology] [Brokermology] [News]    |
+-------------------------------------------------------------------------------+
| Timeframe: [1m] [5m] [15m] [1H] [4H] [1D*] [1W] [1M]   Density: [compact]     |
|                                                                               |
|  +----------------------------------------------------+ +-----------------+   |
|  |  CHART (TradingView Lightweight Charts)            | | INDICATOR PANEL |   |
|  |                                                    | |                 |   |
|  |  4400 -                                            | | [✓] MA20  ◐     |   |
|  |       _.--.                                        | | [✓] MA50  ◐     |   |
|  |  4300 -    `.       _.--                           | | [✓] BBands      |   |
|  |              `.   /                                | | [ ] RSI         |   |
|  |  4200 -        `-'                                 | | [ ] MACD        |   |
|  |                                                    | | [ ] ATR         |   |
|  |  Volume:                                           | | + Tambah        |   |
|  |  ||||| .||| || ||||| ||||                          | |                 |   |
|  |                                                    | | Patterns        |   |
|  |  Drawing: [trendline] [fib] [text] [hide]          | | • Double Bot ★  |   |
|  +----------------------------------------------------+ | • Bullish flag  |   |
|                                                        | | (confidence 78%)|   |
|  +----------------------------------------------------+ +-----------------+   |
|  | Indicators secondary panel                         |                       |
|  | RSI 14: 58.2  (Neutral)                            |                       |
|  | MACD: +12 (above signal)                           |                       |
|  | ATR 14: 85 (~2% daily range)                       |                       |
|  +----------------------------------------------------+                       |
|                                                                               |
|  Support & Resistance (auto-detected):                                        |
|  R3 4.620  R2 4.500  R1 4.350  Current 4.250  S1 4.150  S2 4.050  S3 3.950  |
|                                                                               |
|  Multi-timeframe dashboard:                                                   |
|  1H: ▲ Bullish   4H: ▲ Bullish   1D: ▲ Bullish   1W: → Neutral   1M: ▲      |
+-------------------------------------------------------------------------------+
```

**Caption:** Chart fullscreen toggle (`F`). Indicator panel kanan dengan toggle visible (eye icon) dan settings (gear). Pattern recognition ML menampilkan *confidence*. MTF dashboard di footer untuk konteks higher timeframe. Drawing tools accessible via toolbar atau hotkey (`L` line, `F` fib).

---

### 5.8 Ticker Page — Tab Fundamental

```
+-------------------------------------------------------------------------------+
| [Overview] [Technical] [FUNDAMENTAL*] [Bandarmology] [Brokermology] [News]    |
+-------------------------------------------------------------------------------+
| View: [Quarterly] [Annual]   Period: [Last 10Y ▼]   [Common-size] [YoY%]      |
|                                                                               |
|  +----------------------+ +----------------------+ +----------------------+   |
|  | Income Statement     | | Balance Sheet        | | Cash Flow            |   |
|  | Revenue              | | Total Assets         | | Op CF                |   |
|  | COGS                 | | Total Liabilities    | | Inv CF               |   |
|  | Gross Profit         | | Equity               | | Fin CF               |   |
|  | OPEX                 | | Cash                 | | Free CF              |   |
|  | EBIT                 | | Debt                 | | Capex                |   |
|  | Net Income           | |                      | |                      |   |
|  +----------------------+ +----------------------+ +----------------------+   |
|                                                                               |
|  Ratios:                                                                      |
|  Profitability  ROE 18.5%  ROA 2.4%  ROIC 12%  NPM 26%                       |
|  Leverage       DER 5.8x   DAR 0.85  ICR 4.2x                                |
|  Liquidity      Current 1.2  Quick 1.1                                       |
|  Valuation      PER 12.4x  PBV 1.8x  EV/EBITDA 8.5x  PEG 1.2                 |
|                                                                               |
|  +----------------------+ +----------------------+                            |
|  | Fundachart compare   | | Valuation models     |                            |
|  | [chart: Revenue +    | | DCF        Rp 4.850  |                            |
|  |  Net Income overlay  | | DDM        Rp 4.600  |                            |
|  |  vs peer ASII]       | | RV peer    Rp 4.500  |                            |
|  |                      | | Reverse DCF g=5.2%   |                            |
|  |                      | | Graham#    Rp 4.200  |                            |
|  |                      | | [Buka DCF builder →] |                            |
|  +----------------------+ +----------------------+                            |
|                                                                               |
|  Earnings surprise: Q1 2026 EPS 105 (consensus 98, beat +7.1%) ✓             |
|  Dividend: Yield 5.2%, next cum date 24 Jun 2026, projected Rp 220/lembar    |
+-------------------------------------------------------------------------------+
```

**Caption:** Table financial 10 tahun dengan toggle common-size + YoY%. Ratio engine di-grup berdasarkan kategori. Fundachart compare interaktif (multi-select item & metric). Valuation models inline dengan link ke DCF builder. Earnings & dividend di footer untuk *quick check*. Free tier menampilkan tahun terakhir + lock untuk historical 10Y.

---

### 5.9 Ticker Page — Tab Bandarmology

```
+-------------------------------------------------------------------------------+
| [Overview] [Technical] [Fundamental] [BANDARMOLOGY*] [Brokermology] [News]    |
+-------------------------------------------------------------------------------+
| Timeframe: [1D] [5D] [20D]   Resolution: [Daily] [1H] [15m*] [5m]             |
|                                                                               |
|  +-----------------------------------------------------------------+          |
|  | Foreign Flow Intraday 5m (Pro+)                                  |         |
|  |                                                                  |         |
|  |  Rp Mrd                                                          |         |
|  |   +60 -|                              .--.                       |         |
|  |        |                          .--'    `.                     |         |
|  |   +30 -|                      .--'          `.                   |         |
|  |        |                  .--'                `.                 |         |
|  |     0 -|--------.----. .--                       --              |         |
|  |        |         `--'                                            |         |
|  |   -30 -|                                                         |         |
|  |       09:00     10:00     11:00     12:00     13:00     14:00    |         |
|  +-----------------------------------------------------------------+          |
|                                                                               |
|  +-----------------------------+ +-----------------------------+              |
|  | Bandar Phase: ACCUMULATION  | | Broker Concentration HHI    |              |
|  | (Markup imminent)           | | Buy HHI: 0.18 (concentrated)|              |
|  | Auto-tagged via Wyckoff     | | Sell HHI: 0.09 (dispersed)  |              |
|  | logic. Klik untuk metode →  | | Top 3 buyer kontrol 62%     |              |
|  +-----------------------------+ +-----------------------------+              |
|                                                                               |
|  Broker Summary (Top 10 — Hari ini)                                           |
|  +--+------+----------+----------+----------+----------+                      |
|  |# | Code | Name     | Net Buy  | Avg Price| Value    |                      |
|  +--+------+----------+----------+----------+----------+                      |
|  |1 | CC   | Mandiri  | +22 Mrd  | 4.235    | 92 Mrd   |                      |
|  |2 | RG   | Mirae    | +18 Mrd  | 4.248    | 75 Mrd   |                      |
|  |3 | BK   | J.P.Morg | +12 Mrd  | 4.252    | 48 Mrd   |                      |
|  |4 | DX   | Bahana   | +8 Mrd   | 4.241    | 32 Mrd   |                      |
|  |5 | YU   | CIMB     | +5 Mrd   | 4.240    | 25 Mrd   |                      |
|  |6 | YP   | Mirae S. | -18 Mrd  | 4.246    | 88 Mrd   |                      |
|  |7 | PD   | Indo P.  | -12 Mrd  | 4.249    | 52 Mrd   |                      |
|  | ...                                                  |                      |
|  +-----------------------------------------------------+                      |
|                                                                               |
|  Volume spike: z-score 2.1 (unusual ↑)                                        |
|  ADL: +12.5M (rising)   OBV: rising   CMF: +0.21                              |
|  Smart vs Dumb Money: smart accumulation +Rp 60 Mrd 5 hari berturut          |
+-------------------------------------------------------------------------------+
```

**Caption:** Intraday foreign flow chart adalah *signature feature* Pro+ (Free/Starter blur dengan upsell). HHI concentration menjelaskan apakah aksi terkonsentrasi (jejak bandar) atau menyebar. Tabel broker summary sortable dengan column resize. Phase tagger Wyckoff dengan link ke methodology. Free tier menampilkan teaser broker summary D-1 saja.

---

### 5.10 Brokermology Page

```
+-------------------------------------------------------------------------------+
| [Overview] [Technical] [Fundamental] [Bandarmology] [BROKERMOLOGY*] [News]    |
+-------------------------------------------------------------------------------+
| Pro+ only.                                                                    |
|                                                                               |
|  Broker Network Graph (klik node untuk drill-down)                            |
|                                                                               |
|             [CC]----[BBRI]                                                    |
|              | \    /  | \                                                    |
|              |  \  /   |  \                                                   |
|             [RG] [BK]  [BBNI]                                                 |
|              |    \    /                                                      |
|              |     [BMRI]                                                     |
|              |      |                                                         |
|             [DX]----+                                                         |
|                                                                               |
|  Top brokers tracking BBRI (rolling 20D):                                     |
|  +------+--------+----------+----------+----------+-------------+             |
|  | Code | Broker | Net 20D  | Net 60D  | Hit T+5  | Track score |             |
|  +------+--------+----------+----------+----------+-------------+             |
|  | CC   | Mandiri| +180 Mrd | +420 Mrd | 67%      | 8.2 / 10    |             |
|  | RG   | Mirae  | +120 Mrd | +280 Mrd | 62%      | 7.8 / 10    |             |
|  | BK   | J.P.M  | +85 Mrd  | +210 Mrd | 71%      | 8.5 / 10    |             |
|  +------+--------+----------+----------+----------+-------------+             |
|                                                                               |
|  Broker Lead-Lag Analysis                                                     |
|  [graf: korelasi broker→price lead by N days]                                 |
|  CC leads BBRI price by 2.4 days avg, R² = 0.61                              |
|                                                                               |
|  Broker Cluster Analysis (style):                                             |
|  Institutional: CC, BK, RG, AK    HFT: KZ, FG    Retail flow: YP, PD, NI     |
|                                                                               |
|  Flow-Price R² confidence: 0.61 (significant)                                 |
+-------------------------------------------------------------------------------+
```

**Caption:** Network graph interaktif (D3.js atau visx). Tabel performance broker dengan track score historical. Lead-lag analysis menampilkan *predictive power* broker. Cluster analysis menggunakan k-means atas style metrics. Free/Starter tier menampilkan *teaser screenshot* dengan upsell.

---

### 5.11 Daily Picks List (`/picks`)

```
+===============================================================================+
| Daily Picks · 12 Mei 2026 · Refresh terakhir 09:35 WIB                        |
+===============================================================================+
| Filter: [Sector ▼] [Setup ▼] [Time horizon ▼] [Min R/R ≥ 1.5 ▼]               |
| Sort: [Confidence ▼] [R/R] [Score]   View: [Card] [Table]                     |
+-------------------------------------------------------------------------------+
|                                                                               |
|  +------------------------------------------------------------------+         |
|  | BBRI · Bank Rakyat Indonesia · Banking                            |        |
|  | Setup: Pullback ke MA20   Time: Swing 3–5d   Score 7.4 / 10       |        |
|  | -----                                                              |        |
|  | [mini chart sparkline with entry/SL/TP zone overlay]               |        |
|  | -----                                                              |        |
|  | Entry: 4.230–4.270    SL: 4.150 (-2.4%)   TP1: 4.400 (+3.8%)       |        |
|  |                                            TP2: 4.500 (+6.4%)      |        |
|  | R/R: 2.5    Confidence: 7/10   Hit rate setup: 58% (n=142)         |        |
|  |                                                                    |        |
|  | "Pullback sehat ke support MA20 dengan akumulasi broker CC 3 hari  |        |
|  |  berturut. Foreign net buy +Rp 280 Mrd. RSI 14 oversold..."        |        |
|  |  — Nubuat AI ↗                                                     |        |
|  |                                                                    |        |
|  | [ Buka Chart ]  [ Tanya AI ]  [ + Watchlist ]  [ 🔔 Alert Entry ]  |        |
|  +------------------------------------------------------------------+         |
|                                                                               |
|  +------------------------------------------------------------------+         |
|  | BBNI · Bank Negara Indonesia · Banking                            |        |
|  | ... (similar card)                                                |        |
|  +------------------------------------------------------------------+         |
|                                                                               |
|  + 8 picks lainnya ... (Pro tier)                                              |
|                                                                               |
|  +------------------------------------------------------------------+         |
|  | Free/Starter tier locked — Upgrade ke Pro untuk 10 picks/hari    |         |
|  | + intraday refresh                                                |         |
|  | [ Upgrade ke Pro ]                                                |         |
|  +------------------------------------------------------------------+         |
+===============================================================================+
```

**Caption:** Card visual dengan mini-chart preview (canvas, Lightweight Charts) overlay entry/SL/TP zone. Setiap pick punya narrative AI singkat + citation. CTA 4 (Buka Chart, Tanya AI, Watchlist, Alert Entry). Filter & sort persistent (URL state). Free user lihat 1 pick preview + lock. Refresh intraday tag prominently.

---

### 5.12 Daily Pick Detail

```
+===============================================================================+
| < Picks · BBRI Daily Pick · 12 Mei 2026                                       |
+===============================================================================+
|                                                                               |
|  +---------------------------------------------------+ +-------------------+  |
|  | Chart 1H (last 20 days) with annotations          | | Pick Summary      |  |
|  |                                                   | |                   |  |
|  |  4400 -                  TP2 ───────────────      | | Setup             |  |
|  |  4350 -          TP1 ────────                     | | Pullback ke MA20  |  |
|  |  4300 -    .--.                                   | |                   |  |
|  |  4250 -   /    \ Entry zone (shaded)              | | Time horizon      |  |
|  |  4200 -  '----- '---                              | | Swing 3–5 hari    |  |
|  |  4150 -  SL ─────────────                         | |                   |  |
|  |                                                   | | Risk per share    |  |
|  | [legend + drawing toggle]                         | | Rp 100 (2.4%)     |  |
|  +---------------------------------------------------+ |                   |  |
|                                                       | | Reward TP1        |  |
|  Factor Breakdown (verdict 7.4/10):                   | | Rp 150 (3.5%)     |  |
|  +-----------------------+----+-------------------+   | |                   |  |
|  | Factor                | %  | Score (0-10)      |   | | R/R               |  |
|  +-----------------------+----+-------------------+   | | 1.5 (TP1)         |  |
|  | Technical setup       | 30 | 7.8 ███████░░     |   | | 2.5 (TP2)         |  |
|  | Bandarmology          | 25 | 8.2 ████████░     |   | |                   |  |
|  | Fundamental quality   | 20 | 7.5 ███████░░     |   | | Confidence        |  |
|  | Sentiment & news      | 10 | 6.5 ██████░░░     |   | | 7 / 10            |  |
|  | Macro tailwind        | 10 | 7.0 ███████░░     |   | |                   |  |
|  | Risk penalty          |  5 | -2.5 (low risk)   |   | | Historical hit    |  |
|  +-----------------------+----+-------------------+   | | rate (setup):     |  |
|                                                       | | 58% (n=142)       |  |
|  AI Narrative (full):                                 | |                   |  |
|  "BBRI menunjukkan setup pullback ke MA20 (Rp 4.230) | | Position sizing   |  |
|   yang historically valid untuk swing 3-5 hari.       | | suggest:          |  |
|   Smart money: broker CC (Mandiri) akumulasi 3 hari   | | Risk 1% portfolio |  |
|   berturut +Rp 180 Mrd. Foreign net buy +Rp 280 Mrd   | | → 10 lot @ 4.250  |  |
|   minggu ini..."                                      | |                   |  |
|  [Sumber: Broker summary IDX, AI synthesis]           | | [ Set Alert     ] |  |
|  [Tanya lanjut →]                                     | | [ Paper Trade   ] |  |
|                                                       | | [ + Watchlist   ] |  |
|                                                       | +-------------------+  |
|                                                                                |
|  Disclaimer: Analisis untuk edukasi. Bukan ajakan jual/beli. Risiko pribadi.  |
+===============================================================================+
```

**Caption:** Chart kiri menampilkan visualisasi entry/SL/TP zone. Factor breakdown 6 dimensi dengan bobot regime-adaptive. Side panel kanan adalah *action panel* dengan ringkasan numerik + CTA Set Alert/Paper Trade/Watchlist. Position sizing suggestion adaptif ke AUM user (via input portfolio). Disclaimer sticky bawah.

---

### 5.13 Screener (`/screener`)

```
+===============================================================================+
| Screener · 482 ticker aktif                                                   |
+===============================================================================+
| Presets: [Continuation] [Broker-led rotation] [Value picks] [+ Save]          |
+-------------------------------------------------------------------------------+
|                                                                               |
|  +----------------------------+ +----------------------------------------+    |
|  | FILTER PANEL               | | RESULT GRID                            |    |
|  |                            | |                                        |    |
|  | Sector                     | | 27 ticker match                        |    |
|  | [ ] Banking                | |                                        |    |
|  | [ ] Energy                 | | +------+---------+--------+--------+   |    |
|  | [ ] Tech ...               | | | Code | Price   | Δ%     | Score  |   |    |
|  |                            | | +------+---------+--------+--------+   |    |
|  | Market Cap                 | | | BBRI | 4.250   | +0.95  | 7.4    |   |    |
|  | Min Rp [______] T          | | | BBCA | 9.525   | +0.13  | 6.8    |   |    |
|  | Max Rp [______] T          | | | BMRI | 6.800   | +0.75  | 7.2    |   |    |
|  |                            | | | BBNI | 5.025   | +1.21  | 7.6    |   |    |
|  | Valuation                  | | | TLKM | 3.450   | -0.29  | 5.9    |   |    |
|  | PER min [__] max [__]      | | | ASII | 4.830   | +0.62  | 6.5    |   |    |
|  | PBV min [__] max [__]      | | | UNVR | 3.100   | -0.32  | 5.1    |   |    |
|  | ROE min [15] %             | | | ANTM | 1.730   | +2.05  | 7.8    |   |    |
|  |                            | | | MDKA | 2.450   | +1.45  | 7.1    |   |    |
|  | Liquidity                  | | | ...                                |    |
|  | Avg value 20D ≥ Rp [1] Mrd | | +------+---------+--------+--------+   |    |
|  |                            | |                                        |    |
|  | Technical                  | | Bulk action: [Add Watchlist] [Compare] |    |
|  | [ ] Above MA20             | |                                        |    |
|  | [ ] RSI 14 < 30 oversold   | |                                        |    |
|  | [ ] Golden cross 50/200    | |                                        |    |
|  |                            | |                                        |    |
|  | Bandarmology               | |                                        |    |
|  | [ ] Foreign net buy 5D > 0 | |                                        |    |
|  | [ ] Broker concentration   | |                                        |    |
|  |     HHI > 0.15             | |                                        |    |
|  |                            | |                                        |    |
|  | [ Reset ] [ Apply ]        | |                                        |    |
|  +----------------------------+ +----------------------------------------+    |
|                                                                               |
|  Save as preset: [Nama preset...] [ Save ]                                    |
+===============================================================================+
```

**Caption:** Left filter panel (collapsible mobile/tablet); right result grid dengan AG Grid (virtualization, column resize). Preset di atas (system + user saved). Bulk action di footer grid. URL state untuk shareable screener. Pro+ unlock natural language: "Cari banking PE<10 ROE>15%" via AI screener.

---

### 5.14 AI Copilot Chat (`/ai-copilot/chat`)

```
+===============================================================================+
| Nubuat AI · Powered by Claude Sonnet 4.6 (Opus tersedia untuk Elite)          |
+===============================================================================+
| +-----------------------------------+ +-----------------------------------+   |
| | CHAT (left, 65%)                  | | CONTEXT PANEL (right, 35%)         |  |
| +-----------------------------------+ +-----------------------------------+   |
| | [User]                            | | Current ticker context:           |   |
| | "Kenapa BBRI naik 0.95% hari ini?"| |   BBRI · 4.250 (+0.95%)           |   |
| |                                   | |                                    |  |
| | [AI]                              | | Tool calls used:                   |  |
| | "BBRI naik 0.95% (+Rp 40) hari    | |   • get_quote(BBRI)                |  |
| |  ini didukung oleh tiga faktor    | |   • get_broker_summary(BBRI,1D)    |  |
| |  utama:                           | |   • get_news(BBRI,today)           |  |
| |                                   | |   • get_macro_indicator(IHSG)      |  |
| |  1) Smart money inflow:           | |                                    |  |
| |     Broker CC (Mandiri) net buy   | | Sources cited:                     |  |
| |     +Rp 22 Mrd. [1]               | |   [1] IDX Broker Summary 12/5     |  |
| |  2) Foreign net buy +Rp 280 Mrd   | |   [2] Kontan: BI Tahan Suku Bunga |  |
| |     sektor banking [2]            | |   [3] BBRI Q1 2026 Press Release  |  |
| |  3) Sentiment BI tahan suku       | |                                    |  |
| |     bunga 5,5% (positif untuk     | | Confidence: 85%                    |  |
| |     bank). [3]                    | | (signals: 4/4 align)               |  |
| |                                   | |                                    |  |
| |  Setup teknikal: pullback ke MA20 | | [ Save chat ]  [ Share ]           |  |
| |  selesai, momentum positif.       | |                                    |  |
| |                                   | | Quick prompts:                     |  |
| |  Bukan ajakan jual/beli."         | |   [ Compare dengan BBNI ]          |  |
| | [👍] [👎] [🔁 Regenerate]          | |   [ Setup teknikal sekarang? ]     |  |
| |                                   | |   [ Risiko hari ini? ]             |  |
| | [User input ___________________]  | |                                    |  |
| | [ Lampirkan: chart / news ▼ ]     | |                                    |  |
| | [    Kirim (Enter)            ]   | |                                    |  |
| +-----------------------------------+ +-----------------------------------+   |
+===============================================================================+
```

**Caption:** Split panel chat (kiri) + context (kanan). Context panel visible-by-default menampilkan *tool calls* (transparency principle), source citations, confidence score. Quick prompts kontekstual berdasarkan ticker yang sedang dibuka. User dapat *thumbs up/down* per response (training feedback). Streaming response (Anthropic streaming). Rate limit indicator (mis. "23/50 query hari ini").

---

### 5.15 Workspace Multi-Pane (Pro+, `/workspace/<id>`)

```
+===============================================================================+
| [Workspace: "Day Trader Pro" ▼]   [ Save ] [ Share ] [ + New pane ]   [⚙]    |
+===============================================================================+
| +----------------------+ +----------------------+ +----------------------+    |
| | Chart BBRI 5m        | | Foreign Flow 5m      | | AI Chat              |    |
| |                      | |                      | |                      |    |
| | [candle chart]       | | [line chart]         | | User: "BBRI setup?"  |    |
| |                      | |                      | | AI: "Pullback to..."  |    |
| |                      | |                      | |                      |    |
| | [resize handle ┘]    | | [resize handle ┘]    | |                      |    |
| +----------------------+ +----------------------+ +----------------------+    |
| +----------------------+ +----------------------+ +----------------------+    |
| | Watchlist (Banking)  | | Broker Summary BBRI  | | News BBRI            |    |
| |                      | |                      | |                      |    |
| | BBRI 4250 +0.95% ▲   | | CC +22 Mrd           | | • Q1 beat estim      |    |
| | BBCA 9525 +0.13% ▲   | | RG +18 Mrd           | | • Foreign net buy    |    |
| | BMRI 6800 +0.75% ▲   | | BK +12 Mrd           | | • BI hold rate       |    |
| | BBNI 5025 +1.21% ▲   | | YP -18 Mrd           | |                      |    |
| | ...                  | | PD -12 Mrd           | |                      |    |
| +----------------------+ +----------------------+ +----------------------+    |
|                                                                               |
| [Add pane: ▼ Chart / Watchlist / News / Broker / Heatmap / AI / Custom]       |
+===============================================================================+
```

**Caption:** 6-pane (2x3) default Day Trader template. Setiap pane independent: drag handle untuk rearrange, resize handle di edge. Save/share via URL (`nubuat.id/w/abc123`). Templates: Day Trader, Swing Trader, Fundamental Investor, Researcher. Multi-monitor: detach pane ke window terpisah (Tauri only).

---

### 5.16 Command Palette (Cmd+K Overlay)

```
+===============================================================================+
|                                                                               |
|        +-----------------------------------------------------------+          |
|        | [🔍] Cari ticker, fitur, atau ketik perintah...           |          |
|        |   bbri                                                    |          |
|        +-----------------------------------------------------------+          |
|        | TICKERS                                                    |          |
|        |   BBRI  · Bank Rakyat Indonesia                            |          |
|        |   BBRI 1D · Open chart 1D                                  |          |
|        |   BBRI FA · Fundamental                                    |          |
|        |   BBRI BMAP · Broker map                                   |          |
|        |                                                            |          |
|        | FUNCTIONS (Bloomberg-style)                                |          |
|        |   <BBRI> <GO> · Buka ticker profile + verdict              |          |
|        |   EQS · Equity screener                                    |          |
|        |   WL · Watchlist                                           |          |
|        |   AL · Alerts                                              |          |
|        |   PORT · Portfolio                                         |          |
|        |                                                            |          |
|        | NAVIGATION                                                 |          |
|        |   Dashboard      (g d)                                     |          |
|        |   Daily Picks    (g p)                                     |          |
|        |   Screener       (g s)                                     |          |
|        |                                                            |          |
|        | AI ACTIONS                                                 |          |
|        |   Tanya AI: "kenapa BBRI naik?"                            |          |
|        |   Compare BBRI vs BBNI                                     |          |
|        |                                                            |          |
|        | RECENT                                                     |          |
|        |   Watchlist Swing Mei                                      |          |
|        |   Workspace Day Trader Pro                                 |          |
|        +-----------------------------------------------------------+          |
|        |  [↑↓] navigate  [Enter] open  [Esc] close                  |          |
|        +-----------------------------------------------------------+          |
|                                                                               |
+===============================================================================+
```

**Caption:** Overlay center, max-width 640px, full-height scrollable. Fuzzy search across: tickers, functions (Bloomberg code), navigation, AI prompts, recent activities. Keyboard navigation. Implementation: cmdk library + Fuse.js fuzzy. Free user lihat tickers + navigation; Pro+ unlock function codes & AI actions.

---

### 5.17 Bloomberg-Style Function Code Interface

```
+===============================================================================+
| [Nubuat] [BBRI BMAP <GO>____]    [IHSG 7.245]   [@] [bell] [avatar]           |
+===============================================================================+
|                                                                               |
| Active function: BMAP — Broker Map for BBRI                                   |
| Hotkeys available (press ?):                                                  |
|   GIP — Intraday price       FA  — Fundamental                                |
|   RV  — Relative valuation   DES — Description                                |
|   NSE — News search          EQS — Equity screener                            |
|                                                                               |
| [BMAP content: broker network graph for BBRI — see wireframe 5.10]            |
|                                                                               |
+===============================================================================+
| Press <Esc> to go back | Type next function: [____]                           |
+===============================================================================+
```

**Caption:** Address bar di top menerima *function code* ala Bloomberg (`BBRI BMAP <GO>` atau shorthand `<BBRI>` saja). State management: pop history stack. Help overlay (`?`) menampilkan semua function. Free user: hanya function dasar (DES, GIP); Pro+ unlock advanced (BMAP, EQS, FA full).

---

### 5.18 Backtest Builder No-Code

```
+===============================================================================+
| Backtest Builder · Strategy: "Pullback MA20 Banking" (draft)                  |
+===============================================================================+
| Step 1 of 4: Universe                                                         |
|   [✓] Sector: Banking                                                         |
|   [✓] Min market cap: Rp 10 T                                                 |
|   [✓] Min avg value 20D: Rp 5 Mrd                                             |
|   Universe count: 12 ticker                                                   |
|                                                                               |
| Step 2 of 4: Entry Rule                                                       |
|   When:  [Close ▼] [<] [MA20 ▼] AND [RSI 14 ▼] [<] [40]                       |
|   [ + Add condition (AND/OR) ]                                                |
|                                                                               |
| Step 3 of 4: Exit Rule                                                        |
|   Stop loss:    [Swing low ▼] OR [ATR×1.5 ▼] whichever lower                  |
|   Take profit:  TP1 [1R] [50% size]   TP2 [2R] [50% size]                     |
|   Time stop:    [10 hari]                                                     |
|                                                                               |
| Step 4 of 4: Period & Risk                                                    |
|   Backtest period: [2020-01 — 2026-04]                                        |
|   Capital initial: Rp 100.000.000                                             |
|   Risk per trade: 1% portfolio                                                |
|   Commission:     0.15% buy, 0.25% sell (BEI)                                 |
|   Slippage:       0.05%                                                       |
|   Walk-forward:   [✓] Train 70% / Test 30%                                    |
|                                                                               |
| [ ← Back ]   [ Save draft ]   [ Run Backtest ▶ ]                              |
+===============================================================================+
```

**Caption:** Wizard 4-step dengan progress indicator. Dropdown chips untuk condition builder (fluent UI ala Notion filter). Walk-forward toggle wajib di Pro+ tier. Run Backtest mengirim job ke backend Python (Polars vectorized), result page muncul setelah ~3-30 detik.

---

### 5.19 Backtest Result Page

```
+===============================================================================+
| Result: "Pullback MA20 Banking" · 2020-01 → 2026-04 · Run 12 Mei 09:35       |
+===============================================================================+
|                                                                               |
| +-----------------------------+ +---------------------------+                 |
| | Equity Curve                | | Key Metrics               |                |
| |                             | | Total return: +142%       |                |
| | Rp 250jt -                  | | CAGR: 16.8%               |                |
| |          .--.    .--`       | | Max drawdown: -12.4%      |                |
| |     .--`/    `--`           | | Sharpe: 1.85              |                |
| | Rp 100jt'                   | | Sortino: 2.42             |                |
| |  2020      2023      2026   | | Calmar: 1.35              |                |
| +-----------------------------+ | Win rate: 58.2%           |                |
|                                 | Avg win: +3.2%            |                |
| +-----------------------------+ | Avg loss: -1.8%           |                |
| | Drawdown                    | | Profit factor: 2.1        |                |
| | [chart underwater curve]    | | Trades: 287               |                |
| +-----------------------------+ +---------------------------+                 |
|                                                                               |
| Trade list (287):                                                             |
| +------+----------+----------+--------+--------+--------+--------+            |
| | #    | Ticker   | Entry    | Exit   | Return | R/R    | Days   |           |
| +------+----------+----------+--------+--------+--------+--------+            |
| | 287  | BBRI     | 4250     | 4400   | +3.5%  | 1.5    | 4      |           |
| | 286  | BBNI     | 5025     | 4900   | -2.5%  | -1.0   | 6      |           |
| | 285  | BMRI     | 6800     | 7100   | +4.4%  | 2.2    | 8      |           |
| | ...                                                              |          |
| +------+----------+----------+--------+--------+--------+--------+            |
|                                                                               |
| Walk-forward result: Train 1.92 Sharpe → Test 1.65 Sharpe (generalize)        |
| Monte Carlo (1000 perm): 95% CI for CAGR 12.4% – 21.5%                        |
|                                                                               |
| [ Export CSV ]  [ Save Strategy ]  [ Paper Trade ]  [ Publish to Marketplace ]|
+===============================================================================+
```

**Caption:** Equity curve + underwater drawdown side-by-side. Key metrics box dengan 12 metrik essential. Trade list virtualized (10k+ trades possible). Walk-forward dan Monte Carlo result untuk anti-overfit. Export CSV untuk power user. Publish ke Marketplace adalah Elite-only (M18+).

---

### 5.20 Portfolio Tracker (`/portfolio`)

```
+===============================================================================+
| Portfolio · Total: Rp 245.620.000  |  +Rp 12.450.000 (+5.34%) today          |
+===============================================================================+
| [ + Tambah posisi ]  [ Import dari broker ]  [ Export ]                       |
+-------------------------------------------------------------------------------+
| Holdings (7)                                                                  |
| +------+--------+--------+----------+----------+----------+----------+        |
| | Code | Qty    | Avg Pr | Last     | Value    | Unreal   | %       |        |
| +------+--------+--------+----------+----------+----------+----------+        |
| | BBRI | 10.000 | 4.100  | 4.250    | 42.5 jt  | +1.5 jt  | +3.7%   |        |
| | BBCA |  3.000 | 8.900  | 9.525    | 28.6 jt  | +1.9 jt  | +7.0%   |        |
| | TLKM |  8.000 | 3.520  | 3.450    | 27.6 jt  | -560 rb  | -2.0%   |        |
| | ASII |  5.000 | 4.500  | 4.830    | 24.2 jt  | +1.7 jt  | +7.3%   |        |
| | ANTM | 12.000 | 1.650  | 1.730    | 20.8 jt  | +960 rb  | +4.8%   |        |
| | MDKA | 10.000 | 2.300  | 2.450    | 24.5 jt  | +1.5 jt  | +6.5%   |        |
| | Cash |        |        |          | 77.4 jt  |          |         |        |
| +------+--------+--------+----------+----------+----------+----------+        |
|                                                                               |
| Allocation pie:                                                               |
|   Banking 28%   Energy 11%   Tech 0%   Consumer 0%   Cash 31%                |
|                                                                               |
| Performance vs IHSG (YTD):                                                    |
| [line chart: portfolio vs IHSG]                                              |
|   Portfolio +14.2%  IHSG +5.8%  Outperform +8.4%                              |
|                                                                               |
| Top contributor: ASII +Rp 1.7jt   Top detractor: TLKM -Rp 560rb              |
+===============================================================================+
```

**Caption:** Total + today change prominently di top. Holdings table sortable. Cash row eksplisit. Allocation pie & performance vs IHSG chart. Import dari broker (v2) via OAuth Stockbit/Mirae/IPOT (kalau buka API). Manual entry tetap primary. Free tier: 1 portfolio, max 10 holdings.

---

### 5.21 Alerts Management (`/alerts/manage`)

```
+===============================================================================+
| Alerts · 23 active                                                            |
+===============================================================================+
| [ + Tambah alert ]  Filter: [All ▼] [Active] [Triggered] [Paused]             |
+-------------------------------------------------------------------------------+
|                                                                               |
| Active alerts (23)                                                            |
| +-----+------+--------------------------------+----------+----------+         |
| | On  | Code | Condition                      | Channel  | Created  |         |
| +-----+------+--------------------------------+----------+----------+         |
| | ✓   | BBRI | Price ≥ 4.400                  | Push,WA  | 10 Mei   |         |
| | ✓   | BBNI | RSI 14 < 30 (oversold)         | Push     | 8 Mei    |         |
| | ✓   | TLKM | Broker CC net buy > 20 Mrd     | Push,Tg  | 5 Mei    |         |
| | ✓   | ANTM | News mention "ekspansi"        | Email    | 3 Mei    |         |
| | ✓   | UNVR | LK Q2 published                | Push     | 1 Mei    |         |
| | ✓   | BMRI | MA cross golden (50/200)       | Push     | 28 Apr   |         |
| | ✓   | ASII | Volume z-score > 2             | Push,WA  | 25 Apr   |         |
| | ...                                                          |               |
| +-----+------+--------------------------------+----------+----------+         |
|                                                                               |
| History (last 7d) — 12 triggered                                              |
| +----------+------+--------------------+----------+                           |
| | When     | Code | Trigger            | Action   |                           |
| +----------+------+--------------------+----------+                           |
| | 12 Mei   | BBRI | Price ≥ 4.250      | Tap →    |                           |
| | 11 Mei   | BBNI | RSI < 30           | Tap →    |                           |
| | 11 Mei   | TLKM | News: Q1 LK        | Tap →    |                           |
| | ...                                              |                           |
| +----------+------+--------------------+----------+                           |
|                                                                               |
| Channel preferences:                                                          |
|   [✓] In-app push    [✓] Email    [✓] WhatsApp (Pro+)    [ ] Telegram        |
+===============================================================================+
```

**Caption:** Active table dengan toggle on/off per alert. History menampilkan trigger event. Channel preferences di footer (WhatsApp & Telegram Pro+ only). Free tier: max 5 active alerts; Starter 50; Pro+ unlimited. Multi-channel routing: critical alerts (entry/SL) selalu push, news alerts email.

---

### 5.22 Research Aggregator Feed (`/research/feed`)

```
+===============================================================================+
| Research Aggregator · 247 laporan minggu ini                                  |
+===============================================================================+
| Filter: [Sector ▼] [Sekuritas ▼] [Rating ▼] [Tanggal ▼] [Watchlist only]      |
| Sort: [Relevance ▼] [Newest] [Most cited]                                     |
+-------------------------------------------------------------------------------+
|                                                                               |
| +-----------------------------------------------------------------+           |
| | BBRI · BUY · Target Rp 4.700 (+11%)                              |          |
| | BRI Danareksa Research · 11 Mei 2026 · 12 halaman PDF            |          |
| |                                                                  |          |
| | "Q1 2026 beat estimate +7%. Dividend yield attractive..."        |          |
| |                                                                  |          |
| | Key risk: NIM compression jika BI cut rate                       |          |
| | [ Baca lengkap ]  [ Tanya AI ]  [ ⭐ Save ]                       |          |
| +-----------------------------------------------------------------+           |
|                                                                               |
| +-----------------------------------------------------------------+           |
| | BBRI · HOLD · Target Rp 4.300 (+1%)                              |          |
| | Mandiri Sekuritas · 10 Mei 2026 · 8 halaman PDF                  |          |
| | "Valuation mendekati fair value..."                              |          |
| | [ Baca lengkap ]  [ Tanya AI ]                                   |          |
| +-----------------------------------------------------------------+           |
|                                                                               |
| Consensus BBRI (5 analis):                                                    |
|   Strong Buy 1  |  Buy 3  |  Hold 1  |  Sell 0  |  Strong Sell 0             |
|   Target median: Rp 4.500   Range: Rp 4.250 – 4.700                          |
|                                                                               |
| AI Synthesis: "Mayoritas analis bullish dengan median target +6%. Risk        |
| utama: NIM compression. Sentimen banking sektor tetap positif post BI hold."  |
| [Sumber: 5 laporan]                                                           |
+===============================================================================+
```

**Caption:** Feed laporan dari 15+ sekuritas dengan filter kombinasi. Consensus gauge & target chart di bottom. AI Synthesis menggabungkan laporan menjadi paragraf ringkas dengan citation. Klik *Baca lengkap* buka PDF viewer modal. Free tier: preview 3 laporan/hari; Pro+ unlimited.

---

### 5.23 Settings — Subscription & Billing (`/settings/subscription`)

```
+===============================================================================+
| Settings ›  Subscription                                                      |
+-------------------------------------------------------------------------------+
| Current plan: PRO  ·  Rp 299.000/bulan  ·  Auto-renew 12 Jun 2026             |
|                                                                               |
| [ Upgrade ke Elite ]   [ Switch ke annual (-17%) ]   [ Batalkan ]             |
|                                                                               |
| +-----------------------------------------------------------------+           |
| | Riwayat pembayaran                                                |         |
| | +----------+----------+--------+----------+----------+            |         |
| | | Tanggal  | Invoice  | Plan   | Amount   | Status   |            |         |
| | +----------+----------+--------+----------+----------+            |         |
| | | 12 Mei   | #2026005 | Pro M  | 299.000  | Paid ✓   |            |         |
| | | 12 Apr   | #2026004 | Pro M  | 299.000  | Paid ✓   |            |         |
| | | 12 Mar   | #2026003 | Pro M  | 299.000  | Paid ✓   |            |         |
| | | ...                                                  |          |         |
| | +----------+----------+--------+----------+----------+            |         |
| +-----------------------------------------------------------------+           |
|                                                                               |
| Payment method:                                                               |
|   GoPay  · gopay@rama****  · [Ganti]                                          |
|                                                                               |
| Tax info: NPWP optional [____________] [Save]                                 |
+===============================================================================+
```

**Caption:** Status plan, next billing date, CTA upgrade/switch annual/cancel. Riwayat pembayaran sortable + download invoice PDF. Payment method dengan masking sensitive info. NPWP optional untuk tax invoice.

---

### 5.24 Pricing Page (`/pricing`)

```
+===============================================================================+
| Harga · Pilih plan yang sesuai. Batal kapan saja.                             |
+===============================================================================+
| Billing: [Bulanan*] [Tahunan -17%]                                            |
+-------------------------------------------------------------------------------+
|                                                                               |
| +-----------+ +-----------+ +-----------+ +-----------+                       |
| |  Free     | |  Starter  | |  Pro      | |  Elite    |                       |
| |  Rp 0     | |  Rp 99k   | |  Rp 299k* | |  Rp 899k  |                       |
| |  /bulan   | |  /bulan   | |  /bulan   | |  /bulan   |                       |
| |           | |           | | MOST POP  | |           |                       |
| |           | |           | |           | |           |                       |
| | Quote 15m | | Quote RT  | | + Pro tier| | + L2 depth|                       |
| | Watchlist | | Watchlist | | + Brokerm | | + intraday|                       |
| |   10      | |   ∞       | | + Research|   flow 5m  |                       |
| | TA 20 ind | | TA 150ind | |   Aggreg  | | + Paper   |                       |
| | Daily Brf | | Picks 3   | | Picks 10  |   trading  |                       |
| | AI 5/hari | | AI 50/h   | |   intraday| | + Strategy|                       |
| |           | |           | | + Multi-  |   marketpl |                       |
| |           | |           | |   chart   | | + AI Opus |                       |
| |           | |           | | + Backtest|   unlimited|                       |
| |           | |           | |   basic   | | + API     |                       |
| |           | |           | | + Desktop | | + Conciege|                       |
| |           | |           | |   app     | |           |                       |
| |           | |           | | + AI 500/h|           |                       |
| |           | |           | |           |           |                       |
| | [Mulai]   | | [Pilih]   | | [Trial 7d]| | [Hubungi] |                       |
| +-----------+ +-----------+ +-----------+ +-----------+                       |
|                                                                               |
| Tim/Institusi: Custom mulai Rp 25 jt/bulan · [ Hubungi sales ]                |
|                                                                               |
| FAQ:                                                                          |
|   - Apakah ada free trial Pro?                                                |
|   - Apa metode pembayaran yang diterima?                                      |
|   - Bisakah saya downgrade?                                                   |
|   - Apakah harga termasuk pajak?                                              |
+===============================================================================+
```

**Caption:** 4-tier card horizontal (mobile: stack vertical). "Most Popular" badge di Pro untuk anchor. Toggle bulanan/tahunan dengan annual discount visible. CTA differentiated per tier (Free = Mulai, Starter = Pilih, Pro = Trial, Elite = Hubungi). FAQ accordion. Compare detail collapsible.

---

### 5.25 Mobile Home (Compact)

```
+----------------------------------+
| [≡] Nubuat       [🔍] [bell] [👤]|
+----------------------------------+
| IHSG 7.245  +0.45%  ▲             |
| Foreign +280 Mrd today            |
+----------------------------------+
|                                  |
| Daily Picks for You              |
| +------------------------------+ |
| | BBRI Banking                 | |
| | 4250 +0.95% ▲                | |
| | Entry 4250 SL 4150 TP 4500   | |
| | R/R 2.5 Conf 7/10            | |
| | [ Detail ]                   | |
| +------------------------------+ |
|       (swipe →)                   |
| +------------------------------+ |
| | BBNI Banking                 | |
| | ...                          | |
| +------------------------------+ |
|                                  |
| Watchlist (12)                   |
| BBRI 4250 +0.95% ★               |
| BBCA 9525 +0.13% ★               |
| TLKM 3450 -0.29%                 |
| [Lihat semua →]                  |
|                                  |
| News                             |
| • BI hold rate 5,5% (Kontan)     |
| • TLKM Q1 beat (Bisnis)          |
|                                  |
+----------------------------------+
| [🏠] [📊] [💼] [🔔] [🤖]          |
| Home Picks Port Alert  AI         |
+----------------------------------+
```

**Caption:** Bottom nav 5-tab untuk thumb access. Daily Picks horizontal swipeable card. Watchlist condensed list. Pull-to-refresh aktif. Pull-down search di top. Theme dark default. Thumb zone: bottom 60% layar untuk CTA penting.

---

### 5.26 Mobile Ticker Detail

```
+----------------------------------+
| [←]  BBRI · Bank Rakyat   [⋯]    |
+----------------------------------+
| Rp 4.250                          |
| +40 +0.95%  ▲                     |
| Vol 125jt  Value 532 Mrd          |
+----------------------------------+
| Verdict 7.4/10 [BUY]              |
| Setup: Pullback ke MA20           |
+----------------------------------+
| Chart (1D, 5m timeframe)          |
| [sticky chart panel ~40% height]  |
|   .--.                            |
|  /    \  .--                      |
| '      `'                         |
| Vol bars                          |
| ||| .||  || |||                   |
|                                  |
| [1m] [5m*] [15m] [1H] [1D] [1W]   |
+----------------------------------+
| Tabs (horizontal scrollable)      |
| [Overview*] [Tech] [Fund] [Band]  |
| [Brok] [News] [AI]                |
+----------------------------------+
| Tab content (scrollable)          |
| Key stats:                        |
|   Market cap  Rp 643 T            |
|   PER 12.4x                       |
|   ROE 18.5%                       |
|   Div yield 5.2%                  |
|                                  |
| Today's flow:                     |
|   Foreign +Rp 45 Mrd              |
|   Top buyer CC +22 Mrd            |
|                                  |
| Recent news:                      |
| • Q1 beat (Bisnis)                |
| • BI hold rate (Kontan)           |
|                                  |
+----------------------------------+
| [ + Watchlist ] [ 🔔 ] [ 🤖 ]     |
+----------------------------------+
```

**Caption:** Sticky chart panel di atas (40% height) tetap visible saat scroll tab content. Tab horizontal scrollable. Bottom action bar 3-button (Watchlist, Alert, AI). Swipe horizontal antar tab. Long-press chart untuk crosshair mode. Pinch zoom. Drawing tools di sheet (swipe up).

---

### 5.27 Mobile Daily Pick Card (Swipeable)

```
+----------------------------------+
| Daily Picks · 12 Mei              |
|                       1 / 10      |
+----------------------------------+
|                                  |
| +------------------------------+ |
| |  BBRI                        | |
| |  Bank Rakyat Indonesia       | |
| |  Banking · LQ45              | |
| |                              | |
| |  Rp 4.250  +0.95% ▲          | |
| |                              | |
| |  [mini chart with zones]     | |
| |                              | |
| |  ─────────────               | |
| |                              | |
| |  Setup: Pullback ke MA20     | |
| |  Time: Swing 3-5d            | |
| |                              | |
| |  Entry: 4.230 – 4.270        | |
| |  SL:    4.150 (-2.4%)        | |
| |  TP1:   4.400 (+3.8%)        | |
| |  TP2:   4.500 (+6.4%)        | |
| |                              | |
| |  R/R 2.5     Conf 7/10       | |
| |  Hit rate setup: 58% (n=142) | |
| |                              | |
| |  [ Buka ticker ]              | |
| |  [ + Watchlist ]              | |
| |  [ 🔔 Alert entry ]           | |
| |                              | |
| |  ← swipe → (next pick)       | |
| +------------------------------+ |
|                                  |
|  • • • • • • • • • •  (10 dots)   |
+----------------------------------+
```

**Caption:** Card fullscreen-ish dengan dot indicator. Swipe horizontal navigate pick. Tap card body buka ticker detail. CTA stacked vertical untuk thumb access. Confidence + hit rate prominent (transparency). Animation respect `prefers-reduced-motion`.

---

### 5.28 Push Notification (Alert Triggered)

```
+----------------------------------+
| 🔔 Nubuat                10:15    |
|                                  |
| BBRI 4250 — Entry zone touched!  |
|                                  |
| Price 4.250 (entry 4.230-4.270)  |
| Setup: Pullback MA20             |
| R/R 2.5  Conf 7/10               |
|                                  |
| [ Buka ]    [ Snooze 5m ]        |
+----------------------------------+
```

**Caption:** Rich notification dengan preview info. Action buttons: Buka (deep link ke ticker page), Snooze. iOS: Notification Service Extension untuk attach chart thumbnail. Android: Big Text Style + chart inline. Bundling: max 1 critical alert per 5 menit per ticker (anti-spam).

---

## 6. Design System Spec

### 6.1 Color Palette

**Brand**
- `--brand-primary`: `#1A6FEB` (Nubuat blue) — primary CTA, link, active state
- `--brand-secondary`: `#0F3F8A` (deep blue) — hover, dark accent
- `--brand-accent`: `#F2C744` (gold) — premium, Pro/Elite tier highlight

**Semantic — Indonesia Market Convention**
- `--gain`: `#16A34A` (green) — harga naik, BUY, profit
- `--loss`: `#DC2626` (red) — harga turun, SELL, loss
- `--neutral`: `#6B7280` (gray) — flat, hold
- `--warning`: `#F59E0B` (amber) — UMA, papan pemantauan khusus, unusual volume
- `--danger`: `#B91C1C` (red darker) — suspended, error critical
- `--info`: `#0EA5E9` (sky) — informational alert

> **Catatan konvensi:** BEI/Indonesia menggunakan hijau untuk naik, merah untuk turun (sama dengan US, berbeda dari China yang inverse). Konfirmasi via user research wajib di M1.

**Surface (Dark Mode default)**
- `--bg-0`: `#0A0E14` — page background
- `--bg-1`: `#10151C` — card / pane background
- `--bg-2`: `#161C24` — elevated (modal, popover)
- `--bg-3`: `#1F2731` — hover state
- `--border`: `#2A323D` — divider, panel border
- `--text-0`: `#E5E7EB` — primary
- `--text-1`: `#A1A8B3` — secondary
- `--text-2`: `#6B7280` — tertiary, disabled

**Surface (Light Mode)**
- `--bg-0`: `#FFFFFF`
- `--bg-1`: `#F8FAFC`
- `--bg-2`: `#F1F5F9`
- `--bg-3`: `#E2E8F0`
- `--border`: `#CBD5E1`
- `--text-0`: `#0F172A`
- `--text-1`: `#475569`
- `--text-2`: `#94A3B8`

**Surface (AMOLED — mobile only)**
- `--bg-0`: `#000000`
- `--bg-1`: `#0A0A0A`
- (mirip Dark Mode tapi `--bg-0` true black untuk OLED battery saving)

### 6.2 Typography

**Font families:**
- Sans: `Inter Variable` (UI text)
- Serif: `Source Serif Pro` (long-form article, Akademi Nubuat)
- Mono: `Geist Mono` (numerik finansial, kode)

**Scale (1.25 ratio):**

| Token | Size | Line height | Weight | Use case |
|---|---|---|---|---|
| `text-xs` | 12px | 16px | 400 | meta, table small |
| `text-sm` | 14px | 20px | 400 | secondary text |
| `text-base` | 16px | 24px | 400 | body |
| `text-lg` | 18px | 28px | 500 | emphasis |
| `text-xl` | 20px | 28px | 600 | card title |
| `text-2xl` | 24px | 32px | 600 | section h3 |
| `text-3xl` | 30px | 38px | 700 | h2 |
| `text-4xl` | 36px | 44px | 700 | h1 |
| `text-5xl` | 48px | 56px | 800 | hero |
| `num-lg` | 24px | 28px | 600 mono | price prominent |
| `num-md` | 18px | 22px | 600 mono | row number |
| `num-sm` | 14px | 18px | 500 mono | table cell |

Settings: `font-feature-settings: "tnum","cv11";` untuk tabular numerals & variant Inter.

### 6.3 Spacing & Grid

Base unit: **4px**. Token: `space-1` = 4px, `space-2` = 8px, ..., `space-16` = 64px.

**Breakpoints:**
- `sm`: 640px (large phone)
- `md`: 768px (tablet portrait)
- `lg`: 1024px (tablet landscape, small laptop)
- `xl`: 1280px (laptop)
- `2xl`: 1536px (desktop)
- `3xl`: 1920px (large desktop, multi-monitor)

**Layout grid:**
- Mobile: 4-col, gutter 16px, margin 16px
- Tablet: 8-col, gutter 24px, margin 24px
- Desktop: 12-col, gutter 24px, margin 32px

**Density modes:**
- Comfortable: row 40px, padding 16px (default retail)
- Compact: row 28px, padding 8px (Bloomberg-style, Pro+ default)

### 6.4 Iconography

- Primary: **Lucide** (lucide-react) — clean, consistent
- Secondary: **Phosphor** for variety (regular, fill)
- Custom finance icons: candle, bull/bear, ticker tape, broker badge — di-design in-house (24px grid, 2px stroke).
- Size scale: 16, 20, 24, 32, 48.

### 6.5 Motion Principles

**Duration:**
- `motion-1`: 100ms (microinteraction: hover, focus)
- `motion-2`: 200ms (transition state: tab, modal open)
- `motion-3`: 300ms (route change, sheet)
- `motion-4`: 500ms (large reveal, onboarding)

**Easing:**
- `ease-out`: `cubic-bezier(0.0, 0.0, 0.2, 1)` (default, deceleration)
- `ease-in-out`: `cubic-bezier(0.4, 0.0, 0.2, 1)` (modal)
- `ease-spring`: Framer Motion spring (drag-resize, swipe gesture)

**Prefers-reduced-motion:**
- Semua transition di-set 1ms.
- Disable tick blink animation.
- Disable confetti/celebration.

### 6.6 Density Modes

| Mode | Row height | Padding card | Font UI | Default tier |
|---|---|---|---|---|
| Comfortable | 40px | 16px | 14px | Free, Starter |
| Compact | 28px | 8px | 12px | Pro, Elite |

Toggle di header (gear icon → density).

### 6.7 Component States

Setiap interactive component (Button, Input, Card, Row) wajib punya:

- `default` — base state
- `hover` — pointer over (desktop) atau active-press (touch)
- `active` / `pressed` — saat click/tap
- `focus-visible` — keyboard focus ring (3:1 contrast, 2px outline)
- `disabled` — opacity 50%, no interaction
- `loading` — skeleton / spinner
- `empty` — illustration + CTA
- `error` — message + retry CTA

---

## 7. Interaction Patterns Library

### 7.1 Skeleton Loading

- Chart: rectangle dengan animated shimmer, dimensi tepat (no CLS).
- Grid/Table: row skeleton 5 baris dengan random width.
- Card: title bar + content paragraf + button skeleton.
- Skeleton timeout: 3s — kalau belum done, switch ke error state dengan retry.

### 7.2 Optimistic Update

- **Watchlist add/remove**: UI update instan, request async background. Rollback dengan toast "Gagal, coba lagi" + Undo.
- **Alert toggle on/off**: idem.
- **Note save**: idem.

### 7.3 Real-time Tick Animation

- Saat price update, background row blink subtle: gain → green flash 200ms fade-out, loss → red flash.
- `prefers-reduced-motion`: skip blink, hanya angka update.
- Aria-live region: `aria-live="polite"` (tidak interrupt screen reader).

### 7.4 Inline Error Recovery

- Pattern: `[ ⚠️ Gagal load. Coba lagi ↻ ]` inline di tempat data seharusnya.
- Setelah retry 3x gagal: fallback ke cached data + banner "Data mungkin tidak terbaru".

### 7.5 Bulk Action di Grid

- Checkbox column kiri (visible on hover row di compact mode).
- Selection count + action bar muncul di footer grid.
- Actions: Add to watchlist, Compare, Export, Delete (kalau applicable).

### 7.6 Drag-Resize Panel

- Workspace pane: handle 8px di edge (right & bottom).
- Min size: 240x180px.
- Snap-to-grid 8px.
- Implementation: `react-resizable-panels` or custom.

### 7.7 Command Palette Navigation

- `Cmd+K` open
- `↑↓` navigate
- `Tab` switch category
- `Enter` select
- `Esc` close
- Type forward-slash `/` untuk filter category (e.g., `/ticker`, `/ai`, `/nav`)

### 7.8 Modal vs Sheet vs Popover Decision Tree

```
Content depth?
├─ Light (info / 1 action) → Tooltip (hover) atau Popover (click)
├─ Medium (form short / decision) → Dialog modal (desktop) / Sheet bottom (mobile)
├─ Heavy (form long, multi-step) → Sheet right (desktop) / Sheet full (mobile)
└─ Very heavy (research, deep dive) → New page route
```

- Modal: blocking, dismissible via Esc / backdrop / X button.
- Sheet: side or bottom, drag-to-dismiss (mobile), focus trap.
- Popover: non-blocking, dismissible via outside click.

### 7.9 Tooltip vs Popover vs Help Drawer

- **Tooltip**: ≤15 kata, plain text, no action. Delay 500ms hover (no delay on focus).
- **Popover**: rich content, optional actions, click to open.
- **Help drawer**: full documentation, accessible via `?` icon, slide right panel.

### 7.10 Pull-to-Refresh (Mobile)

- Trigger: pull down 80px.
- Indicator: spinner di atas content area.
- Haptic: light tap saat trigger.
- Timeout 10s.

### 7.11 Long-Press Action (Mobile)

- Watchlist row: long-press 500ms → context sheet (Alert, Buka chart, Hapus).
- Chart: long-press → crosshair mode dengan tooltip OHLCV.

### 7.12 Empty State Pattern

Setiap empty state wajib:
- Ilustrasi (custom Nubuat style — minimalist line art).
- Headline jelas (mis. "Belum ada watchlist").
- Body 1 kalimat menjelaskan benefit.
- Primary CTA untuk mulai.

Contoh:
```
[ilustrasi kosong]
Belum ada watchlist
Tambahkan saham yang ingin Anda pantau setiap hari.
[ + Tambah Saham ]
```

---

## 8. Accessibility (WCAG 2.2 AA) Checklist

### 8.1 Perceivable

- [x] Kontras teks ≥ 4.5:1 (normal), 3:1 (large text & UI).
- [x] Warna bukan satu-satunya signaling: `▲▼` icon + `+/-` sign untuk gain/loss.
- [x] Candle chart: gain = solid green, loss = pattern fill atau outline berbeda.
- [x] Live region untuk price update (`aria-live="polite"`, polite throttle 1s).
- [x] Setiap chart wajib punya alternatif data table accessible via `View as table` button.
- [x] Alt text untuk ilustrasi & icon meaningful.

### 8.2 Operable

- [x] Semua aksi accessible via keyboard.
- [x] Focus visible ring 2px outline + 3:1 contrast.
- [x] Skip link "Skip to main content" di top.
- [x] No keyboard trap (kecuali modal yang valid, dengan Esc exit).
- [x] Click target ≥44x44px (mobile).
- [x] Drag-resize accessible via keyboard alternatif (gear icon → resize sheet dengan input numeric).
- [x] Time limit: kalau ada session timeout, beri warning 60s sebelum + extend button.

### 8.3 Understandable

- [x] Bahasa konsisten (set `lang="id"` atau `lang="en"`).
- [x] Form label eksplisit, error message clear (bukan "Invalid input" tapi "Email tidak valid — contoh: nama@domain.com").
- [x] Disclaimer eksplisit di setiap Daily Pick.
- [x] Help text inline untuk istilah finansial advanced (mis. tooltip "PER = Price to Earnings Ratio").

### 8.4 Robust

- [x] Semantic HTML (header, nav, main, footer, aside, section).
- [x] ARIA roles untuk custom widget (combobox, tablist, tooltip).
- [x] Screen reader test: NVDA (Windows), VoiceOver (Mac/iOS), TalkBack (Android).
- [x] Tested di: Chrome, Safari, Firefox, Edge (last 2 versions).

### 8.5 Finansial-Specific A11y

- [x] **Live tick price**: throttled live region. Tidak semua perubahan diumumkan (hanya kalau Δ ≥ 0.5%).
- [x] **Candle chart**: alternative table dengan OHLCV per bar.
- [x] **Heatmap**: alternative table dengan ranking & % change.
- [x] **Volume bar**: data table dengan numerik.
- [x] **Verdict score**: angka selalu disampaikan sebagai "7.4 dari 10" (bukan hanya visual).

---

## 9. Localization & Cultural Considerations

### 9.1 Bahasa

- Default: **Bahasa Indonesia formal-modern**.
- Sebutan: **"Anda"** (bukan "kamu") untuk respek; tapi tidak kaku.
- Tone: *knowledgeable mentor*, bukan *boomer* atau *anak gaul*.
- Avoid Indonglish berlebihan (mis. "Yuk, trade!" → "Mulai trading").

### 9.2 Istilah Saham Lokal (Wajib dipakai langsung tanpa terjemahan)

| Istilah | Definisi |
|---|---|
| Cum date | Tanggal terakhir berhak dividen |
| Ex date | Tanggal harga sudah tidak termasuk dividen |
| Tutup harga | Closing price |
| Bandar | Big-money player |
| Cuan | Profit |
| Nyangkut | Stuck loss |
| Aksi korporasi | Corporate action |
| RUPS | Rapat Umum Pemegang Saham |
| UMA | Unusual Market Activity |
| Papan Pemantauan Khusus | Special monitoring board |
| KSEI | Kustodian Sentral Efek Indonesia |
| KPEI | Kliring Penjaminan Efek Indonesia |
| Auto-rejection | ARA (Atas) / ARB (Bawah) |
| LK | Laporan Keuangan |
| EPS | Earning per share (boleh "Laba per saham") |

### 9.3 Penulisan Angka

- Thousand separator: **titik** → `Rp 1.250.000`
- Decimal: **koma** → `+1,25%`
- Persen: simbol di belakang, tanpa spasi → `+0,95%`
- Mata uang: `Rp 4.250` (dengan spasi setelah Rp)
- Volume besar: shorthand opt-in user preference → `1,25 jt` / `1,25 M` (mio) / `1,25 Mrd` (miliar) / `1,25 T` (triliun)

### 9.4 Tanggal & Waktu

- Format default: `12 Mei 2026 09:30 WIB`
- Singkat: `12 Mei` / `Sen, 12 Mei`
- Time zone: selalu eksplisit `WIB` (atau `WITA`, `WIT` jika user pilih)
- Relative: `5 menit lalu`, `kemarin`, `2 hari lalu` (max 7 hari, > 7 → tanggal eksplisit)

### 9.5 Cultural Notes

- Jam aktif user Indonesia: 09:00–12:00 dan 13:30–15:30 WIB (jam bursa); peak engagement 09:00–10:00 dan 14:30–15:30.
- Akhir pekan: research mode aktif (Sabtu pagi).
- Bulan Ramadan: jam bursa berubah; UI menampilkan jam bursa adaptif.
- Hari libur nasional: kalender bursa highlighted.

---

## 10. Microcopy Guidelines

### 10.1 Tone of Voice

**Be:**
- Knowledgeable mentor
- Faktual & transparan
- Tenang & meyakinkan
- Empati ke pemula

**Don't be:**
- Menggurui
- Hype / clickbait
- Defensive / pasif
- Slang berlebihan

### 10.2 30+ Contoh Microcopy

**CTA buttons:**
1. `Coba Gratis 7 Hari` (bukan: "Daftar sekarang!")
2. `Mulai Analisis` (bukan: "Klik di sini")
3. `Tambah ke Watchlist` (bukan: "Add")
4. `Set Alert Entry` (bukan: "Notify me")
5. `Lihat Detail Pick` (bukan: "More info")
6. `Tanya Nubuat AI` (bukan: "Ask")
7. `Backtest Strategi Ini` (bukan: "Test")
8. `Upgrade ke Pro` (bukan: "Buy Pro")
9. `Buka Workspace` (bukan: "Launch")
10. `Hubungi Sales` (Elite/Team only)

**Empty states:**
11. *Belum ada watchlist* → "Tambahkan saham yang ingin Anda pantau setiap hari." `[ + Tambah Saham ]`
12. *Belum ada alert* → "Buat alert untuk dapat notifikasi otomatis saat ada peluang." `[ + Buat Alert ]`
13. *Belum ada paper trade* → "Coba strategi tanpa risiko uang sungguhan." `[ Mulai Paper Trading ]`
14. *Belum ada backtest* → "Uji strategi Anda dengan data historis 5+ tahun." `[ Buat Backtest ]`
15. *Inbox AI kosong* → "Mulai dengan: 'Apa setup teknikal BBRI sekarang?'"

**Error messages:**
16. *Login gagal* → "Email atau password salah. Coba lagi atau [reset password]."
17. *Server error* → "Kami sedang punya kendala teknis. Tim kami sudah dikabari — coba lagi sebentar."
18. *Trial habis* → "Trial Pro Anda berakhir. Lanjutkan untuk akses fitur premium." `[ Lanjutkan Pro ]`
19. *Rate limit AI* → "Anda sudah pakai 50 query AI hari ini (limit Starter). Upgrade ke Pro untuk 500/hari." `[ Lihat Pro ]`
20. *Data ticker tidak ada* → "Ticker tidak ditemukan. Pastikan kode 4 huruf (contoh: BBRI)."

**Onboarding tooltips:**
21. *Setelah signup* → "Selamat datang di Nubuat! Mari pilih gaya trading Anda dulu."
22. *Setelah pilih persona* → "Bagus! Berikutnya, sektor apa yang Anda minati?"
23. *Dashboard pertama* → "Inilah Daily Picks Anda hari ini. Klik kartu mana saja untuk detail."
24. *Pertama buka AI* → "Halo! Saya Nubuat AI. Tanyakan apa saja tentang saham — chart, fundamental, atau berita."

**Disclaimer:**
25. Daily Pick footer → "Analisis ini untuk tujuan edukasi & informasi. Bukan ajakan jual/beli efek. Risiko investasi adalah tanggung jawab pribadi Anda."
26. AI response footer → "Jawaban berbasis data publik & analisis algoritmik. Bukan rekomendasi investasi personal. Selalu verifikasi sebelum bertindak."

**Confirmation:**
27. *Hapus alert* → "Hapus alert ini? Anda tidak akan menerima notifikasi terkait." `[ Batal ] [ Hapus ]`
28. *Cancel subscription* → "Batalkan langganan Pro? Anda tetap bisa pakai sampai 12 Jun 2026, lalu downgrade ke Free." `[ Pertahankan ] [ Batalkan ]`
29. *Switch annual* → "Pindah ke annual hemat Rp 598.000/tahun (17%). Lanjut?" `[ Tidak ] [ Ya, hemat ]`

**Success:**
30. *Alert set* → "Alert dibuat. Anda akan dapat notifikasi saat BBRI menyentuh Rp 4.250."
31. *Watchlist add* → "BBRI ditambahkan ke watchlist *Swing Mei*."
32. *Subscription paid* → "Selamat! Akses Pro aktif. Buka workspace Pro untuk mulai." `[ Buka Workspace ]`

**Conversion hooks (Free → Paid):**
33. *Saat hit limit* → "Anda sudah mencicipi 5 query AI hari ini. Coba Pro 7 hari gratis untuk 500 query/hari."
34. *Saat klik fitur Pro* → "Fitur ini eksklusif untuk Pro & Elite. Mulai trial 7 hari tanpa kartu kredit."
35. *Reminder akhir trial* → "Trial Pro Anda berakhir besok. Lanjutkan untuk pertahankan akses Brokermology, Research Aggregator, dan AI unlimited."

---

## 11. Mobile UX Specific

### 11.1 Gesture Map

| Gesture | Tempat | Aksi |
|---|---|---|
| Tap | Anywhere | Activate |
| Long-press 500ms | Watchlist row | Context menu (Alert, Detail, Hapus) |
| Long-press | Chart | Crosshair OHLCV tooltip |
| Swipe ← / → | Daily Pick card | Navigate prev/next |
| Swipe ← row | Watchlist row | Reveal swipe action (Hapus, Alert) |
| Pinch zoom | Chart | Zoom in/out |
| Two-finger pan | Chart | Pan timeline |
| Pull down | Top of list | Refresh |
| Swipe up sheet | Bottom sheet | Expand to full |
| Swipe down | Sheet | Dismiss |
| Double-tap | Chart | Reset zoom |

### 11.2 Thumb-Zone Optimization

- Bottom 60% layar = primary action zone (FAB, bottom nav, primary CTA).
- Top 25% = secondary (header, search).
- Middle 15% = content + secondary CTA.
- One-handed mode toggle (Settings → Accessibility → One-handed).

### 11.3 Native vs Web Feel

- Mobile app (React Native + Expo) menggunakan native sheet (iOS bottom sheet, Android Material), native haptic, native push.
- Web mobile (PWA) sebagai fallback dengan UI mirip.
- Native exclusive: biometric auth (Face ID / Touch ID), share sheet, widget.

### 11.4 Offline-First (Limited)

- Cached: last viewed ticker, watchlist, Daily Picks last fetch.
- Offline indicator: banner kuning "Mode offline — data terakhir 09:35 WIB".
- Service worker (PWA) untuk static assets.

---

## 12. Design QA & Handoff

### 12.1 Figma File Organization

```
Nubuat Design System (master library)
├── 00 — Foundations
│   ├── Color tokens
│   ├── Typography tokens
│   ├── Spacing tokens
│   ├── Iconography
│   └── Motion
├── 01 — Components
│   ├── Button
│   ├── Input
│   ├── Card
│   ├── Table
│   ├── Chart wrappers
│   ├── Modal/Sheet/Popover
│   ├── Navigation
│   └── ...
├── 02 — Patterns
│   ├── Empty state
│   ├── Error state
│   ├── Skeleton
│   ├── Onboarding wizard
│   └── ...
└── 03 — Templates
    ├── Landing
    ├── Dashboard
    ├── Ticker page
    └── ...

Nubuat Product Designs (per feature)
├── M0 MVP
│   ├── Daily Picks
│   ├── Bandarmology
│   ├── AI Copilot
│   └── ...
├── M3 Beta
├── M6 GA
└── ...
```

### 12.2 Design Token Sync

- **Source of truth:** Figma Variables (Tokens Studio plugin).
- **Export pipeline:** Tokens Studio → JSON → Style Dictionary → CSS variables + Tailwind config + iOS Swift + Android XML.
- **CI check:** PR Figma → bot auto-generate code branch → designer review → merge.
- **Versioning:** SemVer untuk design system (`@nubuat/design-tokens@1.2.0`).

### 12.3 Component Documentation

Setiap komponen punya:
- Anatomy diagram
- Variants & states table
- Do/Don't visual
- Accessibility note
- Code snippet (React + Tailwind)
- Storybook link
- Figma component link

### 12.4 Design Review Cadence

- **Daily standup design (15 min)** — share WIP, blocker.
- **Weekly design crit (1h, Kamis)** — review desain minggu ini, feedback dari engineering + PM.
- **Bi-weekly user research synthesis** — share insight dari interview & usability test.
- **Monthly design system audit** — cek consistency, deprecation, new pattern needed.

### 12.5 Handoff Checklist (per fitur)

- [ ] Figma frame final dengan tags `Ready for dev`.
- [ ] Spacing & color via tokens (no hardcoded).
- [ ] States lengkap (default, hover, active, focus, disabled, loading, empty, error).
- [ ] Responsive: mobile, tablet, desktop.
- [ ] Accessibility note di Figma comment.
- [ ] Edge case mock (long text, no data, error).
- [ ] Microcopy final (review by content writer).
- [ ] Engineering kickoff meeting recorded.

---

## 13. Prototyping & Usability Testing Plan

### 13.1 High-Fi Prototype Scope

3 critical flow untuk pre-MVP test (M1):
1. **Onboarding → first Daily Pick view** (Journey 1)
2. **Daily Pick detail → set alert → AI Q&A** (Journey 2 + 3)
3. **Free → Pro upgrade** (Journey 5)

Tool: **Figma Prototype** + Maze (untuk async test) + Lookback (live moderated).

### 13.2 Recruitment

- Target: 6 user/persona × 5 persona = **30 user total**.
- Sourcing: Telegram trading communities, Stockbit, X/Twitter call, referral.
- Screening: 10-pertanyaan Google Form (AUM, frekuensi trading, current tools, demografi).
- Compensation: Rp 250.000 per session (voucher GoPay) atau 3 bulan Pro tier gratis.

### 13.3 Test Script Template

```
Intro (5 min)
  - Sapa, jelaskan tujuan ("kami ingin pahami bagaimana Anda...")
  - Stress: ini test produk, bukan test Anda.
  - Izin recording.

Background (5 min)
  - Cerita gaya trading Anda?
  - Tools apa yang biasa dipakai?
  - Frustrasi terbesar?

Task 1 (10 min) — Onboarding
  - Skenario: "Anda baru tahu Nubuat dari teman. Coba daftar."
  - Observe: time to first Daily Pick view; clicks waste; expression.

Task 2 (15 min) — Daily Pick deep dive
  - Skenario: "Anda lihat 1 Daily Pick BBRI. Pertama, putuskan apakah Anda mau follow."
  - Observe: scan pattern, factor breakdown click, AI usage.

Task 3 (15 min) — Conversion
  - Skenario: "Anda free user, mau coba fitur Pro karena butuh Research Aggregator."
  - Observe: pricing comprehension, trial activation friction.

Debrief (10 min)
  - SUS questionnaire (10 pertanyaan).
  - Open-ended: "Apa yang paling berguna? Paling membingungkan? Akan rekomendasi ke teman?"
  - Net Promoter Score.

Wrap (5 min)
  - Terima kasih, kompensasi info.

Total: 65 menit
```

### 13.4 Success Metrics

| Metric | Target |
|---|---|
| Task completion rate | ≥85% |
| Time to first Daily Pick view (Task 1) | <5 menit |
| SUS score | ≥75 (good) |
| NPS | ≥30 (post-MVP), ≥50 (post-GA) |
| "Easy to find what I need" (1-5) | ≥4.0 |
| Critical bug count | 0 (blocker), <3 (major) |

### 13.5 Iteration Cadence

- Week 1–2: Recruitment + script + prototype.
- Week 3: Run 30 sessions (6/day × 5 days).
- Week 4: Synthesis + iteration recommendations.
- Week 5: Re-prototype top 3 issues.
- Week 6: Validation round (10 user).
- Output: design doc + handoff to engineering for M0 MVP.

### 13.6 Continuous Research Post-Launch

- **In-app intercept survey** (Hotjar / Sprig): 1 pertanyaan saat exit ticker page (e.g., "Apa yang Anda cari?").
- **NPS quarterly** to paying users.
- **Power user advisory board** (10 Elite users) — monthly Discord call.
- **Customer Success interview** (5/bulan) — onboarding friction + churn reason.

---

## 14. Appendix

### 14.1 Design Tools

| Tool | Use |
|---|---|
| Figma | Design + prototype + design system |
| Tokens Studio | Design token management |
| Style Dictionary | Token build pipeline |
| Storybook | Component documentation + visual regression |
| Chromatic | Visual diff CI |
| Maze | Async usability test |
| Lookback | Live moderated session |
| Hotjar / PostHog | Heatmap + session recording |
| Sprig | In-app micro-survey |

### 14.2 Inspirasi & Benchmark

- **Bloomberg Terminal** — command palette, function code, density
- **TradingView** — chart performance + community
- **Stockbit Pro** — Indonesia-native pattern
- **AlphaFlow** — single-canvas workspace
- **Linear** — keyboard-first SaaS UX
- **Vercel Dashboard** — modern dark mode
- **Stripe** — pricing page transparency
- **Notion** — empty state & block-based UI

### 14.3 Daftar Reference Token (sample)

Lihat `@nubuat/design-tokens` package (akan di-publish saat M1).

---

*Dokumen ini akan di-iterate setiap sprint. Versi mayor di-bump saat ada perubahan struktural sistem desain.*
