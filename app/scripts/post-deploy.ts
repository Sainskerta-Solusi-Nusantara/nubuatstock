#!/usr/bin/env tsx
/**
 * scripts/post-deploy.ts — langkah DATA setelah deploy ke prod (idempotent, aman).
 *
 * PRASYARAT (jalankan DULU, lihat RELEASE.md):
 *   1. Schema sudah disinkronkan: `npm run db:push` + psql migrations 0000 & 0001.
 *
 * Script ini menjalankan (berurutan, aman diulang):
 *   1. Refresh copy yang berubah (tagline, landing, legal) — hapus key lama lalu
 *      re-seed nilai baru (seed pakai onConflictDoNothing/Update, jadi key lama
 *      tidak tertimpa tanpa hapus dulu).
 *   2. Re-seed tiers (harga kanonik) + glossary (64 istilah).
 *   3. Grandfather: tandai semua user existing emailVerified=true (gate verifikasi
 *      hanya untuk signup BARU; akun lama tidak terkunci).
 *
 * TIDAK termasuk (jalankan terpisah, lihat RELEASE.md):
 *   - Schema migration (db:push + psql) — harus sebelum script ini.
 *   - `npm run logos:sync` — lama (fetch per emiten) + butuh BLOB_READ_WRITE_TOKEN.
 *
 * Jalankan: npx tsx --env-file=.env scripts/post-deploy.ts
 */
import { or, eq, like } from "drizzle-orm";
import { db } from "../lib/db";
import { appConfig } from "../db/schema/config";
import { users } from "../db/schema/auth";
import { seedConfig } from "../db/seed/config";
import { seedLandingContent } from "../db/seed/landing";
import { seedLegalContent } from "../db/seed/legal";
import { seedTiers } from "../db/seed/tiers";
import { seedGlossary } from "../db/seed/glossary";

async function main() {
  console.log("[1/3] Refresh copy (tagline/landing/legal)...");
  await db
    .delete(appConfig)
    .where(
      or(
        eq(appConfig.key, "app.tagline"),
        like(appConfig.key, "landing.%"),
        like(appConfig.key, "legal.%"),
      ),
    );
  await seedConfig();
  await seedLandingContent();
  await seedLegalContent();

  console.log("[2/3] Re-seed tiers + glossary...");
  await seedTiers();
  await seedGlossary();

  console.log("[3/3] Grandfather existing users -> emailVerified=true...");
  await db.update(users).set({ emailVerified: true });

  console.log("✅ post-deploy data steps complete. Next: `npm run logos:sync`.");
  process.exit(0);
}

main().catch((err) => {
  console.error("post-deploy FAILED:", err);
  process.exit(1);
});
