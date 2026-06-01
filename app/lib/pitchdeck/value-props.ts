export const UNIQUE_VALUE_PROPS = [
  {
    title: "Multi-Lens Convergence Scoring",
    desc: "Satu skor 0–100 per ticker yang menggabungkan Technical + Fundamental + Bandarmology + Brokermology + Macro dengan factor breakdown transparan. Bukan black-box AI seperti kompetitor.",
    moat: "Pattern proprietary kami, susah di-copy karena butuh integrasi multi-source + tuning bobot per regime pasar",
  },
  {
    title: "Daily Picks dengan SR/SL/TP Konkret",
    desc: "Bukan 'BBRI bagus' tanpa konteks. Tapi: 'entry zone 4.700–4.760, SL 4.620, TP1 4.880 (R/R 1.7), setup pullback, time horizon 3–5 hari'. Backtested.",
    moat: "Track record realtime visible di /picks/performance — trust dari hit rate transparant",
  },
  {
    title: "AI Buddy Bilingual (ID/EN)",
    desc: "Tanya bahasa Indonesia, jawab dengan source citation + tool calls real. Cost 90% lebih rendah dari GPT-4.",
    moat: "Indonesia-tuned context (Bandarmology, terminologi BEI) + prompt caching custom",
  },
  {
    title: "Bloomberg-Style Terminal di Browser",
    desc: "Command palette Cmd+K, function code (BBRI <GO>, EQS, BMAP), multi-pane workspace. Power-user productivity, retail price.",
    moat: "Kompetitor lokal fokus mobile-first, mengabaikan power user. Kita fill the gap.",
  },
  {
    title: "Research Hub + Vector Semantic Search",
    desc: "Riset internal + RAG search across 1000+ laporan. AI bisa ringkas konsensus 5 sekuritas dalam 1 query.",
    moat: "Vector embeddings + LLM compose — barrier mendekati moat data company",
  },
];

export const KEY_FEATURES = [
  { category: "Data Coverage", items: ["980+ emiten BEI", "12 sektor IDX-IC", "18 indeks", "5,041 direksi profile", "Logo + fundamental 90%+ coverage"] },
  { category: "Analisis Real-time", items: ["Multi-lens scoring", "Daily Picks dengan SR/SL/TP", "Track record T+1/T+5/T+20", "Backtest engine 4 strategi", "Vector RAG semantic search"] },
  { category: "AI Capabilities", items: ["AI chat (LLM)", "7 tools tersedia", "Prompt caching 86% hit", "Tier-based quota", "Audit & cost tracking"] },
  { category: "Workflow", items: ["Watchlist unlimited", "Alerts multi-channel", "Command palette Cmd+K", "Riset PDF download", "Paper trading (Q2 2026)"] },
  { category: "Compliance", items: ["Disclaimer accept gate", "UU PDP Indonesia template", "Audit log immutable", "OJK Penasihat Investasi (in process)", "AES-256-GCM secret encryption"] },
];
