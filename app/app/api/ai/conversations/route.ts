import type { NextRequest } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { aiConversations } from "@/db/schema/ai";
import { handleError, ok } from "@/lib/utils/api";
import {
  conversationListQuerySchema,
  createConversationSchema,
  type ConversationListItemDTO,
} from "@/lib/types/ai";
import { loadAiRuntimeConfig } from "@/lib/ai/client";
import { getConfig } from "@/lib/config";

export const runtime = "nodejs";

/**
 * GET /api/ai/conversations — list percakapan user (paginated).
 */
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const url = new URL(req.url);
    const q = conversationListQuerySchema.parse(Object.fromEntries(url.searchParams));

    const conditions = [eq(aiConversations.userId, session.user.id)];
    if (!q.includeArchived) {
      conditions.push(eq(aiConversations.isArchived, false));
    }

    const rows = await db
      .select()
      .from(aiConversations)
      .where(and(...conditions))
      .orderBy(desc(aiConversations.isPinned), desc(aiConversations.lastMessageAt))
      .limit(q.limit)
      .offset(q.offset);

    const items: ConversationListItemDTO[] = rows.map((r) => ({
      id: r.id,
      title: r.title,
      contextKode: r.contextKode,
      isPinned: r.isPinned,
      isArchived: r.isArchived,
      lastMessageAt: r.lastMessageAt ? r.lastMessageAt.toISOString() : null,
      messageCount: r.messageCount,
      createdAt: r.createdAt.toISOString(),
    }));
    return ok({ items, total: items.length });
  } catch (err) {
    return handleError(err);
  }
}

/**
 * POST /api/ai/conversations — buat conversation kosong baru.
 *
 * Biasanya konsumer langsung POST /api/ai/chat (auto-create kalau no conversationId);
 * endpoint ini berguna untuk "New Chat" button yang ingin URL stabil sebelum chat.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = createConversationSchema.parse(await req.json().catch(() => ({})));
    const config = await loadAiRuntimeConfig();
    const promptVersion = await getConfig<string>("ai.system_prompt_version", {
      defaultValue: "v1",
    });

    const [row] = await db
      .insert(aiConversations)
      .values({
        userId: session.user.id,
        title: body.title ?? "Percakapan baru",
        contextKode: body.contextKode ?? null,
        provider: config.provider,
        modelUsed: config.defaultModel,
        systemPromptVersion: promptVersion,
      })
      .returning();
    return ok({ conversation: row });
  } catch (err) {
    return handleError(err);
  }
}
