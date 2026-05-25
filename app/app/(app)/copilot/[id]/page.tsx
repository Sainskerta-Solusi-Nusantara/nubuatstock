import { notFound } from "next/navigation";
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { aiConversations, aiMessages } from "@/db/schema/ai";
import { requireSession } from "@/lib/auth";
import { hasSecret, getConfig } from "@/lib/config";
import { ConversationListServer } from "../_ConversationListServer";
import { ChatPanel } from "@/components/ai/ChatPanel";
import { NotConfigured } from "@/components/ai/NotConfigured";
import { CopilotDisclaimerFooter } from "../_DisclaimerFooter";
import type { AiMessageDTO } from "@/lib/types/ai";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CopilotConversationPage({ params }: PageProps) {
  const { id } = await params;
  const session = await requireSession();

  const convRows = await db
    .select()
    .from(aiConversations)
    .where(
      and(eq(aiConversations.id, id), eq(aiConversations.userId, session.user.id)),
    )
    .limit(1);
  if (convRows.length === 0) notFound();
  const conv = convRows[0]!;

  const provider = await getConfig<string>("ai.provider");
  const configured = await hasSecret(`ai.${provider}.api_key`);

  const recent = await db
    .select()
    .from(aiConversations)
    .where(
      and(
        eq(aiConversations.userId, session.user.id),
        eq(aiConversations.isArchived, false),
      ),
    )
    .orderBy(desc(aiConversations.isPinned), desc(aiConversations.lastMessageAt))
    .limit(50);

  const msgRows = await db
    .select()
    .from(aiMessages)
    .where(eq(aiMessages.conversationId, id))
    .orderBy(asc(aiMessages.createdAt));

  const initialMessages: AiMessageDTO[] = msgRows.map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    contentFormat: m.contentFormat,
    toolName: m.toolName,
    toolCallId: m.toolCallId,
    createdAt: m.createdAt.toISOString(),
  }));

  const disclaimer = await getConfig<string>("app.disclaimer_text", { defaultValue: "" });

  return (
    <div className="flex h-[calc(100vh-3rem)]">
      <ConversationListServer items={recent} activeId={conv.id} />
      <main className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-2 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {conv.title}
            </span>
            <span className="text-[10px] uppercase tracking-wide text-zinc-500">
              {conv.provider} · {conv.modelUsed}
              {conv.contextKode && <> · konteks {conv.contextKode}</>}
            </span>
          </div>
        </header>
        {!configured ? (
          <NotConfigured providerKey={`ai.${provider}.api_key`} />
        ) : (
          <ChatPanel
            conversationId={conv.id}
            initialMessages={initialMessages}
            contextKode={conv.contextKode}
          />
        )}
        <CopilotDisclaimerFooter disclaimer={disclaimer} />
      </main>
    </div>
  );
}
