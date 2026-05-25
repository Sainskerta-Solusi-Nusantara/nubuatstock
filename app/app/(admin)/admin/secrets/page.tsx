import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { appSecrets } from "@/db/schema/config";
import { SecretsManager } from "./manager";

export const dynamic = "force-dynamic";

export default async function AdminSecretsPage() {
  const rows = await db.select().from(appSecrets).orderBy(asc(appSecrets.key));

  const items = rows.map((row) => ({
    id: row.id,
    key: row.key,
    description: row.description,
    isConfigured: !!row.encryptedValue && row.encryptedValue.length > 0,
    keyVersion: row.keyVersion,
    lastRotatedAt: row.lastRotatedAt ? row.lastRotatedAt.toISOString() : null,
  }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Secrets</h1>
        <p className="text-sm text-neutral-500">
          API keys & credentials yang dienkripsi (AES-256-GCM). Nilai TIDAK pernah ditampilkan
          — hanya status "configured" atau "not set". Setiap aksi tercatat di audit log.
        </p>
      </header>

      <SecretsManager items={items} />
    </div>
  );
}
