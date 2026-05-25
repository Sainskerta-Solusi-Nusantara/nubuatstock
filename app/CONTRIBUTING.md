# Contributing to Nubuat

Terima kasih sudah tertarik kontribusi! Sebelum mulai, baca dulu `AGENTS.md`
untuk memahami arsitektur dan boundary tiap module.

## Setup lokal

```bash
nvm use         # pakai versi Node di .nvmrc
npm install
cp .env.example .env  # isi DATABASE_URL, REDIS_URL, APP_MASTER_KEY
npm run db:migrate
npm run db:seed
npm run dev
```

## Workflow

1. Buat branch dari `main`: `git checkout -b feat/nama-fitur`
2. Tulis kode + test. Pre-commit hook auto-run `tsc --noEmit`
3. Commit pakai Conventional Commits: `feat(scope):`, `fix(scope):`, `refactor(scope):`
4. Push & open PR — jelaskan **why** bukan cuma **what** di description
5. Tunggu review dari maintainer

## Coding style

- TypeScript strict mode — no `any`
- Tailwind v4 + shadcn primitives untuk UI
- Server Components by default, client only kalau perlu interactivity
- Drizzle ORM untuk DB; SQL raw cuma di migration script

## Testing

```bash
npm test              # vitest unit tests
npm run e2e           # Playwright end-to-end
npm exec tsc --noEmit # type check
```

## Reporting bugs

Open GitHub issue dengan reproduce steps + expected vs actual behavior.
