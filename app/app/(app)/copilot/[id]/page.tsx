import { notFound } from "next/navigation";
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { aiConversations, aiMessages } from "@/db/schema/ai";
import { requireSession } from "@/lib/auth";
import { getEntitlement } from "@/lib/billing/entitlements";
import { hasSecret, getConfig } from "@/lib/config";
import { ConversationListServer } from "../_ConversationListServer";
import { ChatPanel } from "@/components/ai/ChatPanel";
import { NotConfigured } from "@/components/ai/NotConfigured";
import { MobileConversationDrawer } from "@/components/ai/MobileConversationDrawer";
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
    citations: m.citations ?? [],
    createdAt: m.createdAt.toISOString(),
  }));

  const disclaimer = await getConfig<string>("app.disclaimer_text", { defaultValue: "" });
  const deepModeAvailable =
    (await getEntitlement<boolean>(session.user.id, "feature.ai_deep_mode")) === true;

  return (
    <div className="-mx-4 -mt-4 flex h-[calc(100dvh-9.5rem)] min-w-0 md:mx-0 md:mt-0 md:h-[calc(100dvh-5.5rem)]">
      <div className="hidden w-64 shrink-0 md:flex">
        <ConversationListServer items={recent} activeId={conv.id} />
      </div>
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 border-b border-zinc-200 bg-white px-4 py-2 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="md:hidden">
            <MobileConversationDrawer>
              <ConversationListServer items={recent} activeId={conv.id} />
            </MobileConversationDrawer>
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {conv.title}
            </span>
            <span className="truncate text-[10px] uppercase tracking-wide text-zinc-500">
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
            deepModeAvailable={deepModeAvailable}
          />
        )}
        <CopilotDisclaimerFooter disclaimer={disclaimer} />
      </main>
    </div>
  );
}
