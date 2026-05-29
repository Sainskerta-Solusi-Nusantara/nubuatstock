import type { NextRequest } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { aiConversations, aiMessages } from "@/db/schema/ai";
import { NotFoundError } from "@/lib/errors";
import { handleError, ok } from "@/lib/utils/api";
import {
  updateConversationSchema,
  type ConversationDetailDTO,
  type AiMessageDTO,
} from "@/lib/types/ai";

export const runtime = "nodejs";

/**
 * GET /api/ai/conversations/[id] — detail + messages.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSession();
    const { id } = await params;

    const convRows = await db
      .select()
      .from(aiConversations)
      .where(
        and(eq(aiConversations.id, id), eq(aiConversations.userId, session.user.id)),
      )
      .limit(1);
    if (convRows.length === 0) throw new NotFoundError("Conversation");
    const c = convRows[0]!;

    const msgRows = await db
      .select()
      .from(aiMessages)
      .where(eq(aiMessages.conversationId, id))
      .orderBy(asc(aiMessages.createdAt));

    const messages: AiMessageDTO[] = msgRows.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      contentFormat: m.contentFormat,
      toolName: m.toolName,
      toolCallId: m.toolCallId,
      citations: m.citations ?? [],
      createdAt: m.createdAt.toISOString(),
    }));

    const dto: ConversationDetailDTO = {
      id: c.id,
      title: c.title,
      contextKode: c.contextKode,
      isPinned: c.isPinned,
      isArchived: c.isArchived,
      lastMessageAt: c.lastMessageAt ? c.lastMessageAt.toISOString() : null,
      messageCount: c.messageCount,
      createdAt: c.createdAt.toISOString(),
      provider: c.provider,
      modelUsed: c.modelUsed,
      systemPromptVersion: c.systemPromptVersion,
      messages,
    };
    return ok(dto);
  } catch (err) {
    return handleError(err);
  }
}

/**
 * PATCH /api/ai/conversations/[id] — update title / pinned / archived.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const body = updateConversationSchema.parse(await req.json().catch(() => ({})));

    const result = await db
      .update(aiConversations)
      .set({
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.isPinned !== undefined ? { isPinned: body.isPinned } : {}),
        ...(body.isArchived !== undefined ? { isArchived: body.isArchived } : {}),
        updatedAt: new Date(),
      })
      .where(
        and(eq(aiConversations.id, id), eq(aiConversations.userId, session.user.id)),
      )
      .returning();
    if (result.length === 0) throw new NotFoundError("Conversation");
    return ok({ conversation: result[0] });
  } catch (err) {
    return handleError(err);
  }
}

/**
 * DELETE /api/ai/conversations/[id] — soft delete via deletedAt + isArchived.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const result = await db
      .update(aiConversations)
      .set({ deletedAt: new Date(), isArchived: true, updatedAt: new Date() })
      .where(
        and(eq(aiConversations.id, id), eq(aiConversations.userId, session.user.id)),
      )
      .returning({ id: aiConversations.id });
    if (result.length === 0) throw new NotFoundError("Conversation");
    return ok({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
