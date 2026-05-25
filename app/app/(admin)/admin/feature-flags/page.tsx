import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { featureFlags } from "@/db/schema/feature-flags";
import { FeatureFlagsManager } from "./manager";

export const dynamic = "force-dynamic";

export default async function AdminFeatureFlagsPage() {
  const rows = await db
    .select()
    .from(featureFlags)
    .orderBy(asc(featureFlags.category), asc(featureFlags.key));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Feature Flags</h1>
        <p className="text-sm text-neutral-500">
          Atur rollout fitur per role/tier/percentage. Override per-user di halaman User Detail.
        </p>
      </header>

      <FeatureFlagsManager
        flags={rows.map((r) => ({
          key: r.key,
          description: r.description,
          category: r.category,
          defaultValue: r.defaultValue,
          rolloutStrategy: r.rolloutStrategy,
          isActive: r.isActive,
          updatedAt: r.updatedAt.toISOString(),
        }))}
      />
    </div>
  );
}
