import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { jsonbT, ulid, ulidRef, withTimestamps } from "./_base";

/**
 * A/B Testing Experiments framework.
 *
 * Workflow:
 *   1. Superadmin define experiment + variants di /superadmin/experiments
 *   2. User di-assign ke variant secara sticky (hash userId + experimentKey)
 *   3. UI code call useExperiment(key) → return variant
 *   4. Metrics tracked via PostHog or audit log untuk analysis
 *
 * Schema:
 *   - experiments: definition (key, variants, traffic %, status)
 *   - experiment_assignments: persistent user → variant mapping
 */

export const experiments = pgTable(
  "experiments",
  {
    id: ulid(),
    /** Key untuk reference di code (mis. "dashboard_morning_brief_v2"). Stable, snake_case. */
    key: text("key").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    /** Variants: [{ key, weight, payload }] — weight 0-100, total = 100 */
    variants: jsonbT<Array<{ key: string; weight: number; payload?: Record<string, unknown> }>>("variants")
      .notNull()
      .default([]),
    /** % traffic exposed ke experiment. < 100 = sisanya control. */
    trafficAllocationPct: integer("traffic_allocation_pct").notNull().default(100),
    status: text("status", { enum: ["draft", "running", "paused", "concluded"] })
      .notNull()
      .default("draft"),
    startedAt: timestamp("started_at", { withTimezone: true, mode: "date" }),
    concludedAt: timestamp("concluded_at", { withTimezone: true, mode: "date" }),
    /** Hypothesis text untuk dokumentasi. */
    hypothesis: text("hypothesis"),
    /** Success metric (mis. "click_through_rate", "trial_to_paid_conversion") */
    primaryMetric: text("primary_metric"),
    ...withTimestamps,
  },
  (t) => [
    uniqueIndex("experiments_key_uq").on(t.key),
    index("experiments_status_idx").on(t.status),
  ],
);

export const experimentAssignments = pgTable(
  "experiment_assignments",
  {
    id: ulid(),
    experimentKey: text("experiment_key").notNull(),
    userId: ulidRef("user_id"),
    variantKey: text("variant_key").notNull(),
    /** Track first exposure */
    assignedAt: timestamp("assigned_at", { withTimezone: true, mode: "date" }).notNull(),
    ...withTimestamps,
  },
  (t) => [
    uniqueIndex("experiment_assignments_uq").on(t.experimentKey, t.userId),
    index("experiment_assignments_user_idx").on(t.userId),
    index("experiment_assignments_exp_variant_idx").on(t.experimentKey, t.variantKey),
  ],
);
