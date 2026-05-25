export const RISKS = [
  { level: "HIGH", title: "OJK Lisensi Penasihat Investasi", mitigation: "Posisi sebagai 'analytics tool & edukasi' sambil tunggu izin. Daily Picks bisa di-rebrand jadi 'idea generator' kalau perlu. Legal counsel pre-launch wajib." },
  { level: "HIGH", title: "LLM cost membengkak", mitigation: "Prompt caching aktif (86% hit). Tier-based rate limit hard cap. Cost dashboard di superadmin." },
  { level: "MEDIUM", title: "Lisensi data IDX direct mahal", mitigation: "Start dengan Yahoo Finance free. Upgrade ke vendor reseller (Invezgo/OHLC.dev) di M6. IDX direct di M12 saat user > 50K." },
  { level: "MEDIUM", title: "Pump-dump abuse via Daily Picks", mitigation: "Rule-based engine (no manual override), audit log, anti-collusion detection ML (Q3 2026). Banned + report OJK kalau detect." },
  { level: "MEDIUM", title: "Stockbit/RTI competitive response", mitigation: "Speed of execution. Focus pada AI + research (yang sulit di-copy quick). Community moat (Discord + content)." },
  { level: "LOW", title: "Data quality issue (ticker error)", mitigation: "Multi-vendor cross-check (Yahoo + KSEI + IDX). Anomaly detection pre-publish. Public bug bounty kalau scale." },
  { level: "LOW", title: "Server downtime di jam bursa", mitigation: "Neon serverless multi-AZ, Vercel/Fly auto-scale, status page, on-call rotation di mature stage." },
];
