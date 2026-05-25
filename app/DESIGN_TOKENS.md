# Nubuat Design Tokens & Visual Direction

> **Untuk Agent 9 (Frontend Shell):** Visual benchmark adalah kategori *modern Indonesian fintech terminal* (Stockbit, AlphaFlow, TradingView mobile). Tujuan: data-dense, dark-first, professional, dengan signaling finansial yang jelas (hijau naik / merah turun).
>
> **JANGAN copy** asset proprietary (logo, gambar, copy text spesifik) dari aplikasi referensi. Yang di-mirror adalah *visual category* (font, density, color logic), bukan elemen kreatif.

---

## 1. Font

**Primary:** **Inter Variable** (open-source, Google Fonts).
- Pakai via `next/font/google` di `app/layout.tsx`:
  ```tsx
  import { Inter, JetBrains_Mono } from "next/font/google";
  const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
  const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });
  // <html className={`${inter.variable} ${mono.variable}`}>
  ```
- Features wajib aktif: `cv11`, `ss01`, `ss03`, `calt`, `rlig` (cleaner glyphs).
- Untuk angka: pakai class `tabular` atau `font-mono` agar tabular-nums aktif — angka di-align kolom rapi.

**Monospace:** **JetBrains Mono** untuk angka tabel, code snippet, ticker.

**Display heading:** Inter tetap (variable weight 800–900 untuk hero).

---

## 2. Color Tokens

Sudah didefinisikan di `app/globals.css` via Tailwind v4 `@theme`. Semua via OKLCH untuk perceptual uniformity dan auto-dark.

### Dark mode (PRIMARY — default state)
| Token | Nilai | Pakai untuk |
|---|---|---|
| `--color-background` | `oklch(0.16 0.015 250)` | Body background — deep blue-black |
| `--color-foreground` | `oklch(0.96 0.005 250)` | Text utama |
| `--color-card` | `oklch(0.2 0.015 250)` | Card / surface elevated |
| `--color-border` | `oklch(0.28 0.012 250)` | Divider subtle |
| `--color-muted-foreground` | `oklch(0.68 0.015 250)` | Text sekunder |
| `--color-primary` | `oklch(0.72 0.17 160)` | Brand accent (green-teal) |
| `--color-bull` | `oklch(0.74 0.19 155)` | Harga naik |
| `--color-bear` | `oklch(0.7 0.22 22)` | Harga turun |

### Class shortcut (Tailwind utility — sudah didefinisikan)
- `text-bull`, `text-bear`, `text-neutral`
- `bg-bull-soft`, `bg-bear-soft` (untuk badge/pill highlight)
- `border-bull`, `border-bear`
- `price-pulse-up`, `price-pulse-down` (animasi subtle saat price update — respect prefers-reduced-motion)

---

## 3. Spacing & Density

Density-first untuk konteks dashboard finansial — Bloomberg-style "comfortable but dense".

- Base unit: **4px** (Tailwind default)
- Row height untuk price table: **40px** (compact) atau **48px** (comfortable) — toggle di Settings nanti
- Card padding: `p-4` (16px) default, `p-3` (12px) untuk compact
- Section gap: `gap-4` (16px)
- Form field height: 40px (`h-10`)
- Button height: 36px (`h-9`) default, 32px (`h-8`) untuk inline action

---

## 4. Border Radius

- Cards: `rounded-lg` (8px) default
- Buttons: `rounded-md` (6px)
- Pills/badges: `rounded-full`
- Inputs: `rounded-md` (6px)
- Modal/sheet: `rounded-xl` (12px)
- Avatar: `rounded-full`

---

## 5. Shadow

Subtle untuk dark mode — depth via background lightness shift, not heavy shadows.

- `shadow-xs` — input focus glow
- `shadow-sm` — card default
- `shadow-md` — dropdown menu
- `shadow-lg` — popover
- `shadow-elevated` — modal/dialog

Dark mode utama-nya rely pada `--color-card` (elevated) lebih terang dari `--color-background` — bukan shadow.

---

## 6. Layout Pattern

### Desktop
```
┌─────────────────────────────────────────────────────────┐
│  TopBar: logo │ search (Cmd+K) │ tier badge │ avatar    │  56px
├──────┬──────────────────────────────────────────────────┤
│ Side │ Main content area                                 │
│ Bar  │ ┌──────────────────────────────────────────────┐ │
│ 240px│ │  Breadcrumb / tabs                            │ │
│      │ ├──────────────────────────────────────────────┤ │
│ - Dashboard                                              │
│ - Picks      ── active item: bg-accent, border-l-primary │
│ - Watchlist                                              │
│ - Alerts                                                 │
│ - Copilot                                                │
│ - Subscribe                                              │
│      │ └──────────────────────────────────────────────┘ │
└──────┴──────────────────────────────────────────────────┘
```

### Mobile
- Bottom tab nav (5 items): Home / Picks / Watch / AI / More
- Top bar: kompak, hanya logo + bell + avatar
- Drawer untuk full nav

### Density toggle
- "Comfortable" — row 48px, font 14px, padding p-4
- "Compact" — row 36px, font 13px, padding p-3
- "Pro" (Bloomberg-style) — row 28px, font 12px, padding p-2, font-mono untuk price column

Stored di `user_profiles.preferences.density` (Agent 3 schema).

---

## 7. Data Visualization

### Price cell
- Format: `Rp 4.750` (locale id-ID, no decimal untuk IDR; pakai `Intl.NumberFormat`)
- Change %: `+2,40%` (hijau) / `-1,80%` (merah)
- Class: `font-mono tabular text-bull` atau `text-bear`
- Cell padding minimum, vertical-align middle

### Sparkline mini-chart
- Inline di watchlist row — 60×24px lightweight-charts atau SVG path
- Color: `text-bull` kalau last > first, `text-bear` kalau sebaliknya
- No axis, no labels

### Full chart (lightweight-charts)
- Theme: dark, layout background `--color-card`
- Grid lines `--color-border`
- Candle bull: `--color-bull`, candle bear: `--color-bear`
- Volume histogram bottom 20% area
- Crosshair: `--color-foreground` 30% opacity

---

## 8. Komponen pattern khusus finance

### Ticker tag (chip)
```tsx
<span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-mono text-xs font-semibold bg-secondary text-foreground">BBRI</span>
```

### Price delta pill
```tsx
<span className={cn(
  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono tabular font-semibold",
  changePct > 0 ? "bg-bull-soft text-bull" : "bg-bear-soft text-bear"
)}>
  {changePct > 0 ? "▲" : "▼"} {Math.abs(changePct).toFixed(2)}%
</span>
```

### Verdict gauge (untuk Daily Picks score 0-100)
- Linear horizontal bar dengan 3 segment color (0-40 red, 40-70 amber, 70-100 green)
- Atau radial donut 0–100 dengan accent color

### Setup chip (untuk pick type)
- `continuation` → blue
- `reversal` → magenta
- `breakout` → green
- `pullback` → amber
- `range` → neutral

---

## 9. Animasi & Motion

- Transition default: `transition-colors duration-150 ease-out`
- Modal/sheet enter: 200ms ease-out
- Skeleton shimmer: 1.5s linear infinite
- Price update pulse: `.price-pulse-up` / `.price-pulse-down` (0.6s)
- **Respect** `prefers-reduced-motion`

---

## 10. Iconography

**Library:** Lucide (sudah ada di `package.json`).

Common icons untuk konteks:
- Watchlist: `Star`
- Alerts: `Bell`
- AI: `Sparkles`
- Picks: `Target` atau `Crosshair`
- Up: `TrendingUp` / `ChevronUp` / `ArrowUp`
- Down: `TrendingDown` / `ChevronDown` / `ArrowDown`
- Search: `Search`
- Command: `Command`
- Settings: `Settings`
- Logout: `LogOut`
- Bull/bear icon: tidak ada di Lucide; pakai emoji `▲ ▼` atau custom SVG

Ukuran default: 16px (`h-4 w-4`), 20px (`h-5 w-5`) untuk header.

---

## 11. Microcopy & Tone (Bahasa Indonesia)

Formal-ramah, "Anda", tidak menggurui.

- CTA primary: "Lihat detail", "Tambah ke watchlist", "Set alert"
- Empty state: action-oriented — "Belum ada saham di watchlist. Tambahkan ticker pertama Anda."
- Error: spesifik & solvable — "Koneksi terputus. Coba muat ulang." bukan "Terjadi kesalahan."
- Disclaimer: selalu dari `app_config.app.disclaimer_text`, jangan rewrite.

---

## 12. Aksesibilitas (WCAG 2.2 AA)

- Contrast ratio minimum 4.5:1 untuk text (verify tokens — dark mode aman karena foreground L≈0.96 vs background L≈0.16 ≈ 12:1).
- Focus visible: outline `--color-ring` 2px offset 2px
- Color is NEVER the only signal — sertai dengan icon (▲/▼) atau text label
- Live region untuk price updates: `aria-live="polite"` di parent table
- Chart: provide `data-table` alternatif untuk screen reader

---

## 13. Implementasi Checklist (untuk Agent 9)

- [ ] Migrate font ke `next/font/google` di `app/layout.tsx` (Inter + JetBrains Mono)
- [ ] Verify semua component pakai CSS variable (bukan hardcoded color)
- [ ] Build `PriceCell` component reusable dengan signed coloring
- [ ] Build `Sparkline` component
- [ ] Build `TickerChip`, `DeltaPill`, `SetupChip`
- [ ] Theme provider (next-themes atau custom) — toggle dark/light, persist user preference
- [ ] Density toggle wired ke user preferences
- [ ] Tabular numerics di semua price table
- [ ] Lightweight-charts dark theme config konsisten dengan tokens

---

**Catatan akhir:** Konsistensi visual > kreativitas individual. Setiap component menggunakan token di `globals.css`. Kalau perlu warna baru → tambah ke `@theme`, bukan inline.
