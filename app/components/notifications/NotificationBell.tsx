"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { Bell, CheckCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils/cn";

const POLL_MS = 60_000;
const DROPDOWN_LIMIT = 10;

interface FeedItem {
  id: string;
  title: string;
  body: string;
  linkUrl: string | null;
  severity: "info" | "success" | "warning" | "error";
  isRead: boolean;
  createdAt: string;
}

interface FeedResponse {
  items: FeedItem[];
  unreadCount: number;
}

/**
 * Unwrap envelope `{ ok: true, data }` dari helper `ok()` (lib/utils/api).
 * Aman juga kalau payload sudah mentah (defensif).
 */
function unwrap<T>(raw: unknown): T {
  if (raw && typeof raw === "object" && "data" in (raw as Record<string, unknown>)) {
    const inner = (raw as { data: unknown }).data;
    if (inner && typeof inner === "object") return inner as T;
  }
  return raw as T;
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const sec = Math.round((Date.now() - then) / 1000);
  if (sec < 60) return "baru saja";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} menit lalu`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} jam lalu`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day} hari lalu`;
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  });
}

const severityDot: Record<FeedItem["severity"], string> = {
  info: "bg-primary",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  error: "bg-red-500",
};

/**
 * Lonceng notifikasi in-app. Fetch /api/notifications/list saat mount + polling
 * ~60s untuk badge unread. Dropdown menampilkan 10 notifikasi terbaru; klik item
 * menandai read + navigate ke linkUrl. Ada tombol "Tandai semua dibaca".
 */
export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState<FeedItem[]>([]);
  const [unread, setUnread] = React.useState(0);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/list", {
        cache: "no-store",
        credentials: "same-origin",
      });
      if (!res.ok) return;
      const data = unwrap<FeedResponse>((await res.json()) as unknown);
      if (Array.isArray(data?.items)) setItems(data.items);
      if (typeof data?.unreadCount === "number") setUnread(data.unreadCount);
    } catch {
      // jaringan gagal — pertahankan state lama, jangan crash.
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), POLL_MS);
    return () => window.clearInterval(id);
  }, [load]);

  // Refresh saat dropdown dibuka.
  React.useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const markAllRead = React.useCallback(async () => {
    setItems((prev) => prev.map((it) => ({ ...it, isRead: true })));
    setUnread(0);
    try {
      await fetch("/api/notifications/mark-all-read", {
        method: "POST",
        credentials: "same-origin",
      });
    } catch {
      // ignore — load() berikutnya rekonsiliasi.
    }
    void load();
  }, [load]);

  const handleItemClick = React.useCallback(
    async (item: FeedItem) => {
      setOpen(false);
      if (!item.isRead) {
        setItems((prev) =>
          prev.map((it) => (it.id === item.id ? { ...it, isRead: true } : it)),
        );
        setUnread((c) => Math.max(0, c - 1));
        try {
          await fetch(`/api/notifications/${item.id}/read`, {
            method: "POST",
            credentials: "same-origin",
          });
        } catch {
          // ignore
        }
      }
      if (item.linkUrl) router.push(item.linkUrl);
    },
    [router],
  );

  const shown = items.slice(0, DROPDOWN_LIMIT);
  const badge = unread > 9 ? "9+" : String(unread);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              aria-label={
                unread > 0 ? `Notifikasi (${unread} belum dibaca)` : "Notifikasi"
              }
            >
              <Bell className="size-4" aria-hidden />
              {unread > 0 ? (
                <span
                  className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-4 text-primary-foreground"
                  aria-hidden
                >
                  {badge}
                </span>
              ) : null}
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Notifikasi</TooltipContent>
      </Tooltip>

      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">Notifikasi</h2>
          {unread > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs"
              onClick={() => void markAllRead()}
            >
              <CheckCheck className="size-3.5" aria-hidden />
              Tandai semua dibaca
            </Button>
          ) : null}
        </div>

        <ScrollArea className="max-h-96">
          {loading && shown.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              Memuat…
            </p>
          ) : shown.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              Belum ada notifikasi.
            </p>
          ) : (
            <ul className="divide-y">
              {shown.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => void handleItemClick(item)}
                    className={cn(
                      "flex w-full items-start gap-2.5 px-4 py-3 text-left transition-colors hover:bg-muted/50",
                      !item.isRead && "bg-muted/30",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-1.5 size-2 shrink-0 rounded-full",
                        item.isRead ? "bg-transparent" : severityDot[item.severity],
                      )}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span
                          className={cn(
                            "truncate text-sm",
                            item.isRead
                              ? "font-medium text-muted-foreground"
                              : "font-semibold text-foreground",
                          )}
                        >
                          {item.title}
                        </span>
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {relativeTime(item.createdAt)}
                        </span>
                      </span>
                      <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">
                        {item.body}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>

        <div className="border-t px-4 py-2">
          <Link
            href="/notifications"
            className="block py-1 text-center text-xs font-medium text-primary hover:underline"
            onClick={() => setOpen(false)}
          >
            Lihat semua
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
