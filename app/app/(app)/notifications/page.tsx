import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { Bell } from "lucide-react";

import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { notifications } from "@/db/schema/notifications";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";

export const dynamic = "force-dynamic";

const PAGE_LIMIT = 100;

const severityLabel: Record<string, string> = {
  info: "Info",
  success: "Sukses",
  warning: "Peringatan",
  error: "Penting",
};

const severityVariant: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  info: "secondary",
  success: "default",
  warning: "outline",
  error: "destructive",
};

function formatDateTime(d: Date): string {
  return d.toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function NotificationsPage() {
  const session = await requireSession();

  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, session.user.id))
    .orderBy(desc(notifications.id))
    .limit(PAGE_LIMIT);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 md:py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Notifikasi
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Semua pemberitahuan untuk akun kamu, terbaru di atas.
        </p>
      </header>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <Bell className="size-8 text-muted-foreground" aria-hidden />
          <p className="mt-3 text-sm font-medium text-foreground">
            Belum ada notifikasi
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Kami akan memberitahu kamu di sini kalau ada yang penting.
          </p>
        </div>
      ) : (
        <ul className="divide-y rounded-lg border">
          {rows.map((n) => {
            const sev = n.severity ?? "info";
            const inner = (
              <div
                className={cn(
                  "flex items-start gap-3 px-4 py-4 transition-colors",
                  n.linkUrl && "hover:bg-muted/50",
                  !n.isRead && "bg-muted/30",
                )}
              >
                <span
                  className={cn(
                    "mt-1.5 size-2 shrink-0 rounded-full",
                    n.isRead ? "bg-transparent" : "bg-primary",
                  )}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <h2
                      className={cn(
                        "text-sm",
                        n.isRead
                          ? "font-medium text-muted-foreground"
                          : "font-semibold text-foreground",
                      )}
                    >
                      {n.title}
                    </h2>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDateTime(n.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
                    {n.body}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant={severityVariant[sev] ?? "secondary"}>
                      {severityLabel[sev] ?? sev}
                    </Badge>
                    {n.linkUrl ? (
                      <span className="text-xs font-medium text-primary">
                        Buka →
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            );

            return (
              <li key={n.id}>
                {n.linkUrl ? (
                  <Link href={n.linkUrl} className="block">
                    {inner}
                  </Link>
                ) : (
                  inner
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
