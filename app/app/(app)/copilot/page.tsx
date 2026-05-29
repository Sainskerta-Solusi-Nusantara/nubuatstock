import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { aiConversations } from "@/db/schema/ai";
import { requireSession } from "@/lib/auth";
import { hasSecret, getConfig } from "@/lib/config";
import { ConversationListServer } from "./_ConversationListServer";
import { ChatPanel } from "@/components/ai/ChatPanel";
import { NotConfigured } from "@/components/ai/NotConfigured";
import { MobileConversationDrawer } from "@/components/ai/MobileConversationDrawer";
import { Pagination } from "@/components/ui/pagination";
import { CopilotDisclaimerFooter } from "./_DisclaimerFooter";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

/**
 * /copilot — chat utama tanpa conversation dipilih (start new).
 */
export default async function CopilotPage({ searchParams }: PageProps) {
  const session = await requireSession();

  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const provider = await getConfig<string>("ai.provider");
  const configured = await hasSecret(`ai.${provider}.api_key`);

  const whereClause = and(
    eq(aiConversations.userId, session.user.id),
    eq(aiConversations.isArchived, false),
  );

  const [recent, countRows] = await Promise.all([
    db
      .select()
      .from(aiConversations)
      .where(whereClause)
      .orderBy(desc(aiConversations.isPinned), desc(aiConversations.lastMessageAt))
      .limit(PAGE_SIZE)
      .offset(offset),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(aiConversations)
      .where(whereClause),
  ]);

  const total = countRows[0]?.n ?? 0;

  const disclaimer = await getConfig<string>("app.disclaimer_text", { defaultValue: "" });

  return (
    <div className="-mx-4 -mt-4 flex h-[calc(100dvh-9.5rem)] min-w-0 md:mx-0 md:mt-0 md:h-[calc(100dvh-5.5rem)]">
      <div className="hidden w-64 shrink-0 flex-col md:flex">
        <ConversationListServer items={recent} activeId={null} />
        <div className="border-t border-border p-2">
          <Pagination
            currentPage={page}
            totalItems={total}
            pageSize={PAGE_SIZE}
            basePath="/copilot"
          />
        </div>
      </div>
      <main className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2 md:hidden">
          <MobileConversationDrawer>
            <ConversationListServer items={recent} activeId={null} />
          </MobileConversationDrawer>
          <span className="truncate text-sm font-semibold">AI Buddy</span>
        </div>
        {!configured ? (
          <NotConfigured providerKey={`ai.${provider}.api_key`} />
        ) : (
          <ChatPanel conversationId={null} initialMessages={[]} contextKode={null} />
        )}
        <CopilotDisclaimerFooter disclaimer={disclaimer} />
      </main>
    </div>
  );
}
