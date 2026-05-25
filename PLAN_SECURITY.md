# PLAN_SECURITY.md — Nubuat Security & Compliance Blueprint

> **Proyek:** Nubuat — Bloomberg-grade analytics untuk retail trader Indonesia
> **Dokumen induk:** `ANALISIS_APLIKASI_SAHAM.md`
> **Tanggal:** 11 Mei 2026
> **Owner:** dobeon.com@gmail.com
> **Versi:** v0.1 — Security & Compliance Baseline
> **Klasifikasi:** Internal / Confidential

---

## 0. Ringkasan Eksekutif

Nubuat adalah aplikasi subscription B2C yang memproses:
- **PII tier-tinggi:** NIK (opsional untuk verifikasi KYC investor), nomor HP, alamat, email, biometric (TOTP/WebAuthn), payment metadata.
- **Data finansial sensitif:** portfolio user, watchlist, alert, perilaku trading-related action.
- **Konten teregulasi:** Daily Picks, analisis, rekomendasi yang berpotensi tunduk pada rezim Penasihat Investasi OJK.
- **Tunduk pada UU 27/2022 (PDP), POJK 32/2025 (Fintech Payment), Bapepam V.C.1, SEOJK 7/2017, dan PSE Lingkup Privat Kemkomdigi.**

**Postur target:**
- M0–M3: **Foundation security** — TLS 1.3, password Argon2id, MFA opsional, secret manager, dependency scan, basic logging, WAF Cloudflare basic.
- M3–M6: **Hardening** — MFA wajib Pro+, pen-test #1, DPIA, Cookie consent, breach notification runbook, vulnerability management SLA.
- M6–M12: **Compliance readiness** — SOC 2 Type I, PSE Kemkomdigi terdaftar, OJK Penasihat Investasi filing, bug bounty private, ISO 27001 control mapping.
- M12–M24: **Audit & scale** — SOC 2 Type II, ISO 27001 cert (opsional), bug bounty publik, red team annual.

**Estimasi biaya kontrol mahal (kumulatif M0–M24):**
- SOC 2 Type II audit: USD 30–80k (auditor + readiness consultant + tooling Vanta/Drata ≈ USD 15–25k/tahun)
- Penetration test eksternal: USD 10–25k per engagement (target 1–2x/tahun)
- Bug bounty program (private→public, HackerOne/Bugcrowd): USD 5–20k/tahun (excl. payout pool USD 10–50k)
- Cyber insurance: USD 8–20k/tahun (coverage USD 1–5M)
- DPO (in-house atau retained advisor): USD 24–60k/tahun
- Legal counsel pasar modal & PDP: USD 15–40k/tahun
- HashiCorp Vault Enterprise atau AWS Secrets Manager: ≈ USD 200–500/bulan di skala awal

---

## 1. Threat Model (STRIDE)

### 1.1 Metodologi
STRIDE per komponen ditambah scoring **Likelihood (L)** dan **Impact (I)** pada skala 1–5. Risk Score = L × I, prioritas mitigasi sesuai matrix di Section 1.10.

Komponen yang dianalisis (mengikuti diagram Section 8.1 dokumen induk):
- C1. Web/Mobile/Desktop Client
- C2. API Gateway (Kong/Cloudflare/NGINX)
- C3. Core API (Go)
- C4. Realtime Hub (NATS/Redis Streams)
- C5. AI Copilot (Python + Anthropic SDK)
- C6. Analytics Engine (Daily Picks, Backtest)
- C7. Market Data Ingestor (Rust/Go)
- C8. Research Aggregator (Scraper)
- C9. Billing Service (webhook Midtrans/Xendit)
- C10. PostgreSQL (OLTP)
- C11. QuestDB / ClickHouse (Time-series)
- C12. Vector DB (pgvector/Qdrant)
- C13. Object Storage (S3/R2)
- C14. Redis (Cache & Session)
- C15. CI/CD pipeline & infra (Terraform/Helm/ArgoCD)

### 1.2 C1. Web/Mobile/Desktop Client

| Asset | Threat | STRIDE | L | I | Score | Mitigation |
|---|---|---|---|---|---|---|
| Session token (JWT) | Pencurian via XSS, malware | T, I, E | 3 | 5 | 15 | HttpOnly cookie untuk refresh, short-lived access token (15 menit), CSP strict, no third-party script kecuali whitelist |
| Local storage | Tamper, exfiltrasi via XSS | T, I | 3 | 4 | 12 | Tidak menyimpan token sensitif di `localStorage`; gunakan `sessionStorage` + memory cache; encrypted Keychain/Keystore di mobile |
| Mobile binary | Reverse engineering, repackaging | T, I, E | 3 | 4 | 12 | Code obfuscation (R8/ProGuard), tamper detection, Play Integrity / App Attest, jailbreak/root detection |
| Desktop app (Tauri) | Supply chain (auto-update poisoning) | T, E | 2 | 5 | 10 | Update signing (Ed25519), pinned update endpoint, signature verify mandatory |
| User input form | XSS, CSRF | T, I | 3 | 4 | 12 | React auto-escape + Trusted Types CSP, SameSite=Lax/Strict cookie, anti-CSRF token untuk state-changing endpoint non-JWT |
| Push notification token | Spoof, hijack | S, T | 2 | 3 | 6 | Token rotation, server-side validation, FCM/APNs verified payload |

### 1.3 C2. API Gateway

| Asset | Threat | STRIDE | L | I | Score | Mitigation |
|---|---|---|---|---|---|---|
| Public endpoint | DDoS L7 | D | 4 | 5 | 20 | Cloudflare WAF + rate limit + bot challenge + Cloudflare Magic Transit (L3/L4); AWS Shield Standard di origin |
| Auth endpoint | Credential stuffing | S | 4 | 5 | 20 | Login throttle, HIBP check, CAPTCHA adaptive (Cloudflare Turnstile), device fingerprint |
| Gateway config | Misconfiguration (open route) | E, I | 3 | 5 | 15 | IaC Terraform, peer review, policy-as-code (Conftest/OPA), CI security gate |
| Mutual TLS antara gateway dan service | Spoofing internal service | S, T | 2 | 5 | 10 | mTLS via service mesh (Istio/Linkerd) atau SPIFFE/SPIRE |

### 1.4 C3. Core API

| Asset | Threat | STRIDE | L | I | Score | Mitigation |
|---|---|---|---|---|---|---|
| User CRUD endpoint | BOLA / IDOR (akses watchlist user lain) | E, I | 4 | 5 | 20 | Authorization check per object, ABAC via OPA, integration test wajib untuk setiap endpoint object-level |
| Subscription endpoint | Privilege escalation (tier upgrade bypass) | T, E | 3 | 5 | 15 | Tier check server-side only, billing webhook signed verify, audit log setiap perubahan tier |
| Admin panel | Account takeover admin | S, E | 2 | 5 | 10 | SSO + WebAuthn wajib admin, JIT access, audit semua admin action, separation of duties |
| Audit log endpoint | Tamper untuk hapus jejak | R, T | 2 | 4 | 8 | Append-only log, S3 Object Lock (compliance mode), hash chain (Merkle) |

### 1.5 C4. Realtime Hub

| Asset | Threat | STRIDE | L | I | Score | Mitigation |
|---|---|---|---|---|---|---|
| WebSocket connection | Connection exhaustion (DoS) | D | 4 | 4 | 16 | Per-IP & per-user connection limit, idle timeout, sticky session via consistent hash |
| Subscribe channel | Authorization bypass (subscribe channel tier lain) | E, I | 3 | 5 | 15 | Channel ACL berbasis JWT claim, reject subscribe yang lebih tinggi dari tier |
| Tick fanout | Eavesdropping (intercept tick) | I | 2 | 3 | 6 | WSS TLS only, no plaintext fallback, JWT signature wajib di handshake |

### 1.6 C5. AI Copilot

| Asset | Threat | STRIDE | L | I | Score | Mitigation |
|---|---|---|---|---|---|---|
| System prompt | Prompt injection → leak | I, T | 4 | 4 | 16 | Instruction hierarchy, input sanitization, output filter (regex untuk system marker), do-not-echo policy |
| User query history | Exfiltrasi via prompt injection | I | 3 | 4 | 12 | Per-session isolation, no cross-user context bleed, RAG isolation per tenant |
| Tool use (call internal API) | SSRF via tool argument | T, I, E | 3 | 5 | 15 | Tool schema strict (Pydantic), allowlist URL/path, no user-controlled URL pass-through |
| LLM cost | Cost-bomb attack (long prompt loop) | D | 4 | 4 | 16 | Hard token budget per query, per-user daily quota, global circuit breaker, Anthropic budget alert |
| Output | Hallucinated "personalized advice" → liability OJK | R | 4 | 5 | 20 | Output classifier (forbidden phrase detection), mandatory disclaimer append, structured output (Pydantic) |
| PII in context | PII leak ke vendor LLM | I | 3 | 5 | 15 | PII redaction pre-send (regex + NER), opt-in flag untuk training data, Anthropic zero-retention agreement |

### 1.7 C6. Analytics Engine

| Asset | Threat | STRIDE | L | I | Score | Mitigation |
|---|---|---|---|---|---|---|
| Daily Picks job | Manipulation (tamper ranking) | T | 2 | 5 | 10 | Job worker isolated, signed artifact, reproducible build, audit hash dari output file |
| Backtest input | Resource exhaustion (huge date range) | D | 3 | 3 | 9 | Input bound check, job queue dengan resource quota, per-tier job concurrency |
| Strategy code (v2 marketplace) | Arbitrary code execution | E, T | 4 | 5 | 20 | Sandbox eksekusi (gVisor / Firecracker / WebAssembly), no network, CPU/RAM limit, syscall filter |

### 1.8 C7. Market Data Ingestor

| Asset | Threat | STRIDE | L | I | Score | Mitigation |
|---|---|---|---|---|---|---|
| Vendor API credential | Theft → biaya bengkak | S, I | 3 | 4 | 12 | Vault dynamic secret, rotate quarterly, monitor billing anomali |
| Parsed market data | Injection (malformed FIX/binary) | T | 2 | 4 | 8 | Strict parser (Rust safe parser), schema validation, reject malformed |
| Ingestor host | Compromise → data integrity broken | T, E | 2 | 5 | 10 | Hardened container, distroless, read-only FS, network egress allowlist hanya vendor |

### 1.9 C8. Research Aggregator (Scraper)

| Asset | Threat | STRIDE | L | I | Score | Mitigation |
|---|---|---|---|---|---|---|
| Scraper outbound request | SSRF (URL via webhook/admin) | I, E | 4 | 5 | 20 | URL allowlist, deny RFC1918/link-local, DNS resolution server-side dengan filter, Playwright network policy |
| PDF parser | Malicious PDF (RCE via lib bug) | E, T | 3 | 5 | 15 | Parser di sandbox container, lib pinned + Trivy scan, CVE monitoring `pdfplumber`/`pdfminer.six` |
| Crawler identity | Block by source / abuse claim | R | 3 | 3 | 9 | Respect robots.txt, polite rate limit, identifiable User-Agent dengan kontak, legal review |
| Content cache | Copyright infringement | R | 3 | 5 | 15 | Fair use boundary, store metadata + link, no full text reproduction kecuali license |

### 1.10 C9. Billing Service (Payment Webhook)

| Asset | Threat | STRIDE | L | I | Score | Mitigation |
|---|---|---|---|---|---|---|
| Webhook endpoint | Forged callback (fake payment success) | S, T | 4 | 5 | 20 | HMAC signature verify (Midtrans `signature_key` SHA-512, Xendit X-CALLBACK-TOKEN), timestamp window, IP allowlist gateway |
| Webhook replay | Replay attack (duplicate credit) | T, R | 3 | 4 | 12 | Idempotency key per `order_id`, dedup table, status state machine |
| Refund/chargeback flow | Fraudulent chargeback (friendly fraud) | R | 3 | 4 | 12 | 3DS2 enforcement, dispute evidence pipeline, repeat-chargeback ban |
| PCI scope | Accidental PAN storage | I | 1 | 5 | 5 | SAQ-A: tokenize-only via Midtrans/Xendit iframe/redirect, regex scan code & log untuk PAN pattern |

### 1.11 C10–C14. Data Stores

| Asset | Threat | STRIDE | L | I | Score | Mitigation |
|---|---|---|---|---|---|---|
| PostgreSQL connection | SQL injection | T, I | 3 | 5 | 15 | Parameterized query mandatory, ORM (sqlc/GORM/SQLAlchemy), no string concat, lint rule |
| PostgreSQL admin | DBA compromise | S, E | 2 | 5 | 10 | No direct prod access; query via approved tool dengan audit; break-glass dengan JIT + 2-person approval |
| Backup | Theft / unauthorized restore | I, T | 2 | 5 | 10 | Encrypted backup (KMS), separate account, immutable object lock 30 hari, restore test bulanan |
| Redis | Cache poisoning, unauth access | T, I, E | 3 | 4 | 12 | AUTH + ACL, TLS, no public exposure, key namespace per service |
| Object storage | Public bucket leak | I | 3 | 5 | 15 | Block public access account-level, signed URL (TTL 15 menit), bucket policy review otomatis (Cloudsplaining/CloudCustodian) |
| Vector DB | PII embedded leak | I | 3 | 4 | 12 | Redact PII pre-embed, namespace per tenant, query auth check |

### 1.12 C15. CI/CD & Infra

| Asset | Threat | STRIDE | L | I | Score | Mitigation |
|---|---|---|---|---|---|---|
| Source code repo | Secret commit (leak) | I | 4 | 4 | 16 | Gitleaks pre-commit + GitHub secret scanning + TruffleHog CI, rotation playbook |
| CI pipeline token | Compromise → supply chain | E, T | 2 | 5 | 10 | GitHub OIDC ke AWS (no static cred), scoped permission, workflow review |
| Container image | Backdoored base image | T, E | 2 | 5 | 10 | Distroless / Chainguard, image sign cosign, admission controller (Kyverno/Cosigned), SBOM |
| Terraform state | Tamper / leak (contains secret hash) | I, T | 2 | 5 | 10 | Remote state S3 + KMS + DynamoDB lock, no secret in state (use Vault), state access audited |
| Kubernetes cluster | Container escape | E | 2 | 5 | 10 | Pod Security Admission `restricted`, no privileged, runAsNonRoot, drop ALL capabilities, gVisor untuk untrusted workload |

### 1.13 Risk Matrix Summary

| Risk Score | Tier | SLA Mitigation | Examples (di atas) |
|---|---|---|---|
| 20–25 | **Critical** | Mitigasi sebelum production exposure | DDoS L7, BOLA, fake webhook, SSRF scraper, prompt-driven liability, strategy code RCE |
| 12–19 | **High** | M0–M3 | XSS, mobile reverse, prompt injection leak, cost-bomb, copyright |
| 6–11 | **Medium** | M3–M6 | Backup misuse, log tamper, vendor cred theft |
| 1–5 | **Low** | Tracked, M6+ | Accidental PAN |

---

## 2. Identity & Access Management (IAM)

### 2.1 User Authentication

**Password policy (NIST 800-63B aligned):**
- Panjang minimum **12 karakter**, maksimum 128. Tidak ada batas karakter konyol (boleh space, emoji, semua Unicode).
- Tidak ada wajib mix-case/symbol; gantinya **breached password check** ke HaveIBeenPwned k-anonymity API (`/range/{first5hash}`) — tolak jika count ≥ 1.
- Pengecekan password sama dengan email/nama/ticker yang sering pump (block list `BBRI`, `nubuat`, dll. dengan minor variation).
- **Tidak ada periodic rotation paksa** — hanya rotation jika ada indikasi breach.

**Hashing — Argon2id (OWASP Password Storage 2024):**
```
Argon2id parameters (server CPU baseline 4 vCPU / 4 GB):
  memory:      64 MiB  (m=65536)
  iterations:  3       (t=3)
  parallelism: 4       (p=4)
  salt:        128-bit random per user (CSPRNG)
  hash length: 32 bytes
  pepper:      32-byte HMAC-SHA-256 dari secret di Vault (rotated quarterly)
Stored:        $argon2id$v=19$m=65536,t=3,p=4$<salt>$<hash>
```
Re-hash on login jika params upgrade. Migration plan: simpan `algo_version` di kolom user.

**Login throttling & lockout:**
- Per-IP: 10 attempts / 5 menit → exponential backoff sampai 1 jam.
- Per-account: 5 attempts berturut → 15 menit lock, notif email.
- Setelah 3x lock dalam 24 jam → tuntut MFA verify atau email magic link untuk unlock.
- Implementasi: Redis sliding window counter; pakai library [`go-redis-rate`](https://github.com/go-redis/redis_rate) atau setara.
- **Tidak ada "Captcha after N" untuk free tier saja** — semua tier kena throttle yang sama (mencegah bypass via downgrade).

**Account lockout policy:**
- Lockout otomatis kalau ada **impossible travel** (geo-IP > 1000 km < 1 jam) → force re-auth + MFA.
- Lockout kalau **password hash** invalid versus pepper baru → force reset.
- **Tidak boleh** lockout permanen via attempt — selalu ada path recovery (email + MFA backup code).

**Account recovery:**
- Email magic link (single-use, TTL 15 menit, signed JWT).
- WAJIB MFA backup code untuk Pro+ recovery.
- Untuk Elite/Institutional: support concierge verify identitas via video call + dokumen (proses manual).

### 2.2 Multi-Factor Authentication (MFA)

| Tier | MFA Policy |
|---|---|
| Free | Opsional (sangat dianjurkan via UI nudge) |
| Starter | Opsional, default on saat signup |
| **Pro** | **Wajib** (enforced 14 hari setelah subscribe; reminder banner) |
| Elite / Institutional | **Wajib** + WebAuthn dianjurkan |
| Admin / Internal | **Wajib WebAuthn + Yubikey** (TOTP saja tidak cukup) |

**Faktor yang didukung:**
- **TOTP** (RFC 6238) — algoritma SHA-1 (kompatibilitas Google Authenticator), 6 digit, 30 detik. Secret 160-bit, disimpan terenkripsi field-level (KMS DEK).
- **WebAuthn / FIDO2** — Passkey (platform & roaming). Default attestation `none` untuk privacy, accept `direct` untuk admin role.
- **Backup code** — 10 single-use code, hashed Argon2id, regenerate flow tersedia.
- **SMS / WA OTP** — **tidak direkomendasikan** sebagai faktor utama (SIM swap risk); hanya untuk fallback recovery, kalau dipakai harus paired dengan device check.

**Enrollment flow:** wajib re-auth password segera sebelum enroll, simpan timestamp enrolled, audit log event `mfa.enabled/disabled/replaced`.

### 2.3 OAuth Providers (Sign in with Google / Apple)

- **PKCE wajib** (RFC 7636) — code_verifier 43–128 char base64url, S256.
- **state** — anti-CSRF random 32 byte, tied ke session.
- **nonce** — anti-replay, divalidasi terhadap claim ID token.
- **JWKS rotation cache** — refresh per 24 jam, accept-old-key window 7 hari.
- **Hosted domain check** untuk Google Workspace (kalau dipakai untuk staff SSO via Google).
- **Email match policy:** kalau email dari OAuth sudah ada di user dengan password — **tidak auto-link**, minta password verify dulu (mencegah account takeover via OAuth typo-squat).
- **Apple "Hide My Email":** terima `@privaterelay.appleid.com` — labeling khusus untuk channel komunikasi.

### 2.4 JWT Design

**Access token (RS256, 15 menit):**
```json
{
  "iss": "https://api.nubuat.id",
  "sub": "usr_01HXYZ...",          // ULID, bukan email
  "aud": ["nubuat-api"],
  "exp": 1747130000,
  "iat": 1747129100,
  "jti": "tok_01HXYZ...",
  "tier": "pro",
  "scope": ["read:quote", "read:picks", "write:watchlist"],
  "device_id": "dev_01HXYZ...",
  "session_id": "ses_01HXYZ...",
  "mfa": true,
  "amr": ["pwd", "totp"]
}
```
- **RS256** dengan key dari KMS — public key di-publish via `/.well-known/jwks.json`.
- Tier diembed untuk mengurangi DB hit; revalidate tiap 15 menit via refresh.
- `scope` dipakai oleh API gateway untuk coarse-grained allow; fine-grained ABAC di service.

**Refresh token (opaque, 30 hari, family-based revocation):**
- 256-bit random, disimpan hashed (SHA-256) di Postgres.
- Disimpan di **HttpOnly + Secure + SameSite=Strict cookie** untuk web; di Keychain/Keystore untuk mobile.
- Skema **family** (Auth0 pattern): setiap refresh menerbitkan token baru + invalidate yang lama. Kalau token lama dipakai lagi → seluruh family revoke (deteksi token theft).
- Tabel:
  ```
  refresh_tokens(id, user_id, family_id, hash, device_id, ip_created,
                 user_agent, created_at, last_used_at, revoked_at, revoke_reason)
  ```

**Token revocation:**
- Logout endpoint → revoke refresh family.
- Password change → revoke seluruh refresh user.
- Tier downgrade / billing fail → revoke + force re-auth.
- Admin force-logout per user / device.

### 2.5 Session Management

- **Device fingerprint:** hash dari `User-Agent + Accept-Language + tz + WebGL renderer hash + canvas hash` (untuk web); device ID native (iOS IDFV, Android ANDROID_ID hashed) untuk mobile.
- **Concurrent session limit per tier:**

| Tier | Max concurrent device | Force-logout policy |
|---|---|---|
| Free | 2 | LRU evict |
| Starter | 3 | LRU evict |
| Pro | 5 | User pilih (UI) |
| Elite | 10 | User pilih |
| Admin | 2 | Hard limit |

- **Session list UI:** user melihat device aktif, geolocation, last-used, "log out this device" / "log out all".
- **Anomaly trigger:** new device + new geo + new ASN → email notif + force MFA.

### 2.6 Internal IAM (Developer / Staff)

**Identity provider:** Google Workspace SSO (atau Okta saat skala) → SAML/OIDC ke semua tool internal (AWS, GitHub, Datadog, Grafana, etc).

**Hardware key wajib:** Yubikey 5 series untuk semua engineer; backup key di safe office.

**JIT (Just-in-Time) production access:**
- Tidak ada permanent prod access kecuali on-call engineer.
- Request via tool (AWS IAM Identity Center temporary permission set, atau ConductorOne / sym.dev) → approval peer engineer → token TTL 1–4 jam.
- Semua command via SSM Session Manager (audited, recorded) — tidak ada SSH key statis.
- Break-glass: 2 sealed amplop kombinasi root account password di safe; setiap pakai → otomatis incident.

**Service-to-service auth:**
- **mTLS via service mesh** (Linkerd default untuk simplicity; Istio kalau perlu fitur lebih).
- **SPIFFE/SPIRE** untuk workload identity di K8s — SVID rotate per 1 jam.
- Backup: signed JWT pakai cluster CA kalau mesh down.

**Secret rotation:**

| Secret | Rotation cadence | Method |
|---|---|---|
| DB credential | 24 jam (dynamic) | Vault database secrets engine |
| Service-to-service mTLS | 1 jam | SPIRE auto |
| Vendor API key (Anthropic, Midtrans, dll) | 90 hari | Manual + Vault, alert kalau lewat |
| KMS data key (envelope) | Tahunan | Rotate CMK, re-wrap |
| JWT signing key | 90 hari | Dual-key window (jwks rotation) |
| OAuth client secret | 180 hari | Manual |
| Pepper (Argon2) | Tahunan, dengan grace re-hash | Dual-pepper window |

### 2.7 RBAC / ABAC

**Role taxonomy:**

| Role | Scope | Notes |
|---|---|---|
| `user` | Self data only | Default semua user |
| `user.pro`, `user.elite` | + premium endpoint | Driven by `tier` claim |
| `support.l1` | Read user metadata (no PII unmask), trigger refund flow | Tidak boleh lihat NIK plain |
| `support.l2` | + unmask PII dengan reason + audit | Wajib jastifikasi tertulis |
| `analyst` | Read aggregated analytics, no individual PII | |
| `engineer.dev` | Read non-prod | Default semua engineer |
| `engineer.prod-onreq` | JIT prod | Dengan approval |
| `admin` | Manage users, billing | Wajib WebAuthn |
| `super-admin` | Manage admin, IAM policy | 2-person rule untuk perubahan policy |
| `compliance.dpo` | Audit log + PDP request flow | Read-only ke audit, write hanya ke request log |
| `auditor.external` | Read-only scope sesuai audit (SOC 2/ISO) | Time-limited |

**Policy engine:** **Open Policy Agent (OPA)** sebagai sidecar / library (Rego) atau **Casbin** untuk lightweight model. Default-deny.

**Contoh policy (Rego, ABAC):**
```rego
package nubuat.authz

default allow = false

allow {
  input.action == "read:watchlist"
  input.resource.owner_id == input.user.id
}

allow {
  input.action == "read:watchlist"
  input.user.roles[_] == "support.l2"
  input.context.justification != ""
  input.context.ticket_id != ""
}

allow {
  input.action == "read:dailypicks.intraday"
  input.user.tier in {"pro", "elite"}
}
```

**Enforcement points:**
- Edge: API gateway untuk coarse rule (tier, scope).
- Service: middleware OPA SDK call untuk fine-grained (per-object, per-context).
- DB: row-level security PostgreSQL untuk defense-in-depth (set `app.user_id` session var).

---

## 3. Application Security

### 3.1 OWASP Top 10 (2021) — Mitigation Mapping

| ID | Risk | Kontrol di Nubuat |
|---|---|---|
| A01 Broken Access Control | BOLA/IDOR, missing authz | OPA per request, object-owner check, integration test wajib, PostgreSQL RLS |
| A02 Cryptographic Failures | Weak hash, plaintext PII | Argon2id, TLS 1.3 only, KMS envelope, field-level enc untuk PII (NIK, alamat, HP) |
| A03 Injection | SQLi, NoSQLi, command, log | Parameterized query (sqlc/SQLAlchemy/GORM safe mode), input schema (Zod/Pydantic), no `exec`/`eval`/shell interpolation |
| A04 Insecure Design | Threat-model gap | STRIDE doc (this), threat-model review per epic, attack-tree untuk fitur sensitif |
| A05 Security Misconfig | Default cred, debug on prod | Conftest/OPA policy, container baseline (CIS), checkov Terraform scan, security headers checklist |
| A06 Vulnerable Components | Outdated lib | Dependabot, Snyk/Trivy, SBOM CycloneDX, patch SLA (Section 11) |
| A07 Identification & Auth | Weak login | Argon2id, MFA, OAuth PKCE, JWT family rotation (Section 2) |
| A08 Software & Data Integrity | Unsigned update, deserialization | Cosign image sign, Tauri update signing, JSON-only deserialization (no pickle/yaml unsafe) |
| A09 Logging & Monitoring Failures | No audit | Audit log scope (Section 14), SIEM, alert rules |
| A10 SSRF | Scraper outbound | URL allowlist, deny RFC1918, DNS pin, network egress policy (Section 4) |

### 3.2 OWASP API Security Top 10 (2023)

| ID | Risk | Kontrol |
|---|---|---|
| API1 BOLA | Authz check per object, OPA, test |
| API2 Broken Authentication | JWT design (Section 2.4), refresh family, MFA |
| API3 Broken Object Property Level Authz | DTO whitelist field response (no `SELECT *` → response), `omitempty` review |
| API4 Unrestricted Resource Consumption | Rate limit per tier (Section 9.3 dokumen induk), max request size 1MB default, query complexity limit (untuk endpoint screener), pagination wajib |
| API5 Broken Function Level Authz | Scope JWT + OPA enforcement, admin route di subdomain terpisah (`admin.nubuat.id`) |
| API6 Unrestricted Access to Sensitive Business Flow | Anti-abuse rule (Section 13): signup velocity, trial fraud, scrape detection |
| API7 SSRF | Section 4 egress allowlist |
| API8 Security Misconfiguration | Section 3.1 A05 |
| API9 Improper Inventory Management | OpenAPI spec authoritative, no shadow endpoint, scan dengan Kong route audit |
| API10 Unsafe Consumption of APIs (Third-party) | Vendor risk (Section 15), strict schema parsing, timeout, circuit breaker |

### 3.3 Input Validation

- **Schema validation wajib di edge service:**
  - TS: **Zod** untuk body/query/header.
  - Python: **Pydantic v2** untuk FastAPI.
  - Go: **`go-playground/validator`** + custom struct tag.
- Reject unknown field (Pydantic `extra="forbid"`, Zod `.strict()`).
- Bound check: string max length, integer range, array max length (default 100, configurable).
- Date input: ISO 8601 strict, normalize TZ.
- Ticker input: regex `^[A-Z]{4}$` (BEI ticker pattern), reject lainnya.
- File upload: MIME sniff (`mimetype` lib), magic byte check, max 10 MB default, antivirus scan (ClamAV sidecar atau AWS GuardDuty Malware Protection).

### 3.4 Output Encoding & Headers

- **HTML escaping** otomatis via React (no `dangerouslySetInnerHTML` kecuali sanitized via `DOMPurify`).
- **JSON response** dengan `Content-Type: application/json; charset=utf-8`.
- **Security headers (set di gateway):**
  ```
  Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
  Content-Security-Policy: default-src 'self';
    script-src 'self' 'wasm-unsafe-eval' https://challenges.cloudflare.com;
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: https://cdn.nubuat.id;
    connect-src 'self' https://api.nubuat.id wss://ws.nubuat.id https://*.ingest.sentry.io;
    frame-ancestors 'none';
    base-uri 'self';
    form-action 'self';
    object-src 'none';
    require-trusted-types-for 'script';
    upgrade-insecure-requests;
    report-uri https://csp.nubuat.id/report
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), microphone=(), camera=(), interest-cohort=()
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: require-corp
  Cross-Origin-Resource-Policy: same-origin
  Cache-Control: no-store (auth endpoint)
  ```
- **CSP roadmap:** mulai dengan `Content-Security-Policy-Report-Only` di M0, switch ke enforce M3 setelah report bersih.
- **SRI** untuk semua script CDN: `<script src="..." integrity="sha384-..." crossorigin="anonymous">`.

### 3.5 SSRF Protection (Critical untuk Research Aggregator)

Layered defense:
1. **Application-level URL parsing:** parse pakai Python `urllib.parse` → reject non-`http`/`https`, no userinfo, no fragment trick.
2. **DNS resolution server-side:** resolve hostname, reject jika hasil IP di:
   - RFC1918 (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`)
   - Loopback (`127.0.0.0/8`, `::1`)
   - Link-local (`169.254.0.0/16`, `fe80::/10`)
   - Cloud metadata (`169.254.169.254`, `fd00:ec2::254`)
   - Carrier-grade NAT (`100.64.0.0/10`)
3. **HTTP client:** custom DNS resolver yang return whitelist subnet only; disable redirects atau follow dengan re-check.
4. **Network-level:** scraper pod hanya bisa egress ke proxy. Proxy (Squid/forwardproxy custom) dengan domain allowlist. Block semua egress lain via NetworkPolicy + AWS Security Group.
5. **Playwright:** `--proxy-server`, `--proxy-bypass-list`, page route handler reject internal URL.

### 3.6 SQL Injection

- Parameterized query mandatory. Lint rule: deteksi `fmt.Sprintf("...%s...", query)` atau `f"SELECT ... {var}"` di Python — fail CI.
- ORM aman: `sqlc` (Go, type-safe codegen), SQLAlchemy 2.0 Core, Prisma (TS). Hindari raw query kecuali wrapped + reviewed.
- Read replica dengan user terbatas `read_only` untuk reporting.
- DB user prinsip least privilege: app service punya `SELECT/INSERT/UPDATE/DELETE` per schema needed; tidak punya `DROP/CREATE/ALTER/TRUNCATE`.

### 3.7 Prototype Pollution & Deserialization

- **JS:** gunakan `Object.create(null)` untuk map, hindari `lodash.merge`/`set` versi rentan (`lodash >=4.17.21`), pakai `structuredClone` untuk deep copy.
- **Python:** `json.loads` saja, **never** `pickle.loads` / `yaml.load` (gunakan `yaml.safe_load`); deny `dill`, `marshal` untuk untrusted input.
- **Go:** `json.Decoder` dengan `DisallowUnknownFields()`, no `gob` over network.
- **Strategy code (v2 marketplace):** WASM atau Pyodide sandbox; tidak pernah `exec`/`eval` di host process.

### 3.8 Dependency Security (SCA & SBOM)

- **Tools:** Dependabot (GitHub) + **Snyk** (deep, license) + **Trivy** (container & FS scan). Pilih 1 sebagai authoritative untuk alert routing → Snyk untuk M0–M6, evaluate biaya vs Socket.dev/Mend.
- **SBOM:** generate CycloneDX 1.5 per build (`syft packages dir:./ -o cyclonedx-json`). Simpan di artifact registry; attach ke release.
- **SLSA target:** **SLSA Level 2 di M6** (build provenance via GitHub Actions OIDC + `slsa-github-generator`), target **SLSA Level 3 di M12** (hermetic, isolated builder).
- **License compliance:** deny copyleft strong (GPL-3.0, AGPL) di komponen distribusi. AGPL ok untuk internal service yang tidak di-distribusi (debatable — legal review).
- **Patch SLA:** lihat Section 11.

### 3.9 Secret Detection di Repo

- **Pre-commit:** `gitleaks` config Nubuat-specific (regex untuk Anthropic key `sk-ant-`, Midtrans server key `Mid-server-`, Xendit `xnd_`, AWS `AKIA`, dll).
- **CI:** TruffleHog v3 scan PR + verified mode untuk reduce false positive.
- **Server-side:** GitHub secret scanning + push protection (mandatory).
- **Runtime:** Vault audit log alert kalau ada akses anomali; AWS GuardDuty findings.
- **Rotation playbook** jika leak (auto-revoke via webhook ke vendor where supported).

---

## 4. Network & Infrastructure Security

### 4.1 Cloudflare (Edge)

- **WAF managed rules:** OWASP Core Ruleset (CRS) baseline, Cloudflare Free → Pro → Business tier (rate limit + bot management) sesuai skala.
- **Custom rules:**
  - Rate limit `/api/v1/auth/login` → 10 req/min/IP.
  - Rate limit `/api/v1/ai/chat` → tier-based (token bucket di app + edge).
  - Block known TOR exit (opsional, banyak false positive untuk power user).
  - Geo-block — **default tidak diaktifkan** (user diaspora). Diaktifkan per-endpoint admin (`admin.nubuat.id` hanya Indonesia + Singapore office).
- **Bot management:** Turnstile challenge untuk signup, password reset, dan AI chat endpoint untuk free tier.
- **DDoS:** Cloudflare L3/L4 unmetered + AWS Shield Standard di origin. **AWS Shield Advanced (~USD 3.000/bulan)** dievaluasi setelah revenue cukup (M12+).
- **Cache rules:** static asset 1 tahun (immutable hash), API no-cache, public chart data 5 menit (kalau bisa).

### 4.2 TLS Configuration

- **TLS 1.3 minimum** di edge dan origin. Disable TLS 1.0–1.2 (legacy mobile pre-2016 akan reject — sesuai target user).
- **Cipher suites** (TLS 1.3): `TLS_AES_256_GCM_SHA384`, `TLS_CHACHA20_POLY1305_SHA256`, `TLS_AES_128_GCM_SHA256` saja.
- **HSTS preload:** submit `nubuat.id` ke hstspreload.org setelah subdomain stabil (`max-age=63072000; includeSubDomains; preload`).
- **Certificate management:** Cloudflare Universal SSL + Let's Encrypt untuk origin (cert-manager di K8s).
- **CAA record DNS:**
  ```
  nubuat.id. CAA 0 issue "letsencrypt.org"
  nubuat.id. CAA 0 issue "amazontrust.com"
  nubuat.id. CAA 0 iodef "mailto:security@nubuat.id"
  ```
- **Mobile certificate pinning:** pin SPKI hash dari Cloudflare leaf + backup hash dari root CA fallback. Roll-out dengan dual-pin window saat renewal. Library: TrustKit (iOS), OkHttp CertificatePinner (Android), atau RN `react-native-ssl-pinning`.
- **No certificate pinning di Web** (pin via HSTS + CAA cukup).

### 4.3 Private Networking (AWS)

- **VPC topology** (region `ap-southeast-3` Jakarta):
  - Public subnet: ALB, NAT Gateway, Bastion (replaced dengan SSM).
  - Private app subnet: EKS nodes, ECS tasks.
  - Private data subnet: RDS, ElastiCache, MSK (kalau Kafka), QuestDB EC2.
  - Tidak ada public IP di app/data subnet.
- **No bastion EC2** — pakai **AWS SSM Session Manager** + Instance Connect untuk akses (audited).
- **VPC endpoint** untuk S3, KMS, Secrets Manager, ECR — traffic tidak keluar ke internet.
- **VPC peering** ke vendor (Anthropic VPC peering tidak tersedia per Mei 2026 — pakai PrivateLink kalau tersedia di region).

### 4.4 Egress Control

- **NAT + allowlist:** outbound dari private subnet via NAT, tapi NetworkPolicy K8s + Security Group restrict per workload:
  - Market Data Ingestor: hanya ke vendor (Invezgo, OHLC.dev, iTick) IP/domain.
  - AI Copilot: hanya `api.anthropic.com`.
  - Billing: hanya `api.midtrans.com`, `api.xendit.co`.
  - Research Aggregator: via authorized proxy (lihat Section 3.5).
- **Egress proxy** (Cloudflare WARP atau Squid) untuk research aggregator; log semua URL.

### 4.5 Kubernetes Security (EKS)

- **Pod Security Admission:** namespace label `pod-security.kubernetes.io/enforce: restricted` untuk app namespace. `baseline` untuk system-critical.
- **NetworkPolicy default-deny:** setiap namespace deploy `default-deny-ingress` + `default-deny-egress`, kemudian whitelist per service.
- **Image policy:** **Kyverno** (atau OPA Gatekeeper) admission:
  - Only images from `ecr.ap-southeast-3.amazonaws.com/nubuat/*` atau `cgr.dev/chainguard/*`.
  - Require `cosign` signature (Sigstore policy).
  - Disallow `:latest` tag.
  - Disallow `privileged`, `hostNetwork`, `hostPID`, `hostIPC`.
- **Workload baseline:**
  ```yaml
  securityContext:
    runAsNonRoot: true
    runAsUser: 10001
    runAsGroup: 10001
    fsGroup: 10001
    seccompProfile:
      type: RuntimeDefault
    allowPrivilegeEscalation: false
    readOnlyRootFilesystem: true
    capabilities:
      drop: ["ALL"]
  ```
- **Runtime security:** **Falco** (atau AWS GuardDuty EKS Runtime Monitoring) untuk detect anomali syscall.
- **Cluster autoscaler:** node group dengan **Bottlerocket** OS (immutable, container-optimized).

### 4.6 Container Security

- **Base image:** Chainguard Images (distroless, CVE-free baseline) atau `gcr.io/distroless/static:nonroot` untuk Go; `python:3.12-slim` di-harden (no apt cache, non-root) untuk Python.
- **Build:**
  - Multi-stage; final image tidak punya `bash`/`apk`/`apt`.
  - User non-root (UID 10001+).
  - Tidak ada secret di image — semua via env / mounted volume.
- **Scan:** Trivy di CI; fail build kalau ada CVE **Critical** unfixed atau **High** dengan fix tersedia.
- **Sign:** Cosign (Sigstore) keyless dengan GitHub OIDC.
- **SBOM attach:** Syft generate, push sebagai attestation.

---

## 5. Data Security

### 5.1 Data Classification

| Class | Examples | Encryption | Access | Retention |
|---|---|---|---|---|
| **Public** | Marketing content, public ticker info | TLS in transit | Public | Indefinite |
| **Internal** | Aggregated metrics, internal docs | TLS + at-rest enc | Staff | Project lifetime |
| **Confidential** | User email, watchlist, portfolio | TLS + at-rest + RLS | User + scoped staff | Per Section 8.5 |
| **Restricted (PII/PCI/secret)** | NIK, alamat, HP, payment metadata, secret | TLS + at-rest + **field-level enc** + audit | Need-to-know + audit | Per Section 8.5 |

Labeling implementasi: tag column di schema (`@pii`, `@restricted` di komentar / metadata table), enforce via lint + DLP.

### 5.2 Encryption at Rest

- **Database (RDS PostgreSQL):** AES-256 storage encryption via AWS KMS Customer Managed Key (CMK). Snapshot ikut terenkripsi.
- **QuestDB / ClickHouse:** EBS encryption (CMK).
- **S3 / R2:** SSE-KMS dengan CMK; R2 default AES-256 (Cloudflare-managed) — supplement dengan **client-side encryption untuk Restricted class**.
- **Backup:** AES-256 + immutable (S3 Object Lock compliance mode 30 hari, weekly 90 hari, monthly 7 tahun untuk financial record).
- **KMS key hierarchy:**
  - **Root CMK** per environment (dev/staging/prod), per region.
  - **DEK (Data Encryption Key)** envelope: app generate DEK, encrypt dengan KMS, simpan ciphertext di kolom DB.

### 5.3 Field-Level Encryption (PII)

Field yang **wajib** field-level encrypted dengan envelope (DEK per record):
- `users.nik_encrypted` (Nomor Induk Kependudukan)
- `users.phone_encrypted`
- `users.address_encrypted`
- `users.dob_encrypted`
- `kyc_documents.file_key_encrypted` (S3 key)
- `payment_methods.metadata_encrypted` (token + last4 only, NO PAN)

**Pattern (Go pseudocode):**
```go
func EncryptField(plaintext []byte) (ciphertext []byte, encDek []byte, err error) {
    dek := make([]byte, 32)
    rand.Read(dek)
    encDek, _ = kms.Encrypt(ctx, &kms.EncryptInput{
        KeyId:     aws.String(piiCMKArn),
        Plaintext: dek,
    })
    aead, _ := chacha20poly1305.NewX(dek)
    nonce := make([]byte, aead.NonceSize())
    rand.Read(nonce)
    ciphertext = aead.Seal(nonce, nonce, plaintext, nil)
    // wipe dek
    for i := range dek { dek[i] = 0 }
    return
}
```
- **Algorithm:** XChaCha20-Poly1305 (AEAD, nonce-misuse resistant) atau AES-256-GCM.
- **Searchable encryption** untuk email/HP: simpan **HMAC-SHA-256** (deterministic, dengan pepper) terpisah untuk indexed lookup; ciphertext untuk display.

### 5.4 Encryption in Transit

- TLS 1.3 publik (Section 4.2).
- **mTLS internal** via service mesh (Linkerd/Istio) — semua pod-to-pod traffic terenkripsi.
- **Redis TLS** (AUTH + TLS).
- **RDS:** `sslmode=verify-full` di connection string.
- **NATS / Kafka:** TLS + mutual auth.

### 5.5 Tokenization (Payment)

- **Tidak pernah** simpan PAN, CVV, full track data. PCI DSS SAQ-A scope.
- Midtrans tokenize → store `saved_token_id` di Nubuat (opaque).
- Xendit `linked_account_token` untuk recurring DD/e-wallet.
- Card metadata yang boleh simpan: `last4`, `brand`, `expiry_month`, `expiry_year`, `bin_country` — masih confidential.

### 5.6 Backup & Recovery

| Data | Backup cadence | Retention | Encryption | Test |
|---|---|---|---|---|
| PostgreSQL | Continuous (PITR), snapshot daily | 35 hari hot, 7 tahun WORM | KMS CMK | Restore drill bulanan |
| QuestDB | Daily snapshot to S3 | 90 hari hot, 1 tahun cold | KMS | Quarterly |
| Redis | RDB snapshot 6 jam | 7 hari | KMS | Quarterly |
| Object storage | Cross-region replicate | 7 tahun | SSE-KMS | Quarterly |
| Audit log | Continuous to S3 Object Lock | 7 tahun (immutable) | KMS | Half-yearly read-test |

**Cross-region:** AWS `ap-southeast-3` (primary) → `ap-southeast-1` (Singapore) read-replica untuk DR; dengan PDP catatan: **data PII Indonesia tetap primary di ID; DR replica adalah backup encrypted dengan dokumentasi transfer agreement (legal review)**.

### 5.7 Secrets Management

- **Primary:** **HashiCorp Vault** (self-hosted di K8s, atau Vault Enterprise; alternatif **AWS Secrets Manager** untuk simplicity di M0–M6).
- **Pattern:**
  - **Dynamic DB credential** — Vault generate per-pod, TTL 24 jam, auto-revoke.
  - **Static secret** (vendor API key) — Vault KV v2 dengan rotation reminder.
  - **PKI** — Vault PKI engine sebagai intermediate CA untuk service mesh certs.
- **Akses:** Vault auth method `kubernetes` (ServiceAccount JWT) + AppRole untuk CI; manual unseal pakai Shamir 5/3.
- **NEVER:** secret di env var file di repo, secret di K8s `Secret` plain (gunakan **External Secrets Operator** dengan Vault sync, atau **Sealed Secrets**).
- **Logging:** Vault audit log → SIEM. Alert jika ada `read` di luar jam kerja / dari IP unusual.

---

## 6. Payment Security

### 6.1 PCI DSS Scope Minimization (SAQ-A target)

**SAQ-A** = merchant yang **outsource 100% cardholder data handling** ke PCI DSS Validated Service Provider (Midtrans, Xendit, Stripe).

Syarat di Nubuat:
1. **Tidak pernah** terima PAN di server kita. Card form via Midtrans Snap iframe / redirect, atau Xendit drop-in.
2. **Web site tidak boleh** memuat JS yang punya akses ke iframe PAN — `frame-ancestors 'none'` di kita, iframe Midtrans di domain mereka.
3. Audit: scan log/codebase untuk PAN regex (`\b(?:\d[ -]*?){13,19}\b` + Luhn check) — automated DLP.
4. Annual SAQ-A questionnaire + AOC dari Midtrans/Xendit di file.

### 6.2 Webhook Security

**Midtrans signature verify:**
```python
import hashlib, hmac, os
def verify_midtrans(order_id: str, status: str, gross: str, signature: str) -> bool:
    server_key = os.environ["MIDTRANS_SERVER_KEY"]
    payload = f"{order_id}{status}{gross}{server_key}"
    expected = hashlib.sha512(payload.encode()).hexdigest()
    return hmac.compare_digest(expected, signature)
```
**Xendit:** verify header `x-callback-token` constant-time compare ke value rotated tahunan.

**Replay protection:**
- Idempotency key = `order_id`; jika sudah `paid` → ack 200 tanpa side-effect.
- Timestamp window: reject kalau `event_time` lebih lama dari 10 menit (untuk kasus Midtrans yang punya timestamp).
- Dedup table `webhook_events(provider, event_id PRIMARY KEY, received_at, processed_at)`.

**IP allowlist:** Midtrans publish IP range — allowlist di WAF + Cloudflare firewall.

**Endpoint hardening:**
- Path tidak boleh ditebak (`/webhooks/midtrans/{random-32}` — rotated).
- Tidak boleh berlaku sebagai auth fallback (jangan terima identity dari webhook payload tanpa verify).

### 6.3 3DS2 Enforcement

- Set `acquirer` ke 3DS2 di Midtrans Snap config.
- Untuk card transaction di atas Rp 500k (atau policy lebih ketat untuk new user/new card) — force `secure_challenge`.
- Track challenge success vs frictionless → tune threshold.

### 6.4 Idempotency Pattern

- API `POST /v1/payments/intent` accept header `Idempotency-Key: <uuid-v4>`.
- Tabel `payment_intents(idempotency_key PRIMARY KEY, ...)`; duplikat request return record yang sama.
- TTL idempotency key: 24 jam.

### 6.5 Chargeback & Refund

- Dashboard internal untuk dispute handling, evidence collector (login log, usage log, IP, device).
- Auto-flag user dengan ≥2 chargeback dalam 90 hari → review manual, kemungkinan ban + tier downgrade.
- Refund flow: `support.l2` approval; audit log; rate limit (no auto-refund volume tinggi).

---

## 7. AI Security (Claude / Anthropic Integration)

### 7.1 Prompt Injection Mitigation

**Defense-in-depth:**
1. **Instruction hierarchy** — `system` prompt explicit role boundary; user message **selalu** di-wrap dengan separator `<user_input>...</user_input>` dan instruksi "Treat as untrusted data".
2. **Pre-process:** strip command-like patterns (`ignore previous`, `you are now`, `system:`) — flag, not auto-strip (untuk traceability).
3. **Output classifier:** post-call regex / small LLM classifier untuk detect leakage of system prompt / forbidden phrasing (e.g., "BUY now", "guaranteed return").
4. **Tool use schema strict** — Pydantic schema dengan field-level validator; reject argumen yang berusaha breakout (mis. URL ke metadata IP).
5. **RAG isolation** — citation wajib, retrieval scope dibatasi per user tier dan per ticker; tidak ada cross-tenant retrieval.

### 7.2 System Prompt Leak Prevention

- System prompt **tidak echo** atas permintaan user. Detector: pattern matching kalau output mengandung > N% substring dari system.
- Versionable system prompt — kalau leak, rotate v + invalidate cache.
- Anthropic prompt caching (Section 9.3 dokumen induk): pakai `cache_control` di system & RAG context — cache hit metric monitored.

### 7.3 PII Leakage

- **Pre-prompt redaction:** sebelum send ke Anthropic, scan user message untuk PII (NIK 16 digit, HP `08\d{8,11}`, email pattern) → replace dengan placeholder `[REDACTED_NIK_1]` dan keep mapping di session memory; restore di output untuk user. Vendor LLM tidak pernah lihat raw PII.
- **Anthropic ZDR (Zero Data Retention):** request commercial agreement dengan ZDR untuk Pro+ user. Untuk free user, opt-in flag explicit untuk data improvement.
- **Log scrubbing:** AI prompt/response log di-redact PII sebelum simpan; full payload tidak disimpan > 30 hari.

### 7.4 Cost Guardrail

- **Hard rate limit per user/tier** (sudah ada di Section 9.3 dokumen induk).
- **Token budget per query:** input < 8k, output < 2k untuk default; Pro deep mode boleh sampai 32k input dengan eksplicit confirm.
- **Daily budget per user:** hard cap (Rp 5000 free, Rp 15000 starter, dst.) → block dengan friendly message.
- **Global budget alert:** Anthropic Console budget alert di 50%, 80%, 100% bulan; circuit breaker auto-shutdown AI Copilot kalau 110%.
- **Anomaly detection:** alert kalau user query rate > 3σ di atas baseline.

### 7.5 Output Safety

- **Mandatory disclaimer:** setiap response yang menyebut ticker dan action verb (`buy`, `sell`, `beli`, `jual`, `naik`, `turun`) → append disclaimer (Section 9 dokumen ini).
- **Forbidden phrasing detector** (pre-launch list):
  - "saya rekomendasikan Anda beli/jual ..."
  - "guaranteed return"
  - "risk-free"
  - "100% akurat"
  - Output langsung tersebut → re-prompt LLM dengan instruksi kalibrasi, atau replace dengan softened version.
- **Structured output** untuk Daily Picks: Pydantic schema (entry, SL, TP, R/R, confidence, reasoning, **disclaimer field non-nullable**).

### 7.6 Hallucination Mitigation

- **Citation requirement:** RAG hit ID di-track; response wajib include `sources[]`.
- **Tool-grounded answer:** untuk pertanyaan numerik (PE BBRI sekarang) — LLM **wajib** call tool (`get_fundamentals`), tidak boleh jawab dari pengetahuan internal. Enforced via system prompt + post-call check.
- **Confidence score:** LLM diminta self-report confidence 0–1; UI tampilkan; di bawah 0.6 → tag "low confidence, verifikasi manual".

---

## 8. Privacy & UU PDP (UU 27/2022) Compliance

### 8.1 DPO (Data Protection Officer)

- **Appoint** DPO sebelum launch publik (M3). Opsi: in-house compliance lead atau retained legal advisor (USD 24–60k/tahun).
- DPO publish di privacy policy: `dpo@nubuat.id`, alamat fisik kantor.
- DPO report langsung ke CEO/Board; punya akses audit log read-only.

### 8.2 Lawful Basis Mapping

| Data category | Lawful basis (UU PDP Art. 20) |
|---|---|
| Email, password, profile dasar | Pelaksanaan kontrak (subscription) |
| Payment metadata | Pelaksanaan kontrak |
| NIK, alamat, HP (KYC opsional) | Persetujuan (granular consent) |
| Watchlist, portfolio (manual) | Pelaksanaan kontrak |
| Analytics behavioral (PostHog) | Kepentingan sah (legitimate interest) + opt-out |
| Marketing email | Persetujuan (opt-in) |
| AI training (kalau ada) | Persetujuan eksplisit |
| Geo-IP | Kepentingan sah (security) |
| Cookies non-essential | Persetujuan |

### 8.3 Data Subject Rights

UU PDP Art. 5–10: hak akses, koreksi, pembaruan, penghentian pemrosesan, penghapusan, portabilitas, keberatan, withdraw consent.

**Flow & SLA:**
- Submit via portal `nubuat.id/privacy/request` atau email `dpo@nubuat.id`.
- Identity verify (re-auth + MFA + dokumen kalau kasus berisiko).
- **SLA 3x24 jam** acknowledge, **30 hari kalender** fulfill (UU PDP target).
- Audit log setiap request, response, dan action taken.
- **Erasure exception:** retain data untuk kewajiban hukum (financial record 7 tahun → tag `legal_hold`).
- **Portability:** export JSON struktur user data (profile, watchlist, alert, portfolio, payment history) + dokumentasi schema.

### 8.4 Consent Management

- **Granular consent UI** (signup & settings):
  - [ ] Saya setuju Syarat Layanan & Kebijakan Privasi (wajib)
  - [ ] Email marketing & newsletter (opsional)
  - [ ] Analytics produk untuk perbaikan layanan (opsional, default off → opt-in)
  - [ ] Personalisasi AI berdasarkan watchlist (opsional)
  - [ ] Sharing data agregat ke partner riset (opsional)
- **Consent record:** tabel `user_consents(user_id, category, granted, version_doc, ip, ua, timestamp)`.
- **Revoke flow:** sama mudahnya dengan grant (UU PDP requirement); revoke immediate; processing yang sudah jalan distop.
- **Versioning kebijakan:** privacy policy versioned; user re-consent kalau material change.

### 8.5 Data Residency

- **Primary storage data PII WNI di Indonesia (AWS ap-southeast-3 Jakarta).**
- **Cross-border transfer** (untuk vendor luar) hanya diperbolehkan kalau:
  - Negara penerima punya tingkat perlindungan adekuat (TBD list dari Komisi PDP), ATAU
  - Ada SCC (Standard Contractual Clauses) / DPA dengan vendor, ATAU
  - Persetujuan eksplisit subjek data.
- **Vendor luar yang dipakai:**
  - **Anthropic** (US) — DPA + zero data retention agreement; transfer agreement clause. **PII redacted sebelum send.**
  - **AWS** — pilih region Jakarta untuk production data; signed DPA AWS.
  - **Cloudflare** — DPA standard.
  - **Sentry** (kalau pakai cloud-hosted, US/EU) — alternatif self-hosted di Jakarta region (preferred). Scrub PII sebelum send.
  - **PostHog** — self-host di AWS Jakarta (preferred per dokumen induk).
  - **Midtrans, Xendit** — domestik Indonesia, OJK regulated.

### 8.6 Data Breach Notification

UU PDP Art. 46: notifikasi **3x24 jam** ke Komisi PDP dan subjek data terdampak.

**Runbook (Section 11.7 detail):**
- T+0 → T+1 jam: incident commander declare, assemble response team.
- T+1 → T+24 jam: contain, eradicate, scope assessment.
- T+24 → T+72 jam: notifikasi resmi ke Komisi PDP (template), notifikasi user terdampak (email + dashboard banner).
- T+30 hari: post-mortem internal, regulator follow-up.

### 8.7 Privacy by Design

- **Data minimization** — collect hanya yang perlu. NIK hanya kalau OJK lisensi mengharuskan.
- **Purpose limitation** — setiap field punya `purpose` tag di schema doc; cross-purpose use butuh re-consent.
- **Storage limitation** — retention policy per kategori:

| Kategori | Hot | Cold | Total |
|---|---|---|---|
| Profile aktif | unlimited | — | — |
| Profile setelah account delete | 30 hari grace | — | hard delete |
| Session log | 90 hari | — | — |
| Audit log (security) | 1 tahun | 7 tahun | 7 tahun |
| Audit log (financial transaction) | 1 tahun | 7 tahun | 7 tahun (potensi audit OJK) |
| AI prompt log (redacted) | 30 hari | — | — |
| Behavioral analytics (PostHog) | 6 bulan agregat | — | — |
| Backup PII | 35 hari | — | per backup policy |

### 8.8 Cookie Consent

- Banner Indonesia-style: "Kami pakai cookie untuk pengalaman terbaik. [Terima semua] [Hanya esensial] [Kelola]".
- **No dark pattern:** "Tolak" sama jelas dengan "Terima".
- Categories: Essential (always on), Functional, Analytics, Marketing.
- Implementation: **OneTrust** (mahal, USD 5–20k/tahun) atau open-source **klaro!** / **Cookiebot**. Untuk MVP, custom Tailwind banner + consent state di Postgres.

### 8.9 DPIA (Data Protection Impact Assessment)

DPIA wajib untuk:
- **AI Copilot** — automated profiling + decision (recommendation = soft profiling).
- **Daily Picks** — automated profiling jika personalisasi berdasarkan portfolio.
- **Behavioral analytics** — large-scale profiling.

**Template DPIA:**
1. Description of processing.
2. Necessity & proportionality.
3. Risk to data subject (likelihood × severity).
4. Mitigation measures.
5. Residual risk decision.
6. DPO sign-off.

Schedule: DPIA pertama M3 (sebelum public launch), review tahunan + saat ada perubahan material.

---

## 9. Regulasi Pasar Modal Indonesia

### 9.1 OJK Penasihat Investasi

**Regulasi referensi:**
- **Keputusan Ketua Bapepam Nomor V.C.1** — Perizinan Penasihat Investasi.
- **SEOJK Nomor 7/SEOJK.04/2017** — Permohonan perizinan elektronik.
- **POJK 39/2014** — terkait Wakil Penasihat Investasi.
- Update 2025–2026: monitor POJK terkait robo-advisor & digital investment advisor (kalau ada).

**Yang BOLEH (tanpa lisensi):**
- **Analytics tool** — visualisasi data, screener, indikator teknikal.
- **General market commentary** — analisis pasar, sektor, IHSG.
- **Educational content** — Akademi Nubuat, kursus.
- **Aggregated research** — kompilasi rating sekuritas (faktual, dengan atribusi).
- **News & data display** — dengan disclaimer.

**Yang TIDAK BOLEH (tanpa lisensi):**
- **Personalized investment advice** — "Anda sebaiknya beli ABC karena profil Anda XYZ".
- **Portfolio management** — manage dana orang lain.
- **Solicitation** — "Bayar Rp X untuk sinyal khusus Anda".

**Posisi Daily Picks tanpa lisensi (M0–M9):**
- Format: **"Daftar saham yang memenuhi kriteria teknikal/fundamental X hari ini"** + disclaimer eksplisit.
- TIDAK pakai bahasa "rekomendasi untuk Anda", "personal pick".
- Sama untuk semua user (tier sama dapat list yang sama, untuk avoid argumen personalisasi).
- AI Copilot: persona "asisten analisis" bukan "penasihat".

### 9.2 Disclaimer Wajib

Setiap rekomendasi/daily pick/Q&A AI, footer wajib:

> **Disclaimer Investasi**
> Seluruh informasi, analisis, dan rekomendasi yang disajikan dalam Nubuat adalah untuk tujuan **edukasi dan informasi semata**, bukan merupakan ajakan, anjuran, atau saran untuk membeli atau menjual efek tertentu. Keputusan investasi adalah tanggung jawab pribadi pengguna. Kinerja masa lalu bukan jaminan kinerja masa depan. PT Nubuat Cipta Daya **tidak memiliki izin sebagai Penasihat Investasi dari Otoritas Jasa Keuangan (OJK)** [hapus klausul ini setelah lisensi diperoleh].

Implementasi:
- Component `<DisclaimerBanner />` reusable, mandatory di Daily Picks card, AI Copilot response, Research Aggregator detail.
- Footer global di semua halaman.
- Email & push notification disclaimer 1-liner.
- Audit lint untuk pastikan setiap response endpoint Daily Picks include `disclaimer` field.

### 9.3 Anti Pump-and-Dump Policy

- **Daily Picks rule-based**, tidak ada manual override. Code review wajib untuk perubahan algoritma.
- **No paid promotion** ticker tertentu — clausul di Terms of Service & internal policy.
- **Discord/Telegram moderasi:**
  - Ban: shilling, "ada bandar masuk", "ABCD pasti naik", harga prediksi.
  - Tolerated: analisis dengan reasoning + chart.
  - Auto-mod (Discord bot) detect ticker spam + emoji rocket flood.
  - Mod team 24/7 saat jam bursa.
- **Detection:** anomali behavior — user yang sering post ticker dan ticker tersebut volume spike post-post. Internal report.

### 9.4 Insider Trading Awareness (Internal)

**Policy karyawan Nubuat:**
- Wajib disclose holding saham individu Indonesia saat onboarding + kuartal.
- **Blackout period:** 24 jam sebelum & sesudah Daily Picks publish — tidak boleh trading saham yang ada di pick.
- **Pre-clearance:** karyawan dengan akses data product (engineer, analyst, founder) — semua trade di Indonesia equity wajib pre-clearance compliance officer.
- **No trading di ticker yang ada di pipeline research** sampai publish.
- **No insider info trading** — info dari user (portfolio aggregate) NOT FOR PERSONAL USE.
- Annual training + acknowledgment signed.

### 9.5 PSE Lingkup Privat (Kemkomdigi)

- Daftar di **pse.kominfo.go.id** sebelum operasional komersial (M3–M6).
- Klasifikasi: SE dengan transaksi keuangan & UGC.
- Komitmen: takedown konten ilegal max 24 jam (urgent) / 4 jam (terorisme/CSAM/judi).
- Tata kelola: tunjuk contact person, terbitkan kebijakan moderasi.

### 9.6 Anti Money Laundering (PPATK)

- **Saat ini (M0–M12)** Nubuat **tidak handle dana user** (no escrow, no brokerage), sehingga **bukan PJK** (Penyedia Jasa Keuangan) di rezim AML.
- Tetap implementasi: KYC saat user upgrade Elite (verifikasi NIK + selfie kalau perlu) → sebagai persiapan masa depan.
- Kalau M18+ ke arah strategy marketplace dengan revenue share → re-evaluate PPATK registration.

### 9.7 OJK Marketing & Konten Investasi

- POJK 31/2020 — Penyelenggaraan Layanan Iklan/Promosi Produk Jasa Keuangan: walau Nubuat bukan PJK, marketing investasi mengikuti praktik baik:
  - **Tidak menjanjikan return spesifik.**
  - **Tidak menggunakan testimonial profit user** sebagai promosi utama (boleh, tapi dengan disclaimer).
  - **Tidak menggunakan FOMO / scarcity yang menyesatkan.**
- Influencer marketing: kontrak dengan klausul disclaimer wajib, tidak ada paid pump-promotion ticker spesifik.

### 9.8 Roadmap Lisensi Penasihat Investasi

| Milestone | Aksi |
|---|---|
| M3 | Engage law firm pasar modal (HHP / AHP / Makarim Taira) untuk feasibility |
| M6 | Susun struktur PT (modal disetor sesuai persyaratan, Wakil Penasihat Investasi minimal 1 orang dengan sertifikasi WPPE/WMI/WAPERD) |
| M9 | Pengajuan permohonan lisensi via SPRINT OJK |
| M12 | Target lisensi terbit |
| M12+ | Update product copy, hapus disclaimer "tidak berlisensi", aktifkan fitur personalisasi advice (Elite/Institutional) |

Estimasi biaya total: USD 50–150k (legal + setup + biaya operasional 1 tahun pertama dengan Wakil PI in-house).

---

## 10. Compliance Frameworks (Opsional Strategic)

### 10.1 SOC 2 Type II Readiness

**Trust Service Criteria yang ditarget:**
- **Security** (CC) — mandatory.
- **Availability** (A) — untuk SLA institutional.
- **Confidentiality** (C) — untuk data user & research.
- (Skip Privacy & Processing Integrity kecuali ada permintaan enterprise tertentu.)

**Checklist M6 readiness (Type I → Type II):**
- Information Security Policy approved by management.
- Acceptable Use Policy untuk staff.
- Onboarding/offboarding playbook dengan akses review.
- Risk Assessment tahunan + register.
- Vendor Management policy + DD.
- Incident Response Plan + drill.
- Change Management policy (peer review, approval).
- Logical access control: IAM (Section 2), MFA, JIT.
- Logging & monitoring (Section 14).
- BC/DR plan (Section 12) + drill annual.
- Vulnerability management (Section 11).
- Encryption (Section 5).
- Background check vendor (opsional).

**Tooling readiness:** **Vanta** atau **Drata** atau **Secureframe** (USD 15–25k/tahun) untuk continuous monitoring + audit prep.

**Auditor:** firm Indonesia/regional dengan AICPA accreditation — Crowe, BDO, Deloitte (mahal), atau boutique seperti A-LIGN/Schellman.

**Type II window:** 6–12 bulan observasi setelah Type I. Target audit selesai **M18**.

### 10.2 ISO/IEC 27001 Mapping

ISO 27001:2022 — 93 control di Annex A (4 themes: organizational, people, physical, technological).

**Approach Nubuat:** map kontrol-kontrol di plan ini ke Annex A; produce Statement of Applicability (SoA). Sertifikasi formal (USD 30–60k) sebagai opsional di M24+ untuk enterprise sales unlocking — sebelum itu, "ISO 27001 aligned" claim sufficient.

### 10.3 PCI DSS SAQ-A

Lihat Section 6.1. Annual self-assessment + AOC vendor.

### 10.4 PSE Kemkomdigi

Lihat Section 9.5.

### 10.5 Cyber Insurance

- Coverage: **first-party** (incident response, forensics, downtime, ransom kalau diaplikasikan ke kebijakan), **third-party** (regulatory fine PDP, user lawsuit).
- Quote ballpark Indonesia / regional: **USD 8–20k/tahun untuk coverage USD 1–5M** di M6+.
- Underwriter butuh evidence dari plan ini.

---

## 11. Security Operations (SecOps)

### 11.1 SIEM / Log Aggregation

- **Stack rekomendasi (opsi A — open + biaya operasional):** Loki + Grafana + Tempo + AlertManager. Plus **Wazuh** sebagai SIEM untuk correlation rules.
- **Stack rekomendasi (opsi B — managed):** Datadog (mahal di skala), Sumo Logic, or Elastic Cloud. Sentry tetap untuk error tracking.
- **Pipeline:** app → Vector / Fluent Bit → Loki/Elastic; security event → Wazuh/Datadog.
- **Correlation rules baseline:**
  - Failed login 5+ dalam 5 menit per user → alert.
  - Successful login + new ASN + new device → alert (med).
  - Admin action di luar jam kerja → alert (med).
  - DB query > 10s di prod → alert (low).
  - WAF block 100+ dari IP yang sama → auto-ban.
  - PII export > 1000 row di luar admin-known flow → alert (high).
  - AI cost di atas threshold per jam → alert (med).

### 11.2 SOAR Playbook

Playbook (runbook executable) untuk insiden umum:

| Insiden | Trigger | Actions |
|---|---|---|
| Account Takeover Suspected | Login + impossible travel + password change + email change in 1 jam | Force logout, revoke refresh, lock account, notify user via secondary channel, manual review |
| Credential Stuffing | Login fail > 1000/jam di IP range | Cloudflare auto-ban, raise WAF sensitivity, alert |
| Data Leak Suspected | DLP rule trigger (PAN, NIK in log), atau external alert | Page incident commander, isolate service, snapshot evidence, contain |
| DDoS L7 | Latency p99 spike + traffic spike | Cloudflare Under Attack mode, scale up, rate limit tighten |
| Ransomware (internal) | EDR alert | Isolate host, restore from immutable backup, forensics |
| Webhook Forge | Webhook signature fail > threshold | Disable affected webhook, rotate signing key, alert |
| AI Cost Spike | Anthropic spend > 80% budget | Throttle to Free tier, alert founder, freeze deep mode |

Tooling: **Tines** atau **Shuffle** (open-source SOAR), atau scripted in custom on-call automation. M3 untuk basic, M12 untuk mature.

### 11.3 Vulnerability Management

**Sources:** Snyk/Trivy continuous scan, Dependabot, pentest report, bug bounty report, CISA KEV, vendor advisories.

**Severity → SLA (Patch):**

| Severity | Definition | SLA Patch | SLA Mitigation |
|---|---|---|---|
| Critical | RCE, auth bypass, KEV-listed | **7 hari kalender** | 24 jam (block / workaround) |
| High | Sensitive data exposure, EoP | 30 hari | 7 hari |
| Medium | Authn bypass partial, DoS | 90 hari | 30 hari |
| Low | Informational, low impact | Next sprint | Tracked |

**SLA timer mulai:** dari vulnerability identification (CVE publish atau internal find).

**Patch process:** automated PR dari Dependabot/Snyk → CI test → merge → deploy. Critical bypass standard release window.

### 11.4 Penetration Testing

- **Pre-launch (M3):** boutique pentest USD 10–15k — web + API. Vendor opsi: Cure53, NCC Group, atau lokal (XYNEXIS, Digital Privacy, ITSEC Asia).
- **Annual (M12+):** USD 15–25k full-scope (web, API, mobile, infra).
- **Post-major-release:** scoped pentest untuk fitur baru sensitif (payment flow, AI tool).
- **Mobile app:** specialized mobile pentest (OWASP MASVS) di M9.

Output: report dengan severity, remediation, retest free.

### 11.5 Bug Bounty Program

- **Private (M6–M12):** HackerOne / Bugcrowd / lokal (Cyber Army Indonesia, idsecconf community) — invitation only 5–10 hunter. Budget USD 5–10k/tahun + USD 5–20k payout pool.
- **Public (M12+):** open scope dengan rules of engagement. Increase pool ke USD 20–50k/tahun.

**Reward tier (private start):**

| Severity | Reward |
|---|---|
| Critical (RCE, auth bypass full) | USD 1500–3000 |
| High (BOLA, sensitive leak) | USD 500–1500 |
| Medium | USD 100–500 |
| Low | USD 50–100 |
| Informational | Hall of Fame |

**Scope yang OUT:**
- DoS/DDoS, social engineering ke staff, physical, third-party (Anthropic, AWS infra).
- Self-XSS, missing security header tanpa exploit.

**SLA response:** triage 24 jam, fix Critical 7 hari.

### 11.6 Red Team Exercise

- **Annual** (M12+) — engagement 4–8 minggu, scope dengan opsi assume-breach.
- Cost: USD 30–60k.
- Output: TTP report mapped ke MITRE ATT&CK, gap di detection coverage.

### 11.7 Incident Response Plan

**Severity:**

| SEV | Definition | Examples | Response Time |
|---|---|---|---|
| SEV1 | Customer data breach, prod down > 30 menit jam bursa | Confirmed exfil PII, total outage trading hours | 15 menit page |
| SEV2 | Major degradation, security high | Partial outage, AI down, payment intermittent | 30 menit |
| SEV3 | Minor degradation | Single endpoint down, low priority bug | 2 jam |
| SEV4 | Informational | Low severity vuln finding | Next business day |

**Roles (rotasi on-call):**
- **Incident Commander (IC)** — koordinator, comms.
- **Tech Lead** — drive technical mitigation.
- **Comms Lead** — internal & external comms.
- **Scribe** — log timeline.
- **DPO/Legal** — kalau SEV1 PII (PDP notification).

**Escalation:**
- SEV1 → page CEO + DPO + Legal dalam 1 jam.
- SEV2 → page eng lead + product lead.

**Runbook structure (per incident type):** symptom → diagnose → contain → eradicate → recover → comms.

**Postmortem (Blameless template):**
- Summary
- Timeline (UTC + WIB)
- Impact (user count, revenue loss, data scope)
- Root cause (5 whys)
- What went well
- What went poorly
- Action items (owner + due date)
- Lessons learned

Published internal max 2 minggu post-incident. SEV1 + PDP → ringkasan public di status page kalau relevan.

---

## 12. Business Continuity & Disaster Recovery (BC/DR)

### 12.1 RTO / RPO

| Service tier | RTO | RPO | Notes |
|---|---|---|---|
| Core API (auth, sub) | 1 jam | 5 menit | Critical |
| Realtime quote (jam bursa) | 15 menit | 0 (best effort) | Critical |
| Daily Picks | 4 jam | 1 jam | Important |
| AI Copilot | 4 jam | 1 jam | Important |
| Research Aggregator | 24 jam | 24 jam | Defer-able |
| Backtest | 24 jam | 24 jam | Defer-able |
| Marketing site | 8 jam | 24 jam | Static |

### 12.2 Multi-AZ & Cross-Region

- **DB RDS Multi-AZ** — auto-failover, sync replica.
- **EKS** multi-AZ (3 AZ Jakarta `ap-southeast-3a/b/c`).
- **Object storage** versioning + cross-region replicate ke `ap-southeast-1` (Singapore — opsional, untuk DR-only, dengan transfer agreement PDP-compliant).
- **Cross-region warm standby** — di M9+; saat awal cukup multi-AZ.

### 12.3 DR Drill Schedule

- **Quarterly:** DB restore drill (snapshot → new instance → validate).
- **Half-yearly:** App failover (simulated AZ outage).
- **Annual:** Full region failover tabletop + game day.

### 12.4 Communication Plan

- **Status page:** `status.nubuat.id` (Statuspage.io atau self-hosted `cstate`).
- **Channels:** Email (transactional), in-app banner, Twitter/X official, Discord announcement.
- **Templates:** investigating / identified / monitoring / resolved.
- **Pra-approved comms** untuk SEV1 (legal + DPO + PR reviewed in advance).

---

## 13. Anti-Abuse / Anti-Fraud

### 13.1 Account Fraud (Signup)

Sinyal yang di-collect saat signup:
- **Disposable email** — block via `disposable-email-domains` list + dynamic check (kickbox-like).
- **Email + phone fingerprint** — fraud score (Sift / SEON / lokal). Optional.
- **Device fingerprint** (FingerprintJS Pro or open-source equivalent).
- **Behavioral biometrics** — typing cadence, mouse movement signup form (Castle.io / NoFraud); over-engineering untuk M0, evaluate M6+.
- **Signup velocity** — 5+ signup dalam 1 jam dari subnet → CAPTCHA + manual review.

### 13.2 Subscription Fraud

- **Chargeback dispute pipeline:**
  - Auto-collect evidence: login log, usage minute, IP, device, billing email match.
  - Submit evidence ke Midtrans/Xendit dispute API.
- **Repeat trial detection:** match by `email_normalized` (lowercase + strip `+suffix`), `phone`, `device_id`, `payment_token_fingerprint`. Block re-trial.
- **Trial abuse:** trial hanya untuk first card + first device + first email. Setelah trial selesai, downgrade ke Free, butuh re-subscribe.

### 13.3 Content Abuse (Discord / In-app)

- **Anti-spam:** rate limit message per channel, slow mode di channel sensitif.
- **Anti pump-and-dump:** detector keyword + ticker spam (sudah di Section 9.3).
- **Report flow:** user report → mod queue → ban escalation.
- **Profanity filter:** Indonesia + English lexicon, dengan whitelist konteks.

### 13.4 API Abuse

- **Rate limit per tier** (lihat Section 9.3 dokumen induk).
- **WAF anomaly:** Cloudflare Bot Score; challenge < 30, block < 1.
- **Scraping defense:**
  - Tier rate limit enforced.
  - **Watermark PDF export** dengan `user_id + timestamp + IP hash` embedded di metadata + visual (subtle).
  - **Honeypot endpoint** untuk detect scraper (`/api/v1/_internal/.../honeypot`).
  - **API key rotation** untuk Elite tier API access; usage anomaly alert.

### 13.5 Data Scraping Defense

- Free tier delay quote (sudah ada di dokumen induk: 15m delay) → mengurangi insentif scrape.
- **Server-side rendered** untuk data sensitif (avoid easy JSON scrape).
- **Cloudflare Scrape Shield** + custom anti-bot rules.

---

## 14. Audit & Logging

### 14.1 Audit Log Scope

Event yang **wajib** dicatat di audit log (tamper-evident, retain 7 tahun):

| Kategori | Event |
|---|---|
| **Auth** | Login success/fail, logout, password change, MFA enroll/disable, refresh issued/revoked |
| **Identity** | Profile change, email change, phone change, NIK update |
| **Authorization** | Permission grant/revoke, role change, JIT request/approve/expire |
| **Billing** | Subscription create/change/cancel, refund, chargeback received |
| **Admin Action** | Admin login, user lookup, PII unmask, force logout, ban, tier override |
| **Data Export** | User data download, portfolio export, PDF report generate |
| **Sensitive Read** | NIK access, address access, KYC document open |
| **Config Change** | Feature flag, rate limit, webhook config |
| **Security** | WAF block, IDS alert, SOAR action, secret rotation |
| **AI** | AI query (with redacted prompt), tool call, cost per request |

Audit event schema:
```json
{
  "event_id": "evt_01H...",
  "timestamp": "2026-05-11T03:00:00Z",
  "actor": {"type": "user|service|admin", "id": "...", "ip": "...", "ua": "..."},
  "action": "user.login.success",
  "resource": {"type": "user", "id": "..."},
  "context": {"tier": "pro", "device": "...", "session": "..."},
  "outcome": "success|failure",
  "metadata": {"...": "..."},
  "hash_prev": "sha256:...",
  "hash_self": "sha256:..."
}
```

### 14.2 Tamper-Evident Log

- **Append-only**: tabel Postgres `audit_events` tanpa UPDATE/DELETE grant ke service.
- **Hash chain (Merkle-like):** `hash_self = SHA-256(hash_prev || canonical_json(event))`.
- **Periodic anchor**: hash chunk per hari → push ke S3 Object Lock + (opsional) public timestamping (RFC 3161) atau OpenTimestamps.
- **Compliance copy**: continuous ke S3 dengan Object Lock Compliance Mode retention 7 tahun. Bahkan root account tidak bisa hapus.

### 14.3 Retention

| Log type | Hot | Cold | Total |
|---|---|---|---|
| App log (non-PII) | 30 hari | 90 hari | 120 hari |
| Security event | 90 hari | 1 tahun | 1+ tahun |
| Audit log | 1 tahun | 7 tahun | 7 tahun |
| Financial transaction | 1 tahun | 7 tahun | 7 tahun (OJK potential audit) |
| AI prompt log (redacted) | 30 hari | — | 30 hari |
| Access log (web/CDN) | 7 hari | 90 hari | 97 hari |

### 14.4 Log Redaction

- **Forbidden in log:** token, password (plain/hash), full PAN, CVV, full NIK, full address.
- **Allowed (with care):** user ID, email (mask `f***@example.com`), IP, partial location.
- **Implementation:** middleware logger dengan field allowlist; Postgres trigger reject INSERT dengan pattern PAN/NIK ke log table.
- **Sentry / Datadog scrubbing rules** untuk PII regex.

---

## 15. Vendor & Third-Party Risk Management

### 15.1 Vendor Inventory & Due Diligence

| Vendor | Service | Data Shared | DPA | Sub-processor list | DD level |
|---|---|---|---|---|---|
| Anthropic | LLM | Redacted prompt | Required + ZDR | Yes (AWS) | High |
| AWS | Infra | All | Signed | Yes | High |
| Cloudflare | CDN/WAF | Request metadata | Signed | Yes | High |
| Midtrans | Payment | Card token, email | Required + PCI DSS AOC | Yes | Critical |
| Xendit | Payment | Card token, email | Required + PCI DSS AOC | Yes | Critical |
| Sentry | Error tracking | Stack trace, scrubbed | Required | Yes | Medium |
| PostHog (self-host) | Analytics | Behavioral | N/A (self) | N/A | Low |
| Invezgo / OHLC.dev / iTick | Market data | None (we send query only) | Required | Yes | Medium |
| Resend / SendGrid | Email | Email + name | Required | Yes | Medium |
| Twilio / WA Business API | SMS / WA | Phone + content | Required | Yes | Medium |
| GitHub | Source code | Code + metadata | Signed | Yes | High |
| Datadog (opsi) | Observability | Logs/metrics scrubbed | Required | Yes | Medium |
| HackerOne / Bugcrowd | Bug bounty | Vuln report | Required | Yes | Medium |
| Vanta / Drata | Compliance automation | Config metadata | Required | Yes | Medium |

### 15.2 Vendor DD Checklist (per onboarding)

- [ ] Security questionnaire (SIG-Lite, CAIQ, atau custom).
- [ ] DPA signed + transfer mechanism kalau cross-border.
- [ ] SOC 2 Type II / ISO 27001 cert reviewed.
- [ ] Sub-processor list reviewed.
- [ ] Data classification matrix what & how.
- [ ] Breach notification SLA in contract (≤ 72 jam ke Nubuat).
- [ ] Right to audit clause (penting untuk PCI scope).
- [ ] Exit / data deletion clause.
- [ ] Insurance evidence (cyber, E&O).

### 15.3 Ongoing Monitoring

- **SLA review** kuartalan.
- **Cert renewal monitor** — Trust Centers (Drata Connect, vendor sites).
- **Incident notification** subscribe (status pages, security advisory).
- **Annual reassessment** untuk High/Critical vendor.

### 15.4 Sub-processor Publication

Maintain page `nubuat.id/legal/sub-processors` listing vendor + purpose + location, di-update saat ada perubahan. Email notification ke user 30 hari sebelum major sub-processor change (UU PDP best practice).

---

## 16. Mobile Security

### 16.1 OWASP MASVS Mapping

MASVS-L2 (Defense-in-depth) target untuk Nubuat mobile (RN Expo).

| Control Family | Implementasi |
|---|---|
| **MASVS-STORAGE** | Token di Keychain (iOS) / Keystore (Android) hanya. No plain `AsyncStorage`. Encrypted DB (`react-native-mmkv` dengan encryption key di Keystore) untuk cache offline |
| **MASVS-CRYPTO** | TLS 1.3, no custom crypto, gunakan platform CryptoAPI |
| **MASVS-AUTH** | Biometric unlock (FaceID/TouchID/fingerprint) opsional untuk app launch, mandatory untuk Pro+ |
| **MASVS-NETWORK** | Cert pinning (SPKI hash), no cleartext (`NSAllowsArbitraryLoads` = false, Android `cleartextTrafficPermitted=false`) |
| **MASVS-PLATFORM** | No exported component yang sensitif, no JS bridge expose ke webview untrusted |
| **MASVS-CODE** | Code obfuscation (Hermes + ProGuard/R8), strip debug symbol di release |
| **MASVS-RESILIENCE** | Jailbreak/root detection (block atau warn), debugger detection, anti-tamper checksum |
| **MASVS-PRIVACY** | Minimal permission, no background tracking, ATT prompt iOS |

### 16.2 App Integrity

- **Android:** Play Integrity API verify (device + app integrity verdict) saat sensitive operation (payment, MFA).
- **iOS:** App Attest + DeviceCheck token attached ke request → verifikasi server-side.

### 16.3 Screen Recording / Screenshot Protection

- Halaman portfolio, payment, MFA setup → flag `FLAG_SECURE` Android, `isScreenCaptureProtected` iOS (modern).
- App switcher overlay: blur konten saat di background.

### 16.4 Deep Link Validation

- Validate scheme + host whitelist.
- Anti-redirect open-redirect via deep link param.
- Universal Links / App Links signed (verifikasi `apple-app-site-association` & `assetlinks.json`).

### 16.5 Update Channel

- Force minimum version check (saat versi ada vuln Critical) → block app, prompt update.
- Pakai EAS Update (Expo) untuk JS bundle hotfix; signed.

---

## 17. Security Roadmap M0 → M24

### 17.1 M0 – M3 (Foundation, sebelum closed beta)

**Wajib (cannot launch without):**
- [ ] TLS 1.3 + HSTS preload submitted (HSTS preload setelah cert stable)
- [ ] Argon2id password hashing dengan pepper Vault
- [ ] JWT design (RS256 + refresh family) implementasi
- [ ] Email + Google/Apple OAuth dengan PKCE/state/nonce
- [ ] TOTP MFA enrollment flow (opsional di UI, mandatory backend support)
- [ ] AWS KMS CMK + envelope encryption untuk PII fields (NIK, alamat, HP)
- [ ] Secret manager (AWS Secrets Manager atau Vault) — zero plaintext secret di repo
- [ ] Gitleaks pre-commit + TruffleHog CI + GitHub secret scanning enabled
- [ ] Cloudflare WAF managed rules + rate limit dasar
- [ ] Security headers (CSP report-only, HSTS, COOP/COEP, etc) di gateway
- [ ] OWASP Top 10 mitigation per kategori (Section 3.1)
- [ ] Parameterized query lint + ORM safe mode
- [ ] Dependency scan (Snyk atau Trivy + Dependabot) di CI
- [ ] Audit log skeleton (auth + admin action) — append-only Postgres
- [ ] Backup encrypted + daily snapshot RDS dengan PITR
- [ ] Incident Response Plan dokumentasi (template SEV1–SEV4)
- [ ] Privacy policy + Terms of Service (legal reviewed)
- [ ] Cookie consent banner (granular)
- [ ] Status page (basic, `status.nubuat.id`)
- [ ] Webhook signature verification Midtrans/Xendit
- [ ] Disclaimer wajib di setiap rekomendasi/AI output

### 17.2 M3 – M6 (Hardening, pre-public-launch)

- [ ] MFA wajib di-rollout (default-on Starter, mandatory Pro+)
- [ ] WAF managed rule tuning + bot management aktif
- [ ] CSP enforce (dari report-only ke enforce)
- [ ] Penetration test #1 (USD 10–15k)
- [ ] DPIA untuk AI Copilot + Daily Picks
- [ ] PSE Kemkomdigi registration submitted
- [ ] DPO appointed (atau retained advisor) + publish kontak
- [ ] Data subject request flow + portal
- [ ] Vulnerability management SLA enforced (Critical/High/Medium/Low)
- [ ] Mobile cert pinning (saat mobile app ship)
- [ ] OPA / Casbin policy engine deployed
- [ ] Service mesh (Linkerd) untuk mTLS internal
- [ ] Kubernetes Pod Security Admission `restricted`
- [ ] NetworkPolicy default-deny
- [ ] SBOM CycloneDX di-attach ke release
- [ ] Cyber insurance quote + bind
- [ ] Audit log tamper-evident (S3 Object Lock + hash chain)

### 17.3 M6 – M12 (Compliance Readiness)

- [ ] SOC 2 Type I readiness (Vanta/Drata onboarded)
- [ ] ISO 27001 control mapping & Statement of Applicability
- [ ] Bug bounty private (HackerOne invitation, USD 5–10k/tahun)
- [ ] OJK Penasihat Investasi filing (M9 target)
- [ ] Penetration test #2 (annual)
- [ ] DR drill (quarterly DB restore done)
- [ ] JIT prod access tooling (AWS IAM Identity Center temporary permission)
- [ ] SPIFFE/SPIRE workload identity (atau service mesh certs sufficient)
- [ ] Field-level encryption complete untuk semua restricted PII
- [ ] SLSA Level 2 build provenance
- [ ] Vendor reassessment annual cycle
- [ ] Red team tabletop exercise

### 17.4 M12 – M24 (Audit & Maturity)

- [ ] SOC 2 Type II audit (USD 30–80k, window 6–12 bulan)
- [ ] Bug bounty public (USD 20–50k/tahun)
- [ ] Red team exercise (annual, USD 30–60k)
- [ ] ISO 27001 certification (opsional, USD 30–60k)
- [ ] SLSA Level 3 build (hermetic)
- [ ] Multi-region warm standby (DR upgrade)
- [ ] Lisensi OJK Penasihat Investasi diharapkan terbit (M12) → update product
- [ ] Mobile pentest (OWASP MASVS) khusus
- [ ] Continuous compliance monitoring (Vanta/Drata stable)

### 17.5 Estimasi Cost Summary

| Item | Cadence | Cost (USD) |
|---|---|---|
| Pentest annual | Tahunan | 15–25k |
| Pentest pre-launch | M3 sekali | 10–15k |
| Bug bounty private | Tahunan M6+ | 5–10k + payout 10–20k |
| Bug bounty public | Tahunan M12+ | 20–50k incl payout |
| Red team | Tahunan M12+ | 30–60k |
| SOC 2 Type I audit | Sekali M12 | 15–30k |
| SOC 2 Type II audit | Tahunan M18+ | 30–80k |
| ISO 27001 (opsional) | Sekali M24 | 30–60k |
| Vanta / Drata | Tahunan | 15–25k |
| Cyber insurance | Tahunan M6+ | 8–20k |
| Vault Enterprise / Secrets Manager | Tahunan | 2–6k |
| DPO retainer | Tahunan | 24–60k |
| Legal counsel (PDP + pasar modal) | Tahunan | 15–40k |
| Lisensi OJK Penasihat Investasi | Sekali M9–M12 | 50–150k |
| **Total Y1 (M0–M12)** | | **150–300k** |
| **Total Y2 (M12–M24)** | | **200–450k** |

---

## 18. Lampiran

### 18.1 Glossary

- **STRIDE** — Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege.
- **BOLA** — Broken Object Level Authorization (akses data orang lain via manipulasi ID).
- **SSRF** — Server-Side Request Forgery.
- **PKCE** — Proof Key for Code Exchange (OAuth).
- **OPA** — Open Policy Agent.
- **SPIFFE/SPIRE** — Secure Production Identity Framework / Runtime Environment.
- **SCC** — Standard Contractual Clauses untuk cross-border data transfer.
- **DPIA** — Data Protection Impact Assessment.
- **DPO** — Data Protection Officer.
- **PJK** — Penyedia Jasa Keuangan (regime AML).
- **PSE** — Penyelenggara Sistem Elektronik (Kemkomdigi registration).
- **SAQ-A** — Self-Assessment Questionnaire A (PCI DSS, merchant outsourced).
- **SBOM** — Software Bill of Materials.
- **SLSA** — Supply-chain Levels for Software Artifacts.
- **MASVS** — Mobile Application Security Verification Standard (OWASP).
- **PSAA** — Pod Security Admission (Kubernetes).
- **WORM** — Write Once Read Many (immutable storage).

### 18.2 Referensi Regulasi & Standar

- **UU 27/2022** — Pelindungan Data Pribadi (Indonesia)
- **Keputusan Ketua Bapepam Nomor V.C.1** — Perizinan Penasihat Investasi
- **SEOJK 7/SEOJK.04/2017** — Permohonan perizinan elektronik
- **POJK 32/2025** — Fintech payment regulation
- **POJK 31/2020** — Iklan produk jasa keuangan
- **PP 80/2019** — Perdagangan Melalui Sistem Elektronik
- **Permenkominfo 5/2020** — PSE Lingkup Privat
- **NIST SP 800-63B** — Digital Identity Guidelines
- **NIST SP 800-53** — Security & Privacy Controls
- **OWASP ASVS 4.0** — Application Security Verification Standard
- **OWASP API Security Top 10 (2023)**
- **OWASP MASVS** — Mobile
- **PCI DSS v4.0**
- **SOC 2 Trust Service Criteria 2017 (rev 2022)**
- **ISO/IEC 27001:2022**
- **ISO/IEC 27701:2019** — Privacy extension
- **CIS Benchmarks** — Kubernetes, AWS, Linux

### 18.3 Document Control

| Version | Date | Author | Change |
|---|---|---|---|
| v0.1 | 2026-05-11 | dobeon.com@gmail.com | Initial baseline |

**Review cadence:** kuartalan; trigger review out-of-band saat ada incident SEV1, perubahan regulasi major, atau perubahan arsitektur material.

**Approval chain (M3 launch):**
- DPO sign-off (privacy sections)
- Tech Lead sign-off (technical controls)
- Founder/CEO sign-off (overall)
- Legal counsel sign-off (pasar modal + PDP)

---

*Dokumen ini adalah baseline keamanan. Setiap kontrol akan didetailkan menjadi runbook, RFC, atau policy terpisah saat eksekusi (mis. `RUNBOOK_INCIDENT_RESPONSE.md`, `POLICY_ACCESS_CONTROL.md`, `STANDARD_ENCRYPTION.md`). Plan ini bersifat hidup — di-update setiap kuartal atau setelah perubahan material.*
