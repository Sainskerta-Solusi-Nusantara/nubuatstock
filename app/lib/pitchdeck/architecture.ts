export const ARCHITECTURE_LAYERS = [
  {
    layer: "Edge / CDN",
    components: ["Cloudflare WAF + DDoS protection", "Vercel/Fly Edge functions"],
    rationale: "Latency rendah ke retail user Indonesia + security baseline",
  },
  {
    layer: "Frontend",
    components: ["Next.js 15 (App Router, RSC)", "Tailwind v4 + shadcn/ui", "TradingView Lightweight Charts", "React 19 streaming SSR"],
    rationale: "Single TypeScript stack — shareable types FE↔BE, fast hire, modern DX",
  },
  {
    layer: "API & Auth",
    components: ["Next.js API Routes + Server Actions", "Better-Auth (Argon2id + MFA TOTP)", "3-tier RBAC (user/admin/superadmin)", "Zod validation"],
    rationale: "No separate backend service — Next.js fullstack mengurangi ops kompleksitas",
  },
  {
    layer: "AI Layer",
    components: ["DeepSeek (deepseek-chat) via OpenAI-compat SDK", "Voyage AI embeddings (1024-dim)", "pgvector RAG", "Prompt caching (~86% hit rate)"],
    rationale: "DeepSeek 90% lebih murah dari Claude/GPT-4; cache turunkan cost lagi 80%",
  },
  {
    layer: "Background Jobs",
    components: ["BullMQ (5 queue)", "Upstash Redis", "Cron scheduling DB-driven", "Event bus pub/sub"],
    rationale: "Decoupled scheduling, retry, dead-letter queue — production-grade",
  },
  {
    layer: "Database",
    components: ["Neon Postgres (serverless, auto-scale)", "pgvector + pgcrypto extensions", "Drizzle ORM type-safe", "ULID PK (time-sortable)"],
    rationale: "Serverless scaling, branching untuk preview env, biaya proporsional ke usage",
  },
  {
    layer: "Data Sources",
    components: ["Yahoo Finance (MVP, EoD)", "KSEI (registered securities)", "IDX e-Reporting (annual reports)", "Future: IDX direct feed (real-time)"],
    rationale: "Mulai dari gratis/murah, upgrade ke paid vendor saat volume justify",
  },
  {
    layer: "Observability",
    components: ["Sentry (error tracking)", "PostHog (product analytics)", "Pino structured logging", "Audit log immutable"],
    rationale: "Free tier untuk MVP, scale to paid saat traffic justify",
  },
];
