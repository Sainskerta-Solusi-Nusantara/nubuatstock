import { NextRequest } from "next/server";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { appConfig } from "@/db/schema/config";
import { getSession } from "@/lib/auth/server";
import { requireSuperadmin } from "@/lib/auth/roles";
import { ok, fail, handleError } from "@/lib/utils/api";
import { invalidateConfigCache } from "@/lib/config";
import { revalidatePath } from "next/cache";
import { auditLog } from "@/lib/observability/audit";
import { VALIDATORS, type LandingConfigKey } from "@/lib/landing/types";

const patchSchema = z.object({
  key: z.string().regex(/^landing\.[a-z][a-z0-9_.]*$/),
  value: z.unknown(),
  scope: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    requireSuperadmin(session);
    const rows = await db
      .select()
      .from(appConfig)
      .where(eq(appConfig.category, "landing"));
    return ok({ entries: rows });
  } catch (err) {
    return handleError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    requireSuperadmin(session);

    const body = await req.json();
    const parsed = patchSchema.parse(body);
    const scope = parsed.scope ?? {};

    // Validate value shape if there's a specific validator for this key
    const validator = VALIDATORS[parsed.key as LandingConfigKey];
    const valueToStore = validator ? validator.parse(parsed.value) : parsed.value;

    // Fetch before for audit diff
    const beforeRows = await db
      .select()
      .from(appConfig)
      .where(and(eq(appConfig.key, parsed.key), eq(appConfig.scope, scope)))
      .limit(1);
    const before = beforeRows[0];

    if (!before) {
      return fail(404, "NOT_FOUND", `Landing config key '${parsed.key}' tidak ditemukan`);
    }

    await db
      .update(appConfig)
      .set({ value: valueToStore, updatedAt: new Date() })
      .where(and(eq(appConfig.key, parsed.key), eq(appConfig.scope, scope)));

    invalidateConfigCache(parsed.key);
    revalidatePath("/");

    await auditLog({
      actorUserId: session!.userId,
      actorRole: String(session!.role ?? ""),
      action: "landing.update",
      targetType: "app_config",
      targetId: before.id,
      before: { value: before.value },
      after: { value: valueToStore },
      metadata: { key: parsed.key, category: "landing" },
    });

    return ok({ key: parsed.key, updated: true });
  } catch (err) {
    return handleError(err);
  }
}
