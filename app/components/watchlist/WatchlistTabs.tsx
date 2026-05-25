"use client";

import { cn } from "@/lib/utils/cn";
import type { WatchlistView } from "@/lib/types/watchlist";

interface WatchlistTabsProps {
  items: WatchlistView[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew?: () => void;
}

export function WatchlistTabs({ items, activeId, onSelect, onNew }: WatchlistTabsProps) {
  return (
    <div className="flex items-center gap-2 border-b border-border overflow-x-auto">
      {items.map((wl) => {
        const isActive = wl.id === activeId;
        return (
          <button
            key={wl.id}
            type="button"
            onClick={() => onSelect(wl.id)}
            className={cn(
              "relative px-4 py-2 text-sm whitespace-nowrap transition",
              isActive
                ? "text-foreground after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:bg-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <span
              className="inline-block w-2 h-2 rounded-full mr-2 align-middle"
              style={{ backgroundColor: wl.colorHex ?? "transparent" }}
            />
            {wl.name}
            <span className="ml-2 text-xs text-muted-foreground">{wl.itemCount}</span>
          </button>
        );
      })}
      {onNew ? (
        <button
          type="button"
          onClick={onNew}
          className="ml-auto px-3 py-1.5 text-xs rounded-md border border-border hover:bg-accent transition"
        >
          + Watchlist baru
        </button>
      ) : null}
    </div>
  );
}
