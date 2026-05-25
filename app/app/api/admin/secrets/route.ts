import { asc } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { appSecrets } from "@/db/schema/config";
import { handleError, ok } from "@/lib/utils/api";

/**
 * GET /api/admin/secrets — list slots dengan status configured/not-set.
 * TIDAK return ciphertext / decrypted value.
 */
export async function GET() {
  try {
    await requireAdmin();
    const rows = await db.select().from(appSecrets).orderBy(asc(appSecrets.key));
    return ok(
      rows.map((r) => ({
        id: r.id,
        key: r.key,
        description: r.description,
        isConfigured: !!r.encryptedValue && r.encryptedValue.length > 0,
        keyVersion: r.keyVersion,
        lastRotatedAt: r.lastRotatedAt ? r.lastRotatedAt.toISOString() : null,
      })),
    );
  } catch (err) {
    return handleError(err);
  }
}
