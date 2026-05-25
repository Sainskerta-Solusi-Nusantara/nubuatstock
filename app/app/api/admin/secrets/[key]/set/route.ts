import { type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { appSecrets } from "@/db/schema/config";
import { encryptSecret } from "@/lib/crypto";
import { invalidateConfigCache } from "@/lib/config";
import { ADMIN_AUDIT_ACTIONS, setSecretInputSchema } from "@/lib/types/admin";
import { handleError, ok } from "@/lib/utils/api";
import { adminAudit } from "../../../_lib/audit";

interface RouteContext {
  params: Promise<{ key: string }>;
}

/**
 * POST /api/admin/secrets/[key]/set
 * Body: { value, description? }
 * Encrypt + upsert. NEVER log value.
 */
export async function POST(req: NextRequest, ctx: RouteContext) {
  try {
    const session = await requireAdmin();
    const { key } = await ctx.params;
    const body = setSecretInputSchema.parse(await req.json());

    const encrypted = encryptSecret(body.value);

    const [existing] = await db.select().from(appSecrets).where(eq(appSecrets.key, key)).limit(1);
    const wasConfigured = !!existing?.encryptedValue;

    if (!existing) {
      await db.insert(appSecrets).values({
        key,
        encryptedValue: encrypted,
        description: body.description ?? null,
        lastRotatedAt: new Date(),
      });
    } else {
      await db
        .update(appSecrets)
        .set({
          encryptedValue: encrypted,
          keyVersion: existing.keyVersion + 1,
          lastRotatedAt: new Date(),
          description: body.description ?? existing.description,
          updatedAt: new Date(),
        })
        .where(eq(appSecrets.key, key));
    }

    invalidateConfigCache(key);

    await adminAudit({
      actorUserId: session.user.id,
      action: ADMIN_AUDIT_ACTIONS.SECRET_SET,
      targetType: "app_secret",
      targetId: key,
      // JANGAN log value. Hanya metadata.
      metadata: {
        wasConfigured,
        keyVersion: existing ? existing.keyVersion + 1 : 1,
      },
    });

    return ok({ key, isConfigured: true });
  } catch (err) {
    return handleError(err);
  }
}
