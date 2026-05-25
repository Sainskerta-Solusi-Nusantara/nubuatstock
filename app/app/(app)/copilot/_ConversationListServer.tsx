"use client";

import { useRouter } from "next/navigation";
import { ConversationList } from "@/components/ai/ConversationList";
import type { AiConversation } from "@/lib/types/ai";

interface Props {
  items: AiConversation[];
  activeId: string | null;
}

export function ConversationListServer({ items, activeId }: Props) {
  const router = useRouter();
  return (
    <ConversationList
      items={items.map((c) => ({
        id: c.id,
        title: c.title,
        contextKode: c.contextKode,
        isPinned: c.isPinned,
        isArchived: c.isArchived,
        lastMessageAt: c.lastMessageAt ? c.lastMessageAt.toISOString() : null,
        messageCount: c.messageCount,
        createdAt: c.createdAt.toISOString(),
      }))}
      activeId={activeId}
      onNewChat={() => router.push("/copilot")}
    />
  );
}
