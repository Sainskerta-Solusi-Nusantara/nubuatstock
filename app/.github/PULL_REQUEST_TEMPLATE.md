<!--
Gunakan format Conventional Commits untuk judul PR:
  feat: tambah fitur Elliott Wave count untuk emiten LQ45
  fix: perbaiki error 500 di /api/stocks/[symbol]
  chore: bump dependencies mingguan
  docs: update README badges
Tipe lain: refactor, perf, test, build, ci, style, revert
-->

## Summary

<!-- Ringkasan 1-3 kalimat tentang apa yang berubah di PR ini. -->

## Why (Motivation)

<!-- Mengapa perubahan ini dibutuhkan? Tautkan masalah/diskusi terkait jika ada. -->

## What Changed

<!-- Daftar poin perubahan teknis utama. -->
-
-
-

## Test Plan

- [ ] `npm run typecheck` lulus
- [ ] `npm test` (unit) lulus
- [ ] `npm run test:e2e` (jika menyentuh flow user) lulus
- [ ] Smoke test manual di `npm run dev`
- [ ] Verifikasi pada minimal satu tier (Free/Starter/Pro/Elite) jika perubahan menyentuh gating
- [ ] Tidak ada secret/credential ter-commit

## Screenshots / Recordings

<!-- Wajib untuk perubahan UI. Sertakan before/after bila relevan. -->

## Risk Assessment

<!-- Pilih salah satu dan jelaskan singkat -->
- [ ] Low — perubahan kecil, terisolasi, mudah di-rollback
- [ ] Medium — menyentuh beberapa modul atau flow user umum
- [ ] High — perubahan schema DB, migration, billing, auth, atau security

**Mitigasi / rollback plan:**

## Related Issues

<!-- Contoh: Closes #123, Refs #456 -->
