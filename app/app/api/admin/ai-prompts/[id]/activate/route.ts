import { and, eq, ne } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { aiPrompts } from "@/db/schema/ai";
import { appConfig } from "@/db/schema/config";
import { invalidateConfigCache } from "@/lib/config";
import { ADMIN_AUDIT_ACTIONS } from "@/lib/types/admin";
import { NotFoundError } from "@/lib/errors";
import { handleError, ok } from "@/lib/utils/api";
import { adminAudit } from "../../../_lib/audit";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * Activate a specific prompt version:
 *  - set isActive=true untuk row ini
 *  - set isActive=false untuk versi lain di key yang sama
 *  - update app_config `ai.system_prompt_version` ke versi baru
 */
export async function POST(_req: Request, ctx: RouteContext) {
  try {
    const session = await requireAdmin();
    const { id } = await ctx.params;

    const [target] = await db.select().from(aiPrompts).where(eq(aiPrompts.id, id)).limit(1);
    if (!target) throw new NotFoundError("AI prompt");

    await db.transaction(async (tx) => {
      await tx
        .update(aiPrompts)
        .set({ isActive: false, updatedAt: new Date() })
        .where(and(eq(aiPrompts.key, target.key), ne(aiPrompts.id, target.id)));
      await tx
        .update(aiPrompts)
        .set({ isActive: true, updatedAt: new Date() })
        .where(eq(aiPrompts.id, target.id));

      // Sinkronisasi pointer di app_config: hanya untuk key system.copilot.default → update
      // pointer global. Untuk key lain, biarkan agent yang relevan baca dari ai_prompts directly.
      if (target.key === "system.copilot.default") {
        await tx
          .update(appConfig)
          .set({ value: target.version, updatedAt: new Date() })
          .where(eq(appConfig.key, "ai.system_prompt_version"));
      }
    });

    invalidateConfigCache("ai.system_prompt_version");

    await adminAudit({
      actorUserId: session.user.id,
      action: ADMIN_AUDIT_ACTIONS.AI_PROMPT_ACTIVATE,
      targetType: "ai_prompt",
      targetId: `${target.key}@${target.version}`,
      after: { key: target.key, version: target.version },
    });

    return ok({ id: target.id, key: target.key, version: target.version, isActive: true });
  } catch (err) {
    return handleError(err);
  }
}
