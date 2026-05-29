"use client";

import * as React from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * Mobile-only drawer wrapper untuk daftar percakapan. Di desktop (md+) list
 * di-render side-by-side oleh page, jadi komponen ini disembunyikan dengan
 * `md:hidden`. Tidak mengubah logika chat — hanya menyajikan ulang daftar
 * percakapan sebagai drawer yang bisa di-toggle.
 */
export function MobileConversationDrawer({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Buka daftar percakapan"
        className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-medium text-foreground transition hover:bg-accent"
      >
        <Menu className="size-4" aria-hidden />
        Percakapan
      </button>

      {open && (
        <div className="fixed inset-0 z-40 flex">
          <button
            type="button"
            aria-label="Tutup daftar percakapan"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/50"
          />
          <div
            className={cn(
              "relative z-10 flex h-full w-72 max-w-[85%] flex-col bg-background shadow-xl",
            )}
          >
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <span className="text-sm font-semibold">Percakapan</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Tutup"
                className="inline-flex size-9 items-center justify-center rounded-md hover:bg-accent"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
            <div
              className="min-h-0 flex-1 overflow-y-auto"
              onClick={() => setOpen(false)}
            >
              {children}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
