"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import { EmptyState } from "@/components/ui/empty-state";
import { FAQ_CATEGORIES, FAQ_ITEMS, type FaqItem } from "@/lib/help/faq";

type CategoryFilter = "Semua" | (typeof FAQ_CATEGORIES)[number];

const FILTERS: CategoryFilter[] = ["Semua", ...FAQ_CATEGORIES];

function matchesQuery(item: FaqItem, q: string): boolean {
  if (!q) return true;
  const haystack = `${item.question} ${item.answer} ${item.category}`.toLowerCase();
  return haystack.includes(q.toLowerCase());
}

export function HelpCenterView() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("Semua");
  const [openKey, setOpenKey] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim();
    return FAQ_ITEMS.filter(
      (item) =>
        (activeCategory === "Semua" || item.category === activeCategory) &&
        matchesQuery(item, q),
    );
  }, [query, activeCategory]);

  // Group hasil per kategori (mempertahankan urutan FAQ_CATEGORIES).
  const grouped = useMemo(() => {
    const map = new Map<string, FaqItem[]>();
    for (const cat of FAQ_CATEGORIES) {
      const items = filtered.filter((i) => i.category === cat);
      if (items.length > 0) map.set(cat, items);
    }
    return map;
  }, [filtered]);

  return (
    <div className="space-y-5">
      {/* Search */}
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari pertanyaan… (mis. trial, paper trading, refund)"
          aria-label="Cari pertanyaan di Help Center"
          className="w-full rounded-md border border-border bg-background py-2.5 pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className={cn(
              "rounded-full px-3 py-1 text-xs transition",
              activeCategory === cat
                ? "bg-primary text-primary-foreground"
                : "border border-border hover:bg-accent",
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Search className="size-5" />}
          title="Tidak ada hasil"
          description={`Tidak ada FAQ yang cocok dengan "${query}". Coba kata kunci lain, atau hubungi support@nubuat.id.`}
          action={{
            label: "Reset pencarian",
            onClick: () => {
              setQuery("");
              setActiveCategory("Semua");
            },
          }}
        />
      ) : (
        <div className="space-y-6">
          {Array.from(grouped.entries()).map(([cat, items]) => (
            <section key={cat}>
              <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-primary">
                {cat}
              </h2>
              <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                {items.map((item, i) => {
                  const key = `${cat}-${i}`;
                  const isOpen = openKey === key;
                  return (
                    <li key={key}>
                      <button
                        type="button"
                        onClick={() => setOpenKey(isOpen ? null : key)}
                        aria-expanded={isOpen}
                        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-accent"
                      >
                        <span className="text-sm font-medium">
                          {item.question}
                        </span>
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                            isOpen && "rotate-180",
                          )}
                          aria-hidden
                        />
                      </button>
                      {isOpen && (
                        <div className="px-4 pb-4 text-sm leading-relaxed text-muted-foreground">
                          {item.answer}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
