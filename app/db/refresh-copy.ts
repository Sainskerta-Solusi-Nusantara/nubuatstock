/**
 * One-off (DEV LOKAL): hapus key app_config copy yang berubah (tagline + landing
 * + legal) lalu re-seed nilai BARU dari seed file. Diperlukan karena seed pakai
 * onConflictDoNothing — tanpa hapus dulu, nilai lama di DB tidak akan ditimpa.
 * Tidak menyentuh schema (tidak butuh db:push). Tidak menyentuh glossary.
 * Jalankan: npx tsx --env-file=.env db/refresh-copy.ts
 */
import { or, eq, like } from "drizzle-orm";
import { db } from "../lib/db";
import { appConfig } from "./schema/config";
import { seedConfig } from "./seed/config";
import { seedLandingContent } from "./seed/landing";
import { seedLegalContent } from "./seed/legal";

async function main() {
  const del = await db
    .delete(appConfig)
    .where(
      or(
        eq(appConfig.key, "app.tagline"),
        like(appConfig.key, "landing.%"),
        like(appConfig.key, "legal.%"),
      ),
    );
  console.log("[1/2] Deleted stale copy keys (app.tagline, landing.*, legal.*):", del);

  await seedConfig();
  await seedLandingContent();
  await seedLegalContent();
  console.log("[2/2] Re-seeded config + landing + legal with NEW copy.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
