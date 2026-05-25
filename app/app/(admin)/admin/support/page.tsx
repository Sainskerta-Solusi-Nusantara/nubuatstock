import Link from "next/link";
import { Inbox, AlertCircle, CheckCircle2, Clock, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { requireAdmin } from "@/lib/auth/server";
import { countTickets, getTicketStats, listTickets } from "@/lib/support/service";
import { cn } from "@/lib/utils/cn";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export const metadata = {
  title: "Support Inbox — Nubuat Admin",
};

const STATUS_CONFIG = {
  open: { label: "Open", bg: "bg-bear-soft text-bear", Icon: AlertCircle },
  in_progress: { label: "In Progress", bg: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300", Icon: Clock },
  waiting_user: { label: "Waiting User", bg: "bg-blue-500/15 text-blue-700 dark:text-blue-300", Icon: MessageSquare },
  resolved: { label: "Resolved", bg: "bg-bull-soft text-bull", Icon: CheckCircle2 },
  closed: { label: "Closed", bg: "bg-muted text-muted-foreground", Icon: CheckCircle2 },
} as const;

const PRIORITY_COLOR = {
  low: "bg-muted text-muted-foreground",
  normal: "bg-primary/10 text-primary",
  high: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  urgent: "bg-bear text-white",
} as const;

interface PageProps {
  searchParams: Promise<{ status?: keyof typeof STATUS_CONFIG; page?: string }>;
}

export default async function AdminSupportPage({ searchParams }: PageProps) {
  await requireAdmin();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const offset = (page - 1) * PAGE_SIZE;
  const [tickets, stats, total] = await Promise.all([
    listTickets({ status: sp.status, limit: PAGE_SIZE, offset }),
    getTicketStats(),
    countTickets({ status: sp.status }),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-2">
          <Inbox className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Support Inbox</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Customer support tickets — kelola pertanyaan, bug report, feature request user.
        </p>
      </header>

      {/* Status stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        <StatCard label="Total" value={stats.total} active={!sp.status} href="/admin/support" />
        <StatCard label="Open" value={stats.open} active={sp.status === "open"} href="/admin/support?status=open" tone="bear" />
        <StatCard label="In Progress" value={stats.in_progress} active={sp.status === "in_progress"} href="/admin/support?status=in_progress" />
        <StatCard label="Waiting User" value={stats.waiting_user} active={sp.status === "waiting_user"} href="/admin/support?status=waiting_user" />
        <StatCard label="Resolved" value={stats.resolved} active={sp.status === "resolved"} href="/admin/support?status=resolved" tone="bull" />
        <StatCard label="Closed" value={stats.closed} active={sp.status === "closed"} href="/admin/support?status=closed" />
      </div>

      {/* Tickets table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Tickets {sp.status ? `(${STATUS_CONFIG[sp.status].label})` : ""}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {tickets.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Tidak ada tickets di filter ini.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="px-3 py-2 text-left">Subject</th>
                    <th className="px-3 py-2 text-left">User</th>
                    <th className="px-3 py-2 text-left">Category</th>
                    <th className="px-3 py-2 text-center">Priority</th>
                    <th className="px-3 py-2 text-center">Status</th>
                    <th className="px-3 py-2 text-right">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {tickets.map((t) => {
                    const statusConfig = STATUS_CONFIG[t.status as keyof typeof STATUS_CONFIG];
                    const SIcon = statusConfig.Icon;
                    return (
                      <tr key={t.id} className="transition hover:bg-accent/40">
                        <td className="px-3 py-2">
                          <Link href={`/admin/support/${t.id}`} className="font-medium hover:underline">
                            {t.subject}
                          </Link>
                          {t.contextUrl && (
                            <div className="text-[10px] text-muted-foreground truncate max-w-md">{t.contextUrl}</div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          <div className="line-clamp-1">{t.userEmail}</div>
                        </td>
                        <td className="px-3 py-2 text-xs">
                          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase">
                            {t.category}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-bold uppercase", PRIORITY_COLOR[t.priority as keyof typeof PRIORITY_COLOR])}>
                            {t.priority}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold", statusConfig.bg)}>
                            <SIcon className="h-3 w-3" />
                            {statusConfig.label}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right text-[10px] text-muted-foreground">
                          {new Date(t.createdAt).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Pagination
        currentPage={page}
        totalItems={total}
        pageSize={PAGE_SIZE}
        basePath="/admin/support"
        searchParams={{ status: sp.status }}
      />
    </div>
  );
}

function StatCard({ label, value, active, href, tone }: { label: string; value: number; active: boolean; href: string; tone?: "bull" | "bear" }) {
  const toneClass = tone === "bull" ? "text-bull" : tone === "bear" ? "text-bear" : "";
  return (
    <Link
      href={href}
      className={cn(
        "rounded-md border p-3 transition",
        active ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/40",
      )}
    >
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("mt-1 font-mono text-2xl font-bold", toneClass)}>{value}</div>
    </Link>
  );
}
