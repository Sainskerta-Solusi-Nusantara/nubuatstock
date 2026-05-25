import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { appConfig } from "@/db/schema/config";
import { ConfigEditor } from "./editor";

export const dynamic = "force-dynamic";

export default async function AdminConfigPage() {
  const rows = await db.select().from(appConfig).orderBy(asc(appConfig.category), asc(appConfig.key));

  const grouped = new Map<string, typeof rows>();
  for (const row of rows) {
    const list = grouped.get(row.category) ?? [];
    list.push(row);
    grouped.set(row.category, list);
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">App Config</h1>
        <p className="text-sm text-neutral-500">
          Konfigurasi non-secret. Perubahan berdampak ke seluruh user. Selalu review diff
          sebelum save.
        </p>
      </header>

      <ConfigEditor groups={Array.from(grouped.entries()).map(([category, items]) => ({
        category,
        items: items.map((row) => ({
          id: row.id,
          key: row.key,
          value: row.value,
          type: row.type,
          description: row.description,
          isSensitive: row.isSensitive,
          updatedAt: row.updatedAt.toISOString(),
        })),
      }))} />
    </div>
  );
}
