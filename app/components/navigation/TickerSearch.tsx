"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCommandPalette } from "./CommandPaletteProvider";

/**
 * Tombol Search yang sebenarnya membuka Command Palette.
 * Konsisten dengan pola Bloomberg/Linear: single global search entry.
 */
export function TickerSearch() {
  const { setOpen } = useCommandPalette();
  return (
    <Button
      variant="outline"
      size="sm"
      className="w-full justify-between px-3 text-muted-foreground sm:w-72"
      onClick={() => setOpen(true)}
      aria-label="Buka pencarian global (Cmd K)"
    >
      <span className="flex items-center gap-2">
        <Search className="size-4" aria-hidden />
        Cari ticker atau fungsi...
      </span>
      <kbd className="ml-2 hidden items-center gap-0.5 rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] sm:flex">
        <span className="text-xs">⌘</span>K
      </kbd>
    </Button>
  );
}
