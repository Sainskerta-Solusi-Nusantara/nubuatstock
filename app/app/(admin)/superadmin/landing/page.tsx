import { LandingEditor } from "@/components/superadmin/LandingEditor";
import { db } from "@/lib/db";
import { appConfig } from "@/db/schema/config";
import { eq } from "drizzle-orm";
import { LANDING_CONFIG_KEYS } from "@/lib/landing/types";

export const dynamic = "force-dynamic";

interface LandingConfigRow {
  key: string;
  value: unknown;
  type: string;
  description: string | null;
}

export default async function LandingCMSPage() {
  const rows = await db
    .select({
      key: appConfig.key,
      value: appConfig.value,
      type: appConfig.type,
      description: appConfig.description,
    })
    .from(appConfig)
    .where(eq(appConfig.category, "landing"));

  // Order rows according to LANDING_CONFIG_KEYS sequence (so editor section grouping is consistent).
  const orderMap = new Map(LANDING_CONFIG_KEYS.map((k, i) => [k, i]));
  rows.sort((a, b) => (orderMap.get(a.key as never) ?? 999) - (orderMap.get(b.key as never) ?? 999));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Landing Content CMS</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Edit semua text, headline, painpoint, fitur, dan FAQ landing page.
          Perubahan tersimpan ke <code className="rounded bg-secondary px-1 text-xs">app_config</code> dan tampil di
          {" "}<a href="/" className="underline">/</a> dalam ≤60 detik (ISR revalidate).
        </p>
      </div>

      <LandingEditor entries={rows as LandingConfigRow[]} />
    </div>
  );
}
