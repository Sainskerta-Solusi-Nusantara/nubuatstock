# Changelog

All notable changes to this project will be documented in this file.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning: [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- Pitchdeck Feature Guide PDF generator (admin → `/superadmin/pitchdeck`)
- Trial Pro 7-hari signup flow dengan cookie-based intent detection
- Multi-TF Elliott Wave (1D + 1W) dengan AI narrative
- Capital Flow heatmap per sektor IDX-IC
- Insider/Major shareholder tracker

### Changed
- AI Copilot performance: prompt caching, parallel tool calls, debounced rendering
- Landing copy refresh dengan bahasa Gen Z (santai, target anak muda)
- Logo emiten beralih dari Yahoo Finance → Google favicon + Brandfetch CDN

### Fixed
- Nubuat Verdict factor breakdown kosong ketika snapshot cache di-pakai
- Logo emiten hilang karena CSP block redirect ke t*.gstatic.com
- `No intl context found` runtime error di Header saat signup

### Security
- Prompt injection 3-tier detector untuk AI Copilot
- Rate limiting via token bucket (aiChat, signup, login, search)
- CSP strict mode dengan whitelist domain image

## [0.1.0] - 2026-03-01

### Added
- Project scaffold: Next.js 15, TypeScript, Tailwind v4, Drizzle ORM
- 980 emiten BEI universe dari KSEI
- Better-Auth dengan 3-tier RBAC (user/admin/superadmin)
- AI Copilot via DeepSeek dengan 7 tools
- Ticker detail page dengan Verdict 0-10, charts, pattern recognition
- Daily Picks rule-based engine dengan SR/SL/TP konkret
- Stock screener dengan 12 preset strategi
