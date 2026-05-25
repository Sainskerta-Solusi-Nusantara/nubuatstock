# Security Policy

## Reporting a Vulnerability

Jika kamu menemukan vulnerability di Nubuat, **jangan** report via public issue.
Kirim email ke `security@nubuat.id` dengan detail:

- Jenis vulnerability (XSS, SQL injection, auth bypass, dll)
- Steps to reproduce
- Impact assessment
- Saran fix (kalau ada)

Kami akan respon dalam **48 jam kerja** dan koordinasi disclosure timeline.

## Scope

Yang dianggap critical:

- Bypass auth/MFA
- SQL injection
- Privilege escalation (user → admin/superadmin)
- Akses subscription Pro tanpa pembayaran
- Bocor PII (KTP, NIK, email, password)
- Manipulasi data trading (Daily Picks, Verdict score)

## Out of Scope

- Rate limiting di public endpoints (sudah ada token bucket)
- Self-XSS yang butuh user paste payload
- Missing security headers di asset CDN (third-party)

## Bounty

Saat ini tidak ada bug bounty formal, tapi kami appreciate kontribusi dengan
credit di Hall of Fame + swag Nubuat.
