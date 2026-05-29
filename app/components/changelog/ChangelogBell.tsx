"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  changelogEntries,
  compareVersions,
  latestChangelogVersion,
} from "@/lib/changelog/entries";

const STORAGE_KEY = "nubuat_changelog_seen";

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Bell "Apa yang baru" di navbar. Menampilkan badge dot kalau ada entry
 * changelog yang lebih baru dari versi terakhir yang user lihat
 * (disimpan di localStorage). Saat panel dibuka, "seen" di-set ke versi
 * terbaru sehingga badge hilang.
 */
export function ChangelogBell() {
  const [open, setOpen] = React.useState(false);
  // null = belum dibaca dari localStorage (hindari flicker badge saat SSR/hydrate).
  const [seen, setSeen] = React.useState<string | null>(null);

  React.useEffect(() => {
    try {
      setSeen(window.localStorage.getItem(STORAGE_KEY) ?? "0.0.0");
    } catch {
      setSeen("0.0.0");
    }
  }, []);

  const hasUnseen =
    seen !== null && compareVersions(latestChangelogVersion, seen) > 0;

  const markSeen = React.useCallback(() => {
    setSeen(latestChangelogVersion);
    try {
      window.localStorage.setItem(STORAGE_KEY, latestChangelogVersion);
    } catch {
      // ignore (mis. localStorage diblok) — badge cukup hilang di sesi ini.
    }
  }, []);

  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      setOpen(next);
      if (next) markSeen();
    },
    [markSeen],
  );

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              aria-label={
                hasUnseen ? "Apa yang baru (ada update baru)" : "Apa yang baru"
              }
            >
              <Sparkles className="size-4" aria-hidden />
              {hasUnseen ? (
                <span
                  className="absolute right-1.5 top-1.5 flex size-2"
                  aria-hidden
                >
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-primary" />
                </span>
              ) : null}
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Apa yang baru</TooltipContent>
      </Tooltip>

      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <Sparkles className="size-4 text-primary" aria-hidden />
          <h2 className="text-sm font-semibold text-foreground">Apa yang baru</h2>
        </div>
        <ScrollArea className="max-h-96">
          <ul className="divide-y">
            {changelogEntries.map((entry) => (
              <li key={entry.version} className="px-4 py-3">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-sm font-medium text-foreground">
                    {entry.title}
                  </h3>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDate(entry.date)}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  v{entry.version}
                </p>
                <ul className="mt-2 space-y-1.5">
                  {entry.items.map((item, i) => (
                    <li
                      key={i}
                      className="flex gap-2 text-xs leading-relaxed text-muted-foreground"
                    >
                      <span
                        className="mt-1.5 size-1 shrink-0 rounded-full bg-primary"
                        aria-hidden
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
