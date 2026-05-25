import { db } from "../../lib/db";
import { logger } from "../../lib/logger";
import { featureFlags, type NewFeatureFlag } from "../schema/feature-flags";

/**
 * Seed default feature flags. Idempotent (ON CONFLICT key DO NOTHING).
 * Admin mengubah default/rollout strategy via /admin/feature-flags.
 */

const defaults: NewFeatureFlag[] = [
  // ===== UI =====
  {
    key: "ui.dark_mode_default",
    description: "Default tampilan dark mode untuk user baru.",
    category: "ui",
    defaultValue: true,
    rolloutStrategy: { type: "all" },
    isActive: true,
  },
  {
    key: "feature.command_palette",
    description: "Aktifkan command palette (Cmd+K) di shell aplikasi.",
    category: "ui",
    defaultValue: true,
    rolloutStrategy: { type: "all" },
    isActive: true,
  },

  // ===== AI =====
  {
    key: "feature.ai_streaming",
    description: "Aktifkan streaming response untuk AI Copilot.",
    category: "ai",
    defaultValue: true,
    rolloutStrategy: { type: "all" },
    isActive: true,
  },
  {
    key: "feature.deep_research_mode",
    description: "Mode riset mendalam AI (multi-step, lebih banyak token) — beta.",
    category: "ai",
    defaultValue: false,
    rolloutStrategy: { type: "tier_min", value: "pro" },
    isActive: false,
  },

  // ===== Analysis =====
  {
    key: "feature.bandarmology",
    description: "Modul analisis bandarmology (foreign flow, broker summary).",
    category: "analysis",
    defaultValue: true,
    rolloutStrategy: { type: "all" },
    isActive: true,
  },

  // ===== Trading / Strategy =====
  {
    key: "feature.paper_trading",
    description: "Simulasi paper trading dengan portfolio virtual — belum siap.",
    category: "trading",
    defaultValue: false,
    rolloutStrategy: { type: "off" },
    isActive: false,
  },
  {
    key: "feature.strategy_marketplace",
    description: "Marketplace strategi & sharing — roadmap.",
    category: "trading",
    defaultValue: false,
    rolloutStrategy: { type: "off" },
    isActive: false,
  },
];

export async function seedFeatureFlags() {
  logger.info("Seeding feature_flags defaults...");
  for (const flag of defaults) {
    await db.insert(featureFlags).values(flag).onConflictDoNothing({ target: featureFlags.key });
  }
  logger.info(`Seeded ${defaults.length} feature flag entries`);
}
