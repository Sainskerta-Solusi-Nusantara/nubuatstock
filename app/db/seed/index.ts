import { logger } from "../../lib/logger";
import { seedAiPrompts } from "./ai-prompts";
import { seedConfig } from "./config";
import { seedFeatureFlags } from "./feature-flags";
import { seedNotificationTemplates } from "./notification-templates";
import { seedReference } from "./reference";
import { seedCompanies } from "./companies";
import { mergeCompaniesFromSnapshot } from "./companies-snapshot";
import { seedTiers } from "./tiers";
import { seedLandingContent } from "./landing";
import { seedLegalContent } from "./legal";
import { seedNewsSources } from "./news-sources";

/**
 * Seed orchestrator. Idempotent — aman dijalankan berulang.
 *
 * Setiap agent yang punya seed (reference, companies, tiers, dll) wajib export
 * fungsi `seedXxx()` dan ditambahkan ke list di bawah secara berurutan
 * berdasarkan dependency.
 */
async function main() {
  logger.info("Seeding database...");

  // Order matters: config first, then reference data, then domain data.
  await seedConfig();
  await seedReference(); // Agent 1

  await seedCompanies(); // Agent 2 — static IDX80 metadata lengkap
  await mergeCompaniesFromSnapshot(); // merge ±960 emiten dari snapshot KSEI/Kontan

  // Agents will register their seed here:
  await seedTiers(); // Agent 4
  await seedAiPrompts(); // Agent 7
  await seedFeatureFlags(); // Agent 10
  await seedNotificationTemplates(); // Agent 12
  await seedLandingContent(); // Landing CMS (DB-driven editable by superadmin)
  await seedLegalContent();   // Privacy + ToS + Disclaimer (DB-driven)
  await seedNewsSources();    // RSS feeds: Kontan/Bisnis/CNBC ID/Detik/IQPlus

  logger.info("Seed complete");
  process.exit(0);
}

main().catch((err) => {
  logger.error({ err }, "Seed failed");
  process.exit(1);
});
