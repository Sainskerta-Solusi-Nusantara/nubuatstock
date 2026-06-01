/**
 * Dokumentasi teknis lengkap & akurat — sesuai implementasi NYATA di codebase.
 * Dipakai di halaman Pitchdeck (superadmin-only) section "Arsitektur Lengkap".
 *
 * Tujuan: referensi internal/investor tentang stack, alur data, scraping, dan
 * sumber harga/news. Update di sini kalau stack berubah.
 */

export interface TechGroup {
  category: string;
  items: Array<{ name: string; detail: string }>;
}

/** Stack teknologi penuh per kategori. */
export const TECH_STACK: TechGroup[] = [
  {
    category: "Frontend",
    items: [
      { name: "Next.js 15.1 (App Router)", detail: "React Server Components + streaming SSR; route group (app)/(admin)/(auth)" },
      { name: "React 19", detail: "Server + client components, Suspense streaming" },
      { name: "TypeScript strict", detail: "Type dibagi FE↔BE (shareable), zero any policy" },
      { name: "Tailwind CSS v4 + shadcn/ui", detail: "Design tokens (bull #16a34a / bear #dc2626), dark-mode aware" },
      { name: "lucide-react", detail: "Icon set konsisten" },
      { name: "cmdk", detail: "Command palette (Cmd+K) ala Bloomberg" },
      { name: "Chart SVG self-host", detail: "RRG, Elliott Wave, heatmap, diagram Academy — SVG buatan sendiri (tanpa lib berat)" },
    ],
  },
  {
    category: "Backend / API",
    items: [
      { name: "Next.js API Routes + Server Actions", detail: "Fullstack 1 deploy — tidak ada service backend terpisah" },
      { name: "Better-Auth 1.x", detail: "Email+password (autoSignIn), Google OAuth, MFA TOTP, session di Postgres" },
      { name: "RBAC 3-tier", detail: "user / admin / superadmin — gate di layout + requireSuperadmin" },
      { name: "Zod", detail: "Validasi semua input API + body schema" },
      { name: "Quota & rate-limit", detail: "Redis counter per user (ai.queries_per_day, dll), QuotaExceededError 429" },
    ],
  },
  {
    category: "Database",
    items: [
      { name: "Neon Postgres (serverless)", detail: "Auto-scale, branching untuk preview; pooled + unpooled URL" },
      { name: "Drizzle ORM", detail: "Type-safe schema di db/schema/*; migrasi SQL idempotent di db/migrations" },
      { name: "pgvector", detail: "Embedding 1024-dim untuk RAG semantic search riset (research_embeddings)" },
      { name: "pgcrypto", detail: "gen_ulid() — primary key ULID time-sortable" },
      { name: "app_secrets terenkripsi", detail: "Kredensial (API key) AES-256-GCM, kunci dari APP_MASTER_KEY — tidak pernah di file/git" },
    ],
  },
  {
    category: "AI Layer",
    items: [
      { name: "DeepSeek (deepseek-chat)", detail: "Via OpenAI-compatible SDK; ~90% lebih murah dari GPT-4/Claude" },
      { name: "Embeddings", detail: "Voyage AI / OpenAI text-embedding (provider-agnostic), untuk RAG riset" },
      { name: "Tools (function calling)", detail: "9 read-only tools: get_quote, get_ohlcv, get_company_info, get_recent_news, compute_indicators, run_backtest, search_companies, search_research, get_daily_picks" },
      { name: "Keamanan AI", detail: "scanForInjection (pre-filter jailbreak), sandbox konten tool eksternal, SCOPE_GUARD system prompt, moderation log ke DB" },
      { name: "Prompt caching", detail: "Hit-rate tinggi → turunkan biaya token berulang" },
    ],
  },
  {
    category: "Background Jobs (Worker)",
    items: [
      { name: "BullMQ + Redis (Upstash)", detail: "Queue dengan retry + dead-letter; scheduling DB-driven" },
      { name: "ingest-eod", detail: "Tarik harga End-of-Day harian per emiten" },
      { name: "ingest-intraday", detail: "Update harga intraday saat jam bursa" },
      { name: "ingest-news", detail: "Tarik berita via RSS parser dari sumber finansial" },
      { name: "score-news-sentiment", detail: "Skor sentimen berita (bullish/bearish/neutral)" },
      { name: "generate-picks + evaluate-pick-outcomes", detail: "Buat Daily Picks + evaluasi akurasinya (track record)" },
      { name: "compute-technical/analysis-snapshots, detect-patterns, analyze-elliott", detail: "Pra-hitung indikator, pola chart, Elliott Wave per emiten" },
      { name: "check-alerts, expire-trial, renew-subscriptions, trial-drip, welcome-email", detail: "Otomasi notifikasi & lifecycle langganan" },
      { name: "generate-daily-digest, paper-leaderboard, account-deletion-sweep", detail: "Digest harian, ranking paper trade, sweep hapus akun (UU PDP)" },
    ],
  },
  {
    category: "Infra & Deploy",
    items: [
      { name: "Vercel", detail: "Hosting Next.js + Analytics; deploy dari git push (main)" },
      { name: "Vercel Blob", detail: "Self-host logo emiten (sharp resize → webp) di CDN" },
      { name: "Upstash Redis", detail: "Quota counter, rate-limit, BullMQ backing store" },
      { name: "Resend", detail: "Email transaksional (verifikasi, reset, trial drip, welcome)" },
      { name: "Web Push (VAPID)", detail: "Notifikasi push PWA via node:crypto (EC P-256, JWT ES256)" },
    ],
  },
];

/**
 * Alur data harga & news (scraping / ingestion) — bagaimana data masuk ke sistem.
 */
export interface DataPipeline {
  title: string;
  source: string;
  method: string;
  flow: string[];
  note: string;
}

export const DATA_PIPELINES: DataPipeline[] = [
  {
    title: "Harga Saham (EOD)",
    source: "Yahoo Finance (MVP, gratis) — adapter dengan failover",
    method: "HTTP fetch chart API per emiten, bukan scraping HTML",
    flow: [
      "Worker `ingest-eod` jalan harian setelah pasar tutup",
      "Adapter `yahoo-finance` tarik OHLCV per kode (BBCA.JK dst)",
      "Failover ke adapter lain (alpha-vantage / invezgo) kalau Yahoo gagal",
      "Simpan ke tabel `quotes_eod` (per emiten per tanggal)",
      "Snapshot teknikal & pola dihitung dari sini (job terpisah)",
    ],
    note: "Arsitektur adapter (factory + failover) — gampang ganti/​tambah vendor. Roadmap: IDX direct feed real-time saat volume justify.",
  },
  {
    title: "Harga Intraday",
    source: "Yahoo Finance (delayed) via adapter yang sama",
    method: "Polling berkala saat jam bursa (Senin–Jumat)",
    flow: [
      "Worker `ingest-intraday` polling saat market buka",
      "Update harga terkini untuk emiten aktif",
      "Dipakai untuk quote real-time-ish (delay sesuai tier: free 15 menit, berbayar real-time)",
    ],
    note: "Delay diatur per tier lewat entitlement `data.realtime_delay_seconds`.",
  },
  {
    title: "Berita Saham",
    source: "RSS feed sumber finansial Indonesia",
    method: "RSS parser (`lib/news/rss-parser`) — bukan scraping liar",
    flow: [
      "Worker `ingest-news` tarik item dari feed RSS",
      "De-dup + simpan ke tabel berita, link ke emiten terkait",
      "Worker `score-news-sentiment` skor bullish/bearish/neutral",
      "Sentimen masuk ke Nubuat Verdict (faktor sentimen) + News Feed",
    ],
    note: "Sumber eksternal di-sandbox di AI Layer (ditandai DATA, bukan instruksi) untuk cegah indirect prompt injection.",
  },
  {
    title: "Riset / Laporan (RAG)",
    source: "Laporan riset internal + filing IDX (roadmap)",
    method: "Chunking + embedding ke pgvector, semantic search",
    flow: [
      "Laporan dipublish → script `embed-research` chunk per paragraf",
      "Generate embedding (Voyage/OpenAI) → simpan `research_embeddings`",
      "AI Buddy tool `search_research` cari via cosine similarity",
    ],
    note: "Infra siap; embedding berjalan saat ada laporan terbit.",
  },
  {
    title: "Data Emiten & Fundamental",
    source: "Universe ~980 emiten IDX + data fundamental",
    method: "Seed awal + enrich berkala",
    flow: [
      "Seed companies (kode, nama, sektor, market cap)",
      "Logo di-self-host ke Vercel Blob (sharp → webp)",
      "Fundamental (laba, rasio) untuk Verdict & screener",
    ],
    note: "Logo & profil di-cache; tidak bergantung sumber eksternal saat runtime.",
  },
];
