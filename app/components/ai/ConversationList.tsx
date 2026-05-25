"use client";

import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import type { ConversationListItemDTO } from "@/lib/types/ai";

interface ConversationListProps {
  items: ConversationListItemDTO[];
  activeId?: string | null;
  onNewChat: () => void;
  loading?: boolean;
}

export function ConversationList({ items, activeId, onNewChat, loading }: ConversationListProps) {
  return (
    <aside className="flex h-full w-64 flex-col border-r border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="border-b border-zinc-200 p-3 dark:border-zinc-800">
        <button
          type="button"
          onClick={onNewChat}
          className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Percakapan Baru
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {loading && <p className="px-2 py-3 text-xs text-zinc-500">Memuat…</p>}
        {!loading && items.length === 0 && (
          <p className="px-2 py-3 text-xs text-zinc-500">
            Belum ada percakapan. Mulai dengan menanyakan analisis saham IDX.
          </p>
        )}
        {items.map((c) => (
          <Link
            key={c.id}
            href={`/copilot/${c.id}`}
            className={cn(
              "block rounded-md px-2 py-2 text-sm",
              c.id === activeId
                ? "bg-blue-100 text-blue-900 dark:bg-blue-950/60 dark:text-blue-200"
                : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900",
            )}
          >
            <div className="flex items-center gap-1.5">
              {c.isPinned && <span aria-label="pinned">⭐</span>}
              <span className="truncate font-medium">{c.title}</span>
            </div>
            {c.contextKode && (
              <div className="mt-0.5 text-[10px] uppercase tracking-wide text-zinc-500">
                {c.contextKode}
              </div>
            )}
          </Link>
        ))}
      </div>
    </aside>
  );
}
