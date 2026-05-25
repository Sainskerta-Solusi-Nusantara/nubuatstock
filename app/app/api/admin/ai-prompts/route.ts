import { type NextRequest } from "next/server";
import { asc, desc } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { aiPrompts } from "@/db/schema/ai";
import { ADMIN_AUDIT_ACTIONS, createAiPromptInputSchema } from "@/lib/types/admin";
import { handleError, ok } from "@/lib/utils/api";
import { adminAudit } from "../_lib/audit";

export async function GET() {
  try {
    await requireAdmin();
    const rows = await db
      .select()
      .from(aiPrompts)
      .orderBy(asc(aiPrompts.key), desc(aiPrompts.createdAt));
    return ok(rows);
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = createAiPromptInputSchema.parse(await req.json());

    const [inserted] = await db
      .insert(aiPrompts)
      .values({
        key: body.key,
        version: body.version,
        content: body.content,
        variablesJson: body.variablesJson,
        description: body.description ?? null,
        isActive: false,
      })
      .returning();

    await adminAudit({
      actorUserId: session.user.id,
      action: ADMIN_AUDIT_ACTIONS.AI_PROMPT_CREATE,
      targetType: "ai_prompt",
      targetId: `${body.key}@${body.version}`,
      after: { key: body.key, version: body.version, description: body.description ?? null },
    });

    return ok(inserted, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
