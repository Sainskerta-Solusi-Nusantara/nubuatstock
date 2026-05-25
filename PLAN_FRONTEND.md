# Frontend Architecture Plan — Nubuat

> **Dokumen turunan dari:** `ANALISIS_APLIKASI_SAHAM.md` (section 4, 5, 7, 12)
> **Owner Frontend:** Frontend Architect
> **Tanggal:** 11 Mei 2026
> **Status:** v0.1 — Frontend Discovery & Foundation
> **Scope:** Web (Next.js), Mobile (React Native + Expo), Desktop (Tauri 2.0), shared packages.
> **Out of scope:** detail Backend service, schema database fisik, security policy mendalam, wireframe ASCII (ditangani agent terpisah).

---

## 0. Prinsip Umum

1. **Single-canvas terminal first** — UX harus memberi *Bloomberg feel* sejak interaksi pertama (Cmd+K, `<TICKER> <GO>`, multi-pane workspace).
2. **Type-safety end-to-end** — schema Zod di `packages/types` jadi *source of truth* untuk request/response API, form validation, dan storage.
3. **Code share maksimum** antar platform — bisnis logic, types, API client, validation, dan i18n string diisolasi di `packages/*` sehingga `apps/web`, `apps/mobile`, `apps/desktop` cukup mengonsumsi.
4. **Real-time as a first-class citizen** — tiap komponen yang konsumsi data live harus aware terhadap *connection state* dan *backpressure*.
5. **Tier-aware UI** — setiap fitur tahu konteks tier user (Free/Starter/Pro/Elite) dan menampilkan *paywall fallback* yang konsisten.
6. **Performance budget enforced** — diukur otomatis di CI (Lighthouse CI + bundle analyzer + custom perf metric chart render).
7. **Accessibility non-negotiable** — WCAG 2.2 AA minimum; chart wajib punya *data-table alternative*.
8. **Internationalization-ready dari hari pertama** — meskipun launch ID, semua string lewat i18n.

---

## 1. Stack Final & Versioning

### 1.1 Tabel Stack Inti

| Kategori | Pilihan | Versi minimum | Justifikasi singkat |
|---|---|---|---|
| Web framework | **Next.js** | 15.0 (App Router, React 19, Turbopack stable) | RSC + streaming + server actions + edge runtime |
| Bahasa | **TypeScript** | 5.5+ | `satisfies`, decorator stage-3, const type params; `strict: true` wajib |
| Runtime React | **React** | 19.0 | Compiler-ready, `use()` hook, transition refinement |
| Server state | **TanStack Query** | 5.x | Suspense integration, prefetch SSR, persistence plugin |
| Client UI state | **Zustand** | 5.x | Minimal, slice pattern, devtools |
| URL state | **nuqs** | 2.x | Typed search params, server-friendly |
| UI primitives | **Radix UI** | latest | Accessibility-first headless |
| Component library | **shadcn/ui** | (CLI generated, pinned) | Owned source, themeable |
| Styling | **Tailwind CSS** | v4 (CSS-first config) | Tokens via `@theme`, zero-runtime |
| Class composition | **clsx** + **tailwind-merge** | — | Class merging deterministik |
| Animation | **Motion (Framer Motion v12)** | 12.x | RSC-friendly motion |
| Charting (primary) | **TradingView Lightweight Charts** | 5.x | 45KB, canvas, 60FPS, Apache 2.0 |
| Charting (advanced) | **TradingView Advanced Charts** | (license) | Upgrade saat Pro tier go-live (M6–M9) |
| Data grid | **AG Grid Community** | 32.x | Virtualization; upgrade Enterprise untuk pivot di Elite |
| Tables (light) | **TanStack Table** | 8.x | Untuk tabel non-virtualized |
| Forms | **React Hook Form** + **Zod** | 7.x / 3.x | Performance + shared schema |
| Real-time | Native **WebSocket** + **TanStack Query subscribe** | — | Custom protocol, fallback SSE |
| Date/time | **date-fns-tz** | 3.x | Asia/Jakarta + WIB timezone aware |
| Numbers/money | **dinero.js** + **@formatjs/intl** | — | Avoid float in monetary calc |
| Command palette | **cmdk** | 1.x | Composable, fuzzy via `matchSorter` |
| Hotkeys | **react-hotkeys-hook** + custom Bloomberg parser | 4.x | Sequence support |
| Layout engine | **react-grid-layout** (web) / **Dockview** untuk advanced | 1.x / 2.x | Drag/resize persistence |
| i18n | **next-intl** | 3.x | App Router native, server components |
| Feature flags | **GrowthBook SDK** | 1.x | Server eval + client hydrate |
| Analytics | **PostHog** | 1.x | Product analytics + session replay |
| Errors | **Sentry** | 8.x | Source map upload, replay integration |
| Web vitals | **web-vitals** | 4.x | RUM ke PostHog |
| Testing (unit) | **Vitest** | 2.x | ESM-first, fast |
| Testing (component) | **Testing Library** | 16.x | DOM assertions |
| Testing (E2E) | **Playwright** | 1.4x | Cross-browser, trace viewer |
| Visual regression | **Storybook 8** + **Chromatic** | 8.x | Story-driven dev |
| API mocking | **MSW** | 2.x | Service worker + Node |
| Mobile framework | **React Native** + **Expo SDK** | 0.76 / 52 | New Architecture (Fabric + TurboModules) enabled |
| Mobile router | **Expo Router** | 4.x | File-based, deep linking |
| Desktop | **Tauri** | 2.0 | Rust core, multi-window, signed updates |
| Package manager | **pnpm** | 9.x | Workspace + content-addressable |
| Monorepo | **Turborepo** | 2.x | Remote caching + task graph |
| Linter | **Biome** | 1.9+ | Single-pass lint+format, cepat |
| Type checker CI | **tsc --noEmit** + **arethetypeswrong** | — | Library export validation |

### 1.2 Justifikasi Pilihan Kunci

- **Next.js 15 over Remix:** RSC matang, Vercel-grade edge, ekosistem React Native untuk Server Components masih lama, tapi App Router sudah cukup untuk SSR + ISR. Remix bagus tapi RSC-nya kalah maju.
- **Zustand over Redux Toolkit:** Untuk client UI state (workspace, modal, panel toggle, hotkey buffer), Zustand 5KB gzipped + slice pattern lebih cepat ditulis. TanStack Query handle 95% server state.
- **TanStack Query over SWR:** Mutation, optimistic update, infinite query, persistence (offline mobile), suspense + prefetch SSR sudah built-in dan lebih lengkap.
- **Tailwind v4 over Panda CSS:** Tailwind v4 sudah punya CSS-first config dan token-friendly. Panda lebih ergonomis tapi ecosystem lag. shadcn juga align dengan Tailwind.
- **TradingView Lightweight Charts dulu, upgrade Advanced Charts saat butuh drawing tools rich:** MVP cukup Lightweight; saat user Pro butuh full drawing + custom indicator → migrate komponen wrapper saja (lihat section 7).
- **AG Grid over TanStack Table untuk grid finansial besar:** Watchlist + screener bisa 945 ticker × 30 kolom; AG Grid virtualization & cell renderer lebih battle-tested. TanStack Table dipakai untuk tabel kecil/medium.
- **Tauri over Electron:** binary 5–10 MB vs 100+ MB; native window per detached chart; signed auto-update dari S3/R2.

---

## 2. Monorepo Structure

### 2.1 High-Level Tree

```
nubuat/
├── apps/
│   ├── web/                       # Next.js 15 App Router
│   ├── mobile/                    # Expo + React Native
│   ├── desktop/                   # Tauri 2.0 (Rust + web bundle)
│   └── docs/                      # Storybook host + design system docs
├── packages/
│   ├── ui/                        # Radix + shadcn components
│   ├── charts/                    # Lightweight Charts wrapper
│   ├── api-client/                # Typed REST + WS client
│   ├── types/                     # Zod schemas + inferred types
│   ├── utils/                     # date, money, formatter
│   ├── i18n/                      # next-intl messages + format
│   ├── feature-flags/             # GrowthBook adapter
│   ├── hotkeys/                   # Bloomberg parser + registry
│   ├── command-palette/           # cmdk registry & resolvers
│   ├── workspace/                 # Layout engine + persistence
│   ├── analytics/                 # PostHog wrapper + event taxonomy
│   ├── auth/                      # Auth provider + token refresh
│   ├── realtime/                  # WS client + subscription manager
│   ├── tier/                      # Tier gating + paywall component
│   └── config/                    # eslint, biome, tsconfig, tailwind preset
├── tooling/
│   ├── scripts/                   # codegen, schema sync, release
│   └── ci/                        # GitHub Actions reusable workflows
├── .changeset/                    # versioning internal packages
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

### 2.2 Detail Per Folder

#### `apps/web` (Next.js 15)

```
apps/web/
├── src/
│   ├── app/                       # App Router
│   │   ├── (marketing)/           # public landing, pricing
│   │   ├── (auth)/                # login, register, forgot
│   │   ├── (terminal)/            # workspace authenticated
│   │   │   ├── layout.tsx         # 3-pane layout shell
│   │   │   ├── @left/             # parallel: nav/watchlist slot
│   │   │   ├── @center/           # parallel: chart/dashboard slot
│   │   │   ├── @right/            # parallel: news/AI/broker slot
│   │   │   ├── ticker/[symbol]/   # ticker deep dive
│   │   │   ├── screener/
│   │   │   ├── picks/
│   │   │   ├── research/
│   │   │   ├── portfolio/
│   │   │   ├── alerts/
│   │   │   ├── backtest/
│   │   │   ├── settings/
│   │   │   └── billing/
│   │   ├── api/                   # Route handlers (BFF: token refresh, webhook proxy, OG image)
│   │   └── (system)/error.tsx not-found.tsx
│   ├── features/                  # per-feature modules (see §3)
│   ├── server/                    # server-only utils (auth, edge)
│   ├── styles/                    # tailwind entry + tokens
│   └── env.ts                     # @t3-oss/env-nextjs
├── public/
├── next.config.ts
└── package.json
```

#### `apps/mobile` (Expo SDK 52)

```
apps/mobile/
├── app/                           # Expo Router file-based
│   ├── (tabs)/                    # bottom tabs: home, watchlist, picks, alerts, me
│   ├── ticker/[symbol].tsx
│   ├── ai.tsx
│   ├── onboarding/
│   └── _layout.tsx
├── src/
│   ├── features/                  # mobile-specific UI; reuse logic dari packages
│   ├── components/                # native components (RN primitives)
│   ├── hooks/
│   └── lib/
├── assets/
├── app.config.ts                  # Expo config (signing, push)
└── eas.json
```

#### `apps/desktop` (Tauri 2.0)

```
apps/desktop/
├── src-tauri/
│   ├── src/
│   │   ├── main.rs
│   │   ├── commands/              # invoke handlers (fs export, native dialog, multi-window)
│   │   ├── tray.rs
│   │   └── updater.rs
│   ├── tauri.conf.json
│   └── icons/
├── src/                           # web frontend (reuse Next.js export atau Vite SPA)
│   └── (mirrors apps/web atau dedicated workspace shell)
└── package.json
```

#### `packages/ui`

```
packages/ui/
├── src/
│   ├── primitives/                # Button, Input, Select, Dialog, Popover, Tooltip
│   ├── data-display/              # Card, Stat, Badge, Tag, KeyValue
│   ├── feedback/                  # Toast, Alert, Skeleton, Progress
│   ├── layout/                    # Stack, Grid, Pane, Splitter, Resizable
│   ├── navigation/                # Tabs, Breadcrumb, Sidebar, NavItem
│   ├── overlays/                  # Modal, Drawer, Sheet, ContextMenu
│   ├── finance/                   # PriceTick, ChangePct, OHLCRow, MoneyDisplay
│   ├── icons/                     # Lucide re-export + custom IDX icons
│   └── tokens/                    # design tokens (TS + CSS variables)
├── tailwind-preset.ts
└── package.json
```

Exports per-directory ESM dengan `"exports"` field; tree-shake friendly.

#### `packages/charts`

```
packages/charts/
├── src/
│   ├── core/                      # ChartProvider, useChart, useSeries
│   ├── series/                    # Candle, Line, Area, Histogram, BaselineSeries
│   ├── overlays/                  # VWAP, BollingerBand, VolumeProfile
│   ├── indicators/                # SMA, EMA, RSI, MACD calculators (pure TS)
│   ├── drawings/                  # trendline, fibonacci, zone
│   ├── mtf/                       # MultiTimeframeDashboard
│   ├── sync/                      # crosshair + timescale sync bus
│   ├── adapters/                  # bridge: lightweight-charts ↔ tradingview-advanced
│   └── perf/                      # throttle, RAF batcher
└── package.json
```

#### `packages/api-client`

```
packages/api-client/
├── src/
│   ├── http/                      # fetch wrapper (typed, retry, ETag)
│   ├── ws/                        # WebSocket client
│   ├── endpoints/                 # per-resource: quotes, broker, fundamentals, picks, ai, screener
│   ├── query-keys.ts              # canonical TanStack Query keys
│   └── react/                     # custom hooks (useQuote, useBrokerSummary)
└── package.json
```

#### `packages/types`

```
packages/types/
├── src/
│   ├── domain/                    # Ticker, Quote, Broker, Order, Pick, Indicator
│   ├── api/                       # request/response Zod schema (mirror BE)
│   ├── ws/                        # WS message envelope schema
│   ├── billing/                   # Tier, Plan, Invoice
│   └── feature-flags.ts
└── package.json
```

#### `packages/utils`

```
packages/utils/
├── src/
│   ├── money.ts                   # IDR formatter, compact (jt/M/T)
│   ├── number.ts                  # localized id-ID number
│   ├── date.ts                    # Asia/Jakarta helpers, sesi bursa (09:00–15:30 WIB)
│   ├── color.ts                   # P/L color palette (green/red, semantic)
│   ├── perf.ts                    # throttle, debounce, RAF
│   ├── string.ts                  # ticker normalize (BBRI ↔ bbri)
│   └── guard.ts                   # type guards, assertion helpers
└── package.json
```

#### `packages/i18n`

```
packages/i18n/
├── src/
│   ├── messages/
│   │   ├── id/
│   │   │   ├── common.json
│   │   │   ├── finance-terms.json
│   │   │   ├── screener.json
│   │   │   ├── errors.json
│   │   │   ├── ai.json
│   │   │   └── billing.json
│   │   └── en/ (mirror)
│   ├── formats/
│   │   ├── currency.ts            # IDR + compact
│   │   ├── date.ts                # locale aware + WIB
│   │   └── pluralization.ts
│   └── routing.ts                 # next-intl middleware config
└── package.json
```

#### `packages/feature-flags`

```
packages/feature-flags/
├── src/
│   ├── client.ts                  # GrowthBook client init
│   ├── server.ts                  # server-side evaluation untuk RSC
│   ├── definitions.ts             # typed flag keys + default
│   ├── tier-rules.ts              # mapping flag ↔ tier
│   └── react/                     # useFlag, <FeatureGate />
└── package.json
```

---

## 3. Module / Feature Boundary

Setiap feature folder (`features/<name>`) berisi: `routes/`, `components/`, `hooks/`, `state/`, `api.ts` (re-export dari `packages/api-client`), `types.ts`, dan `index.ts` (public surface). Lintas-feature *tidak* boleh import langsung dari `components/` feature lain — selalu via `index.ts`.

| Feature | Routing (App Router) | State ownership | API contract konsumsi |
|---|---|---|---|
| `auth` | `(auth)/login`, `(auth)/register`, `(auth)/forgot`, `(auth)/verify` | Zustand `authStore` (token, user, tier); session via httpOnly cookie | `POST /auth/login`, `/auth/refresh`, `/auth/me` |
| `watchlist` | `(terminal)/@left/(watchlist)` parallel + modal CRUD | TanStack Query (lists, items); Zustand untuk drag-reorder buffer | `GET /watchlists`, `POST /watchlists`, WS sub `quotes.<symbols>` |
| `chart` | `(terminal)/ticker/[symbol]` | TanStack Query (candles, indicators); Zustand `chartStore` (active TF, drawings, layout); URL state (timeframe, indicators preset) | `GET /candles?symbol&tf`, WS sub `ticks.<symbol>`, `GET /indicators/preset` |
| `daily-picks` | `(terminal)/picks`, `(terminal)/picks/[id]` | TanStack Query (picks list, detail) | `GET /picks/today`, `GET /picks/:id`, WS sub `picks.alerts` |
| `ai-copilot` | `(terminal)/@right/(ai)` slot + modal full screen `(terminal)/ai` | Zustand `aiSessionStore` (conversation buffer); TanStack Query mutation streaming | `POST /ai/stream` (SSE), `GET /ai/conversations`, tool-use bridging via custom hook |
| `research` | `(terminal)/research`, `(terminal)/research/[reportId]` | TanStack Query infinite list | `GET /research?ticker&source&dateFrom`, `GET /research/:id`, search via Meilisearch facade |
| `screener` | `(terminal)/screener`, share via URL hash | URL state (nuqs) untuk filter; TanStack Query untuk hasil | `POST /screener/run`, `GET /screener/presets`, `POST /screener/save` |
| `backtest` | `(terminal)/backtest`, `(terminal)/backtest/[runId]` | TanStack Query + Zustand untuk builder no-code state | `POST /backtest/run` (async job), `GET /backtest/:id`, WS `jobs.<id>` |
| `portfolio` | `(terminal)/portfolio` | TanStack Query + Zustand untuk simulasi paper trading | `GET /portfolio`, `POST /portfolio/trades`, WS `portfolio.pnl` |
| `alerts` | `(terminal)/alerts` + composer modal | TanStack Query | `GET /alerts`, `POST /alerts`, `PATCH /alerts/:id`, WS `alerts.fired` |
| `billing` | `(terminal)/billing`, `(terminal)/billing/upgrade`, callback `/api/billing/midtrans` | TanStack Query (subs, invoices) | `GET /subscription`, `POST /checkout/session`, webhook proxy server-side |
| `command-palette` | global overlay | Zustand `paletteStore`; command registry static | aggregated dari semua feature via `registerCommand()` |
| `hotkeys` | global handler | Zustand `hotkeyBufferStore` | parser sequence `<TICKER> <GO>` → navigate |
| `notifications` | `(terminal)/notifications` + toast bus | Zustand `notificationStore` | WS `notifications.user.<id>` |

### 3.1 Feature Public API Contract

```ts
// features/daily-picks/index.ts
export { PicksRoute } from "./routes/picks-route";
export { PickCard } from "./components/pick-card";
export { useTodayPicks, usePickDetail } from "./hooks";
export type { Pick, PickSetup } from "./types";
export { picksCommands } from "./commands"; // CommandDef[]
export { picksFlags } from "./flags";       // typed flag keys
```

Aturan: feature lain hanya boleh `import { X } from "@/features/daily-picks"`.

---

## 4. Routing Strategy (Next.js App Router)

### 4.1 Peta Route

| Path | Akses | Layout | Catatan |
|---|---|---|---|
| `/` | public | `(marketing)` | landing, hero, pricing CTA |
| `/pricing` | public | `(marketing)` | tier matrix |
| `/login`, `/register`, `/forgot`, `/verify/[token]` | public | `(auth)` | server actions untuk submit |
| `/onboarding` | authenticated | `(terminal)` minimal | wizard, set watchlist awal |
| `/dashboard` | authenticated (Free+) | `(terminal)` | landing default |
| `/ticker/[symbol]` | authenticated (Free quote delayed; Pro real-time) | `(terminal)` | nested tabs: chart / fundamental / broker / news / ai |
| `/screener` | authenticated (Starter+) | `(terminal)` | share via URL hash |
| `/picks` | authenticated (Free=preview; Starter 3/d; Pro 10/d) | `(terminal)` | tier-gated body |
| `/research` | authenticated (Pro+) | `(terminal)` | paywall fallback untuk Starter |
| `/backtest` | authenticated (Pro+) | `(terminal)` | async job page |
| `/portfolio` | authenticated (Elite paper trading; Pro tracking) | `(terminal)` | |
| `/alerts` | authenticated | `(terminal)` | |
| `/billing` | authenticated | `(terminal)` | self-serve upgrade/downgrade |
| `/settings/*` | authenticated | `(terminal)` | preferences, hotkey custom, density |
| `/admin/*` | role admin | `(admin)` | dashboard internal (out of MVP) |

### 4.2 Parallel Routes & Intercepting Routes

**Parallel routes** dipakai di `(terminal)/layout.tsx` untuk 3-pane workspace:

```
(terminal)/
├── layout.tsx                # render @left @center @right
├── @left/
│   ├── default.tsx           # watchlist
│   ├── nav/page.tsx          # alternate slot
│   └── ...
├── @center/
│   ├── default.tsx           # dashboard summary
│   └── ...
└── @right/
    ├── default.tsx           # news + AI tab
    └── ...
```

Workspace state (slot mana ditampilkan apa) dipersist di Zustand + URL search param `wl`, `cn`, `rg` (compressed JSON via lz-string).

**Intercepting routes** untuk modal-over-route:

- `(.)ticker/[symbol]` — quick-peek dari watchlist tetap di context layout.
- `(.)research/[id]` — buka report sebagai sheet.
- `(.)billing/upgrade` — modal upgrade saat klik fitur tier-gated.

### 4.3 Loading / Error / Not-Found Pattern

Setiap route segment punya:
- `loading.tsx` — skeleton sesuai tipe konten (chart skeleton beda dengan table skeleton).
- `error.tsx` — capture ke Sentry, tombol retry; jika error 401 → redirect ke login.
- `not-found.tsx` — ticker tidak ada → suggest similar via Meilisearch.

Suspense boundary granular di komponen berat (chart, AG Grid screener) supaya streaming SSR tidak terblokir.

### 4.4 Middleware

`middleware.ts` di root:
1. Auth guard untuk `(terminal)/*` — refresh token bila expired.
2. Locale negotiation (next-intl).
3. Feature flag header injection (`x-flags`) untuk SSR.
4. A/B test bucket assignment via cookie.
5. Rate limit hint (geo + IP) untuk endpoint publik.

---

## 5. State Management Strategy

### 5.1 Matrix Keputusan

| Kategori state | Tool | Contoh |
|---|---|---|
| **Server cache** (data dari API REST) | TanStack Query | quotes, broker summary, picks, research list |
| **Server cache real-time** (WS push) | TanStack Query + custom subscribe | tick price, intraday foreign flow |
| **Client UI state** (volatile, lifecycle ≈ session) | Zustand slice | open modal, active workspace tab, drag preview, AI conversation buffer |
| **URL state** (shareable, bookmarkable) | nuqs | screener filter, chart timeframe, picks date filter |
| **Form state** | React Hook Form | login, alert composer, screener builder |
| **Cross-cutting context** (rare changes) | React Context | theme, locale, tier, auth user |
| **Server-only state** | Server Components + `cookies()`/`headers()` | initial user payload, feature flag eval |

### 5.2 Contoh

**TanStack Query — quote dengan WS overlay:**
```ts
useQuery({
  queryKey: qk.quote(symbol),
  queryFn: () => api.quotes.get(symbol),
  staleTime: 5_000,
});
// useWsSubscription("ticks." + symbol, msg => {
//   queryClient.setQueryData(qk.quote(symbol), prev => ({ ...prev, last: msg.price }));
// });
```

**Zustand — workspace store (slice pattern):**
```ts
type WorkspaceState = {
  layout: GridLayout[];
  activePanel: PanelId | null;
  setLayout: (l: GridLayout[]) => void;
};
export const useWorkspace = create<WorkspaceState>()(devtools(persist((set) => ({
  layout: defaultLayout,
  activePanel: null,
  setLayout: (layout) => set({ layout }),
}), { name: "nubuat:workspace" })));
```

**nuqs — screener URL state:**
```ts
const [filters, setFilters] = useQueryStates({
  sector: parseAsString,
  pe: parseAsArrayOf(parseAsFloat),
  roe: parseAsFloat,
  liquidity: parseAsInteger,
});
```

**Context — tier:**
```ts
<TierContext value={{ tier, limits, can }}>
```

### 5.3 Anti-Patterns Yang Dilarang

- Menyimpan server response di Zustand (gunakan TanStack Query).
- `useEffect` untuk fetching (gunakan query hook).
- State global untuk form (form pakai React Hook Form lokal).
- URL state untuk hal volatile (cursor position, hover state).

---

## 6. Real-Time Data Integration

### 6.1 WebSocket Client Architecture

```
packages/realtime/
├── client.ts                # single WS connection per origin
├── subscription-manager.ts  # dedup by topic, refcount
├── codec.ts                 # JSON binary fallback (CBOR jika perlu)
├── reconnect.ts             # exponential backoff + jitter
├── heartbeat.ts             # ping/pong 20s
├── react/
│   ├── WsProvider.tsx
│   └── useWsSubscription.ts
└── query-bridge.ts          # bridge ke TanStack Query
```

**Protokol envelope:**
```json
{ "type": "sub", "topic": "ticks.BBRI", "ref": "xyz" }
{ "type": "msg", "topic": "ticks.BBRI", "data": { "p": 5450, "v": 12000, "t": 1746950400123 } }
{ "type": "err", "topic": "ticks.BBRI", "code": "RATE_LIMIT" }
```

### 6.2 Reconnection Backoff

`delay = min(30_000, base * 2^attempt + random_jitter(0, 1000))` dengan `base = 500ms`. Status `connecting | open | reconnecting | offline` di-broadcast ke React via `useConnectionStatus()`, dipakai di UI (indicator titik warna di topbar).

### 6.3 Subscription Dedup

`subscribe("ticks.BBRI")` refcount; topic baru dikirim ke server, topic yang sudah subscribed cukup increment counter. `unsubscribe` saat refcount 0.

### 6.4 Integrasi ke TanStack Query

```ts
useWsSubscription("ticks." + symbol, (msg) => {
  qc.setQueryData(qk.quote(symbol), (prev) => mergeTick(prev, msg.data));
});
```

Untuk chart, WS *tidak* langsung tulis ke query cache (terlalu sering). Tick dikirim ke RxJS subject internal chart engine yang di-throttle (next §7).

### 6.5 Throttle Strategy

| Konsumen | Throttle |
|---|---|
| Watchlist quote cell | 250ms leading |
| Ticker header price | 100ms |
| Chart engine | RAF batching (16ms) |
| Broker summary panel | 1s |
| AI Copilot streaming | per-chunk (token) |
| Notification toast | 500ms debounce |

### 6.6 Optimistic Update

Mutasi (place alert, save watchlist item) pakai `onMutate` → tulis cache → rollback `onError`. Indicator UI: outline biru pulse selama in-flight.

---

## 7. Chart Engine Integration

### 7.1 Wrapper Component Spec

```ts
// packages/charts/src/core/Chart.tsx
type ChartProps = {
  symbol: string;
  timeframe: Timeframe;
  series: SeriesDef[];          // candle, line, area
  overlays?: OverlayDef[];      // MA, Bollinger, VWAP, VolumeProfile
  drawings?: DrawingDef[];      // trendline, fib, zone
  syncGroup?: string;           // chart sync bus key
  height?: number;
  density?: "comfortable" | "compact";
  onCrosshairMove?: (p: CrosshairPayload) => void;
  onTimeRangeChange?: (r: Range) => void;
  presetId?: string;            // saved indicator preset
  realtime?: boolean;           // subscribe to ticks
};
```

### 7.2 MTF Dashboard Pattern

`<MultiTimeframeDashboard symbol="BBRI" timeframes={["1m","5m","15m","1H","1D"]} />` — render N chart kecil dalam grid, share crosshair via `sync.tsx` event bus, satu data source per timeframe.

### 7.3 Drawing Tools State Persistence

Drawings disimpan di backend per (`user_id`, `symbol`, `presetId`) sebagai JSON. Lokal: TanStack Query `qk.drawings(symbol)`; tulis dengan debounced mutation (3 detik setelah action terakhir). Schema versioned (`v: 1`) supaya migrasi mudah.

### 7.4 Performance Budget per Chart Instance

| Metrik | Target |
|---|---|
| First render (1000 candle) | ≤100ms |
| Tick update p95 | ≤16ms (1 frame) |
| Memory per chart | ≤25 MB |
| Tear-down (umount) | ≤50ms |
| Drawing add/remove | ≤30ms |

Diukur via Playwright + custom perf marker (`performance.measure("chart:initial")`).

### 7.5 Migration Path ke Advanced Charts

Saat upgrade ke TradingView Advanced Charts (M6–M9), hanya `packages/charts/src/adapters/` yang berubah. Komponen `<Chart />` API tetap, tapi internal swap dari Lightweight ke Advanced. Drawing schema di-translate via adapter.

---

## 8. Command Palette (Cmd+K)

### 8.1 Registry Pattern

```ts
// packages/command-palette/src/registry.ts
type Command = {
  id: string;
  title: string;
  group: "navigation" | "ticker" | "function" | "action" | "ai";
  keywords?: string[];
  hotkey?: string;
  icon?: ReactNode;
  tier?: Tier;                   // gating
  run: (ctx: CmdContext) => Promise<void> | void;
};
registerCommand(cmd: Command): UnregisterFn;
```

Setiap feature export `commands: Command[]` lewat `index.ts`; root layout iterasi dan `registerCommand`.

### 8.2 Fuzzy Search

`cmdk` + `match-sorter` (rank by group priority + recent usage + tier match). Ticker resolver async: ketik `BBR` → debounce 80ms → call `GET /tickers/search?q=bbr` → tampilkan results dengan ticker, nama emiten, sektor.

### 8.3 Hotkey Conflict Resolution

Conflict detection saat registrasi (Map ke key). Kategori prioritas:
1. Global navigation (`g d` dashboard)
2. Page-scope (`/` focus search)
3. Component-scope (chart `1` → 1m timeframe)

Saat conflict, hotkey dengan scope lebih sempit menang; warning di dev mode.

### 8.4 Kategori Command

| Group | Contoh | Hotkey global |
|---|---|---|
| navigation | "Go to Dashboard", "Go to Screener" | `g d`, `g s` |
| ticker | "Open BBRI", "Compare BBRI vs BMRI" | typing |
| function | "EQS — Equity Screener", "BMAP — Broker Map" | `e q s` |
| action | "New Alert", "Save Workspace", "Export Trade Journal" | `n a`, `w s` |
| ai | "Ask AI: why is BBRI down?", "Summarize earnings TLKM" | `?` |

---

## 9. Bloomberg-Style Hotkeys & Function Codes

### 9.1 Keyboard Handler Architecture

```
packages/hotkeys/
├── parser.ts                # tokenizer: TICKER | FUNCTION | GO
├── buffer.ts                # sliding buffer 500ms; reset on Esc/blur
├── dispatcher.ts            # route token sequence → action
├── help.ts                  # generate help overlay from registry
└── react/
    ├── useGlobalHotkeys.ts
    └── HotkeyBufferIndicator.tsx
```

### 9.2 `<TICKER> <GO>` Parser

State machine:
```
IDLE → [A-Z]+ → TICKER_TYPED → Enter|GO → resolveTicker(ticker) → navigate
                              → Space → expect FUNCTION_CODE → resolve
```

Display buffer di footer kanan: `BBRI █` blinking; `BBRI EQS` → "go to screener seeded by BBRI".

### 9.3 Function Code Router

```ts
const FUNCTIONS: Record<string, FunctionHandler> = {
  DES: ({ symbol }) => router.push(`/ticker/${symbol}?tab=overview`),
  GIP: ({ symbol }) => router.push(`/ticker/${symbol}?tab=chart&tf=1m`),
  EQS: () => router.push(`/screener`),
  RV: ({ symbol }) => router.push(`/ticker/${symbol}?tab=valuation`),
  BMAP: ({ symbol }) => router.push(`/ticker/${symbol}?tab=broker`),
  FA: ({ symbol }) => router.push(`/ticker/${symbol}?tab=fundamental`),
  NSE: () => openSearch("news"),
  PORT: () => router.push(`/portfolio`),
  WL: () => router.push(`/dashboard?panel=watchlist`),
  ALRT: () => router.push(`/alerts`),
  CALC: () => openOverlay("calculator"),
};
```

### 9.4 Help Overlay

`?` menampilkan modal full-list hotkey, dikelompokkan, searchable. Tooltip kontekstual `Shift+?` di tiap komponen menampilkan hotkey lokal.

---

## 10. Workspace System

### 10.1 Layout Engine

- **MVP:** `react-grid-layout` — drag/resize, breakpoint responsive.
- **Pro/Elite:** evaluasi `Dockview` untuk tabbed dock + split + float window (lebih Bloomberg-like).

### 10.2 Persistence Schema

```ts
type Workspace = {
  id: string;
  name: string;
  version: 1;
  panes: Array<{
    i: string;
    component: "Chart" | "Watchlist" | "News" | "Broker" | "AI" | "Picks" | "Macro";
    props: Record<string, unknown>;
    layout: { x: number; y: number; w: number; h: number };
  }>;
  meta: { createdAt: string; updatedAt: string; ownerId: string };
};
```

Disimpan di backend `GET/POST/PATCH /workspaces`; cached TanStack Query + Zustand mirror untuk drag responsiveness.

### 10.3 Share via URL

Compress JSON dengan `lz-string` → base64url → masukkan ke hash `#ws=<token>`. Decode di mount, prompt user "Import workspace from link?" sebelum apply.

### 10.4 Preset Templates

Built-in preset (read-only):
- `swing-trader-classic` — 1 chart 1D + watchlist + news.
- `bandarmology-focus` — broker map + foreign flow + chart 15m.
- `mtf-scalper` — 4 chart MTF + level-2.
- `research-analyst` — fundamental + research feed + AI.

User bisa duplicate preset → edit → save.

---

## 11. Theming & Design Tokens

### 11.1 Token Structure

Dua layer:
1. **Primitive tokens** — palette mentah (`color.green.500`, `space.4`, `font.size.sm`).
2. **Semantic tokens** — purpose-based (`color.surface.elevated`, `color.text.muted`, `color.signal.bullish`, `color.signal.bearish`).

```css
/* packages/ui/tokens/light.css */
@layer base {
  :root {
    --color-bull: oklch(0.72 0.18 145);
    --color-bear: oklch(0.62 0.21 25);
    --color-surface-base: oklch(0.99 0.01 100);
    --color-text-primary: oklch(0.18 0.02 260);
    /* ... */
  }
  :root[data-theme="dark"] {
    --color-surface-base: oklch(0.16 0.02 260);
    /* ... */
  }
  :root[data-theme="amoled"] {
    --color-surface-base: oklch(0 0 0);
  }
  :root[data-density="compact"] {
    --space-row: 24px;
    --font-size-row: 12px;
  }
}
```

### 11.2 Tailwind v4 Integration

```css
@import "tailwindcss";
@theme {
  --color-bull: var(--color-bull);
  --color-bear: var(--color-bear);
  --color-signal-bullish: var(--color-bull);
  /* ... */
}
```

`tailwind-preset.ts` di `packages/config` di-share semua apps.

### 11.3 Mode Switching

- **Theme:** `light | dark | amoled | system`. Persist di cookie (untuk SSR) + localStorage.
- **Density:** `comfortable | compact`. Compact menurunkan row height grid, font, gap.
- **Motion:** respek `prefers-reduced-motion`; toggle override di settings.

---

## 12. i18n (next-intl)

### 12.1 Namespace Strategy

| Namespace | Isi |
|---|---|
| `common` | tombol, action, status (Loading, Save, Cancel) |
| `finance-terms` | "Kapitalisasi Pasar", "Aliran Asing", "Tekanan Beli" |
| `screener` | label filter, preset name, hint |
| `errors` | pesan error (kategori: network, auth, data, payment) |
| `ai` | system prompt label, disclaimer, suggested questions |
| `billing` | tier name, fitur list, FAQ |
| `picks` | setup type, time horizon, R/R label |

### 12.2 Tone of Voice

- **ID:** semi-formal, gunakan "Anda", istilah finansial Indonesia (lihat `finance-terms.json`); hindari slang trading kecuali di komunitas konteks.
- **EN:** professional, neutral; tidak terlalu Bloomberg-pekat (audience retail).

### 12.3 Formatter

```ts
// packages/i18n/formats/currency.ts
formatIDR(5_450_000_000) // "Rp 5,45 M"
formatIDRCompact(1_200_000_000_000) // "Rp 1,2 T"
formatNumber(0.1234, { style: "percent", maximumFractionDigits: 2 }) // "12,34%"
formatDate(date, "session") // "Sesi 1 — 09:00 WIB"
formatDate(date, "hijri") // opsional, untuk konten edukasi
```

### 12.4 Loading Strategy

Locale messages di-`import.meta.glob` per namespace lalu RSC `getMessages()`; client component pakai `useTranslations(ns)`.

---

## 13. Performance Budget & Strategy

### 13.1 Bundle Budget

| Halaman | Initial JS gzipped | Catatan |
|---|---|---|
| `/` landing | ≤80 KB | Mostly RSC, minim JS |
| `/login` | ≤90 KB | form only |
| `/dashboard` | ≤200 KB | core terminal shell |
| `/ticker/[symbol]` | ≤260 KB | chart lazy |
| `/screener` | ≤230 KB | AG Grid lazy |

### 13.2 Code Splitting

- Feature folder = dynamic boundary (`next/dynamic` untuk komponen berat: chart, AG Grid, AI streaming UI).
- Vendor split: `lightweight-charts`, `ag-grid-community`, `cmdk` masing-masing chunk.
- Per-route segment via App Router default.

### 13.3 Image & Font

- `next/image` + AVIF priority, fallback WebP.
- Inter Variable + JetBrains Mono Variable (untuk tabular figures di harga); subset Latin + Indonesian punctuation.

### 13.4 RSC vs Client Component Decision Tree

```
Component butuh interaktif (state/event)? ── ya ─→ "use client"
                          │ tidak
                          ▼
Konsumsi data dari DB/internal API yang aman di server? ── ya ─→ RSC
                          │ tidak
                          ▼
Membutuhkan WS / browser-only API? ── ya ─→ "use client"
                          │ tidak
                          ▼
Static/derived dari props? ── ya ─→ RSC (default)
```

### 13.5 Suspense Boundary Placement

- Setiap panel besar (chart, broker, AI) punya Suspense boundary sendiri → stream independent.
- Skeleton dirancang menyerupai layout final supaya tidak CLS.

### 13.6 Prefetch Policy

- `<Link prefetch>` default untuk navigation utama (cap 3 sibling agar tidak boros bandwidth).
- Hover-prefetch hanya untuk action berat (open ticker dari watchlist).
- AI Copilot tidak di-prefetch (heavy bundle).

---

## 14. Form & Validation

### 14.1 RHF + Zod Pattern

```ts
// packages/types/api/alerts.ts
export const createAlertSchema = z.object({
  symbol: z.string().min(1),
  condition: z.enum(["price_above", "price_below", "rsi_overbought", "..."]),
  value: z.number().positive(),
  channels: z.array(z.enum(["inapp","email","push","wa","telegram"])).min(1),
});
export type CreateAlertInput = z.infer<typeof createAlertSchema>;
```

```ts
// features/alerts/components/alert-form.tsx
const form = useForm<CreateAlertInput>({ resolver: zodResolver(createAlertSchema) });
```

### 14.2 Shared dengan Backend

`packages/types` jadi sumber tunggal: BE (Go/Python) generate setara via `quicktype` atau manual mirror; tetap *contract test* di CI untuk drift detection.

### 14.3 Error Display Pattern

- Inline field error: `<FormMessage />` shadcn.
- Form-level error (server-side): `<Alert variant="destructive">` di atas form.
- Toast hanya untuk success (`"Alert tersimpan"`).

### 14.4 Server Action vs API Call

| Kasus | Pilihan |
|---|---|
| Mutation simple yang bergantung session cookie (CRUD alert, watchlist) | Server Action |
| Streaming response (AI Copilot) | Route handler SSE / fetch streaming |
| Mutation yang butuh optimistic update kompleks | TanStack Mutation → REST |
| Webhook payment callback | Route handler (BFF) |

---

## 15. Mobile App (React Native + Expo)

### 15.1 Code Sharing Strategy

| Shareable | Non-Shareable |
|---|---|
| `packages/types` | UI components (RN punya primitive sendiri) |
| `packages/api-client` | Navigation (Expo Router vs App Router) |
| `packages/utils` | Hotkey/command palette |
| `packages/i18n` messages | Workspace layout engine |
| Business logic hooks (non-DOM) | Chart drawing tools (gunakan lightweight chart RN port atau Skia custom) |
| Zod schemas, query keys | |

### 15.2 Navigation

Expo Router file-based, deep link `nubuat://ticker/BBRI`. Tab bar bottom: Home, Watchlist, Picks, Alerts, Me. Stack di dalam tiap tab.

### 15.3 Push Notification

- `expo-notifications` + FCM (Android) + APNs (iOS).
- Server kirim ke topic per-user `user.<id>` dan per-symbol `symbol.<sym>` (subscribe saat add watchlist).
- Kategori: alerts fired, daily picks (07:30 WIB), portfolio milestone.

### 15.4 Offline Cache

`@tanstack/query-persist-client` + `expo-secure-store` (atau MMKV) untuk persist queries non-sensitif. Stale tetap ditampilkan dengan banner "Offline — last update X menit lalu".

### 15.5 Biometric Auth

`expo-local-authentication` untuk unlock app + konfirmasi action sensitif (lihat saldo paper trading, eksekusi mutation tier-upgrade). Fallback PIN 6-digit.

---

## 16. Desktop App (Tauri 2.0)

### 16.1 Kapan Native Rust Command

| Use case | Implementasi |
|---|---|
| Export trade journal (CSV/Excel/PDF) | Rust command `export_journal()` → tulis file via `tauri-plugin-fs` |
| File picker open | `tauri-plugin-dialog` |
| Multi-window (detach chart) | `tauri::WebviewWindowBuilder` |
| Tray icon + global hotkey | `tauri-plugin-global-shortcut` |
| Native notification | `tauri-plugin-notification` |
| Auto-update | `tauri-plugin-updater` (signed manifest di R2) |
| Encrypted local cache (preferences) | `tauri-plugin-store` + age encryption |

### 16.2 Multi-Window Pattern

Detach chart: tombol di header chart → `invoke("open_chart_window", { symbol })`. Window baru reuse Next.js bundle dengan route `/standalone/chart/[symbol]` (layout minimal). Sinkronisasi state lintas window via Tauri event bus `emit('workspace:sync', payload)`.

### 16.3 Tray Icon

Status koneksi WS + quick action: Open Dashboard, Open Watchlist, Toggle Always-on-Top, Quit. Tray tooltip menampilkan IHSG live.

### 16.4 Auto-Update

Channel `stable` + `beta`. Signed update manifest. Toast in-app saat update tersedia: "Update v1.x.x tersedia — restart untuk pasang".

---

## 17. Testing Strategy

### 17.1 Piramida

| Level | Tool | Cakupan |
|---|---|---|
| Unit | Vitest | utils, formatter, indicator calc, parser hotkey |
| Component | Vitest + Testing Library | form, table cell, chart wrapper (mocked engine) |
| Story-driven | Storybook 8 + interactions | tiap komponen `packages/ui` |
| Visual regression | Chromatic | story baseline |
| Integration | Playwright (component testing mode) | feature integration |
| E2E | Playwright | critical paths: login → watchlist → daily pick → alert |
| Contract | MSW + Zod parse | response shape match schema |
| Performance | Playwright + `performance.measure` | chart render budget |
| Accessibility | axe-playwright + Storybook a11y addon | WCAG AA |

### 17.2 Critical E2E Paths (MVP)

1. Register → email verify → onboarding watchlist seed → dashboard.
2. Open ticker via Cmd+K `BBRI` → chart load → add indicator MA50 → save preset.
3. Daily Picks page (Starter): view 3 picks → set alert at TP1 → toast confirm.
4. Screener: filter PE<10 + ROE>15% → save preset → share URL → reopen.
5. Billing: upgrade Starter → Pro via Midtrans test → unlock Research page.

### 17.3 CI Pipeline

- PR: lint + typecheck + unit + component + E2E smoke + bundle size diff.
- Merge `main`: full E2E + Chromatic + Lighthouse CI.
- Release: smoke E2E di preview deployment + canary.

---

## 18. Accessibility (a11y)

### 18.1 Target

**WCAG 2.2 AA**, dengan AAA aspirational untuk komponen wajib (alert, billing).

### 18.2 Focus Management

- Tiap dialog/sheet pakai Radix focus trap.
- Skip-link "Lompat ke chart" di header.
- Route transition → fokus ke `<h1>` halaman baru.
- Focus visible: outline 2px solid `--color-focus`, offset 2px, tidak hilang di custom button.

### 18.3 Screen Reader

- Chart: `<table>` alternatif (data candles last 50 bars) di `<details>` saudara chart, di-toggle dengan ScreenReader-only button "Tampilkan tabel data".
- Live region untuk price update (rate-limited 5s biar tidak spam): "BBRI 5450, naik 1,5%".
- Notifikasi pakai `aria-live="polite"` (kecuali alert kritis: `assertive`).

### 18.4 Keyboard Navigation

- Semua aksi punya hotkey ATAU dapat dijangkau via Tab.
- Tab order konsisten dengan visual.
- Combobox (ticker search) Radix pattern: arrow up/down, Enter, Esc.

### 18.5 Color Contrast pada Chart

- Series bullish/bearish punya pasangan high-contrast (hijau-merah). Sediakan **mode colorblind-safe** (biru-oranye) di settings.
- Tidak mengandalkan warna saja — bull/bear icon kecil di samping persentase.

---

## 19. Analytics & Telemetry

### 19.1 PostHog Event Taxonomy

Penamaan: `<domain>.<object>.<action>` (snake_case di property, dot-separated di event name). Contoh:

| Event | Properties |
|---|---|
| `auth.session.started` | `method: "google"|"email"`, `is_new_user`, `tier` |
| `ticker.profile.viewed` | `symbol`, `from: "watchlist"|"palette"|"link"` |
| `chart.indicator.added` | `symbol`, `indicator`, `params`, `tier` |
| `picks.card.opened` | `pick_id`, `setup_type`, `rr`, `confidence` |
| `picks.alert.created_from_pick` | `pick_id`, `condition` |
| `ai.query.sent` | `intent`, `tokens_in`, `tier`, `latency_ms`, `model` |
| `ai.query.feedback` | `query_id`, `feedback: "up"|"down"` |
| `screener.preset.applied` | `preset_id`, `filter_count` |
| `billing.upgrade.initiated` | `from_tier`, `to_tier`, `cta_location` |
| `billing.upgrade.completed` | `from_tier`, `to_tier`, `revenue_idr`, `gateway` |
| `realtime.connection.disconnected` | `reason`, `duration_ms` |

### 19.2 Sentry

- Auto-capture unhandled error + unhandled promise.
- Replay 100% session error, 5% sampling normal session (Pro/Elite opt-in untuk full session replay).
- Source map upload di CI release.
- Ignore noisy errors: ResizeObserver loop, third-party script.

### 19.3 Web Vitals

`web-vitals` → PostHog `webvitals.metric.captured` (CLS, LCP, INP, TTFB, FCP). Alert di Slack jika p75 LCP > 2.5s.

### 19.4 Session Replay Opt-in

Default off untuk Free/Starter; Pro/Elite default on dengan banner consent (UU PDP). Mask semua input + harga real (untuk privacy paper trading).

---

## 20. Feature Flag & Gradual Rollout

### 20.1 GrowthBook Integration

- **Server-side eval** di `middleware.ts` → attach header `x-flags` → RSC baca via `headers()`.
- **Client SDK** hydrate dari payload SSR untuk konsistensi.
- **Cache** flag definition di edge KV (refresh tiap 60s).

### 20.2 Tier-Based Flag

```ts
// packages/feature-flags/tier-rules.ts
export const TIER_FLAGS = {
  "research.aggregator": ["pro", "elite"],
  "backtest.advanced": ["pro", "elite"],
  "ai.opus_mode": ["elite"],
  "paper_trading": ["elite"],
  "l2_depth": ["elite"],
  "intraday_foreign_flow_5m": ["elite"],
  "picks.intraday_refresh": ["pro", "elite"],
} as const;

export function canAccess(flag: keyof typeof TIER_FLAGS, tier: Tier): boolean {
  return TIER_FLAGS[flag].includes(tier);
}
```

`<FeatureGate flag="research.aggregator" fallback={<Paywall to="pro" />}>...</FeatureGate>`.

### 20.3 Gradual Rollout Pattern

- New chart engine v2: bucket by `user_id % 100 < 5%` → monitor metrics → ramp.
- Holdout group 5% selalu kebalik versi (untuk impact measurement).

---

## 21. Build & Deployment Pipeline

### 21.1 Pilihan Hosting

| Platform | Cocok untuk | Catatan |
|---|---|---|
| **Vercel** (rekomendasi MVP) | apps/web | Edge runtime, preview per PR, ISR mudah |
| **Cloudflare Pages** | apps/web alternatif | Workers + R2 native |
| **AWS Amplify Hosting + CloudFront** | enterprise scale | Lebih kontrol, integrasi VPC |
| **Self-host (k8s + Nginx)** | M12+ saat scale | Cost optimization |

### 21.2 Preview Deployment

- Setiap PR → preview URL (Vercel).
- Comment otomatis: Lighthouse score + bundle size diff + visual regression Chromatic.
- Storybook preview deploy juga per-PR (`docs.preview-<pr>.nubuat.app`).

### 21.3 Env Variable Management

- `@t3-oss/env-nextjs` validasi schema env saat build.
- Tier: `development`, `preview`, `staging`, `production`.
- Secret: 1Password Connect → Vercel env via CLI sync.
- Public prefix `NEXT_PUBLIC_*` minimum.

### 21.4 Edge Runtime Usage

- Middleware (auth, locale, flag) → edge.
- Route handlers ringan (OG image, redirect, health) → edge.
- AI streaming → Node.js runtime (Anthropic SDK kompatibel).
- Heavy compute (backtest trigger) → Node + queue produce ke backend.

### 21.5 Mobile & Desktop Pipeline

- **Mobile:** EAS Build (managed) → submit ke App Store / Play Store via EAS Submit. Channel `production`, `preview`, `internal` (TestFlight + Internal Testing).
- **Desktop:** GitHub Actions matrix (macOS, Windows, Linux) → Tauri build → sign (Apple Developer ID, Windows EV) → upload R2 → update manifest.

---

## 22. Component Library Plan (Atomic Design)

### 22.1 Prioritas MVP (M0–M3) vs Lanjutan

Tanda: **M0** = MVP wajib, **M3** = beta launch, **M6** = GA, **M9+** = post-GA.

#### Atoms (M0)
1. `Button` (variant: primary, secondary, ghost, destructive, link)
2. `IconButton`
3. `Input` (text, number, password)
4. `Textarea`
5. `Label`
6. `Checkbox`
7. `RadioGroup`
8. `Switch`
9. `Badge` (signal: bull, bear, neutral, warning)
10. `Tag`
11. `Avatar`
12. `Spinner`
13. `Skeleton` (variant: text, rect, chart, table-row)
14. `Divider`
15. `Kbd` (display keyboard shortcut)
16. `PriceTick` (animated price with directional color)
17. `ChangePct` (with arrow icon)
18. `MoneyDisplay` (IDR compact)
19. `TickerSymbol` (uppercase, monospace, hover tooltip company name)
20. `SignalDot` (status indicator)

#### Molecules (M0)
21. `FormField` (label + input + error message)
22. `Select` (Radix)
23. `Combobox` (typeahead, async)
24. `DatePicker` (with WIB awareness)
25. `RangeSlider`
26. `Tabs`
27. `Accordion`
28. `Tooltip`
29. `Popover`
30. `DropdownMenu`
31. `ContextMenu`
32. `Toast`
33. `Alert` (info/warn/error/success)
34. `Breadcrumb`
35. `SearchBox`
36. `EmptyState`
37. `PriceCell` (table cell with intraday spark)
38. `Sparkline` (mini line chart, 7-day)
39. `Heatmap cell` (sector cell)
40. `BrokerCell` (broker name + net value)

#### Organisms (M0–M3)
41. `CommandPalette` — **M0**
42. `Sidebar` / `Navigation` — **M0**
43. `TopBar` (search, user menu, theme, connection status) — **M0**
44. `WatchlistTable` (AG Grid based) — **M0**
45. `ChartContainer` (wrapper Lightweight Charts) — **M0**
46. `OrderBookPanel` (Level 1) — **M0** / Level 2 — **M9**
47. `BrokerSummaryTable` — **M3**
48. `ForeignFlowChart` — **M3**
49. `NewsFeedPanel` — **M0**
50. `AiChatPanel` (streaming + tool use UI) — **M0**
51. `PickCard` (chart preview + R/R + reasoning) — **M0**
52. `ResearchReportCard` — **M3**
53. `ScreenerBuilder` — **M3**
54. `BacktestBuilder` — **M6**
55. `PortfolioSummary` — **M3**
56. `AlertComposer` — **M3**
57. `WorkspaceGrid` (react-grid-layout) — **M3**
58. `MultiTimeframeDashboard` — **M3**
59. `FundamentalStatementTable` — **M3**
60. `RatioPanel` — **M3**
61. `DcfCalculator` — **M6**
62. `PeerComparePanel` — **M3**
63. `EarningsSurpriseChart` — **M6**
64. `DividendTimeline` — **M6**
65. `CorporateActionCalendar` — **M6**
66. `MacroDashboard` — **M6**
67. `FearGreedGauge` — **M6**
68. `SectorRotationHeatmap` — **M6**
69. `WyckoffPhaseTag` — **M3**
70. `BandarmologyMap` (graph viz) — **M6**
71. `HotkeyHelpOverlay` — **M0**
72. `PaywallSheet` — **M3**

#### Templates (M0–M3)
73. `TerminalLayout` (3-pane)
74. `MarketingLayout`
75. `AuthLayout`
76. `DocsLayout`
77. `ModalSheetLayout`
78. `WizardLayout` (onboarding)

Total ~78 komponen target M0–M6; lanjutan ~30 untuk M9+ (multi-asset, institutional, marketplace).

---

## 23. Tier-Aware UI Pattern

```tsx
<FeatureGate
  flag="research.aggregator"
  fallback={
    <PaywallSheet
      requiredTier="pro"
      headline="Research Aggregator butuh tier Pro"
      bullets={["15+ sekuritas", "Consensus rating", "AI synthesis"]}
      ctaTo="/billing/upgrade?to=pro&from=research"
    />
  }
>
  <ResearchAggregatorPage />
</FeatureGate>
```

Komponen `<PaywallSheet>` konsisten lintas feature: headline, bullets value prop, CTA upgrade dengan tracking `billing.upgrade.initiated` (property `cta_location`).

---

## 24. Risk & Mitigasi Frontend-Spesifik

| Risk | Mitigasi |
|---|---|
| Chart performance degrade saat 8+ instance terbuka | Hard cap 8 chart per workspace; idle chart pause WS subscription |
| WS connection storm saat reconnect | Single connection shared lewat SharedWorker (web); subscription dedup |
| Bundle bloat akibat indikator dinamis | Indicator lazy-load via dynamic import; tree-shake calculator |
| Mobile parity drift | Shared business logic di packages; e2e Detox mingguan |
| Real-time race condition (stale tick overwrite fresh) | Sequence number per message; reject older timestamps |
| AI streaming gagal di tengah | Resume token + retry; tampilkan partial dengan warning |
| Tauri auto-update gagal di Windows SmartScreen | EV cert + signed manifest, fallback manual download |
| i18n string missing | CI check: `pnpm i18n:check` — fail build kalau key referenced tapi tidak ada |

---

## 25. Deliverable Berikutnya (Pecahan Spec)

Setiap section dokumen ini akan dipecah menjadi spec terpisah:

| Spec | Section sumber |
|---|---|
| `SPEC_WORKSPACE_ENGINE.md` | §10 |
| `SPEC_CHART_ENGINE.md` | §7 |
| `SPEC_COMMAND_PALETTE.md` | §8 |
| `SPEC_HOTKEYS_BLOOMBERG.md` | §9 |
| `SPEC_REALTIME_CLIENT.md` | §6 |
| `SPEC_AI_COPILOT_UI.md` | §3 (feature ai-copilot) |
| `SPEC_DAILY_PICKS_UI.md` | §3 (feature daily-picks) |
| `SPEC_DESIGN_TOKENS.md` | §11 |
| `SPEC_I18N.md` | §12 |
| `SPEC_MOBILE_APP.md` | §15 |
| `SPEC_DESKTOP_APP.md` | §16 |
| `SPEC_TESTING_STRATEGY.md` | §17 |
| `SPEC_A11Y.md` | §18 |
| `SPEC_ANALYTICS_EVENTS.md` | §19 |
| `SPEC_FEATURE_FLAGS.md` | §20 |
| `SPEC_COMPONENT_LIBRARY.md` | §22 |

---

## Disclaimer

Dokumen ini adalah **baseline arsitektur Frontend**. Setiap section akan **dipecah menjadi spec terpisah** (lihat §25) saat fase eksekusi, lengkap dengan: kontrak API, props detail komponen, state machine diagram, test plan, dan acceptance criteria. Versi, vendor library, dan keputusan dapat berubah seiring riset implementasi — perubahan akan tercatat di `CHANGELOG.md` dengan ADR (Architecture Decision Record) bila signifikan.
