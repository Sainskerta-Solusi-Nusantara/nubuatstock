import { Activity, Sparkles, Target, Bell, AlertCircle, MessageSquare, Ticket, Star } from "lucide-react";
import { getSystemHealth, formatIdr } from "@/lib/superadmin/stats";
import { listFeedback, listAllTickets } from "@/lib/support/service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

const FEEDBACK_LABEL: Record<string, string> = {
  bug: "Bug",
  feature: "Fitur",
  billing: "Billing",
  feedback: "Feedback",
  other: "Lainnya",
};

function timeAgo(d: Date | string | null): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "baru saja";
  if (mins < 60) return `${mins}m lalu`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}j lalu`;
  return `${Math.floor(hrs / 24)}h lalu`;
}

export default async function SuperadminSystemPage() {
  const [system, feedback, tickets] = await Promise.all([
    getSystemHealth(),
    listFeedback(50).catch(() => []),
    listAllTickets(50).catch(() => []),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Health</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Kesehatan sistem, AI burn, serta feedback &amp; tiket dari user.
        </p>
      </div>

      {/* System stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Aktivitas Sistem (24 jam)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat icon={Sparkles} label="AI Queries" value={system.aiQueriesLast24h.toLocaleString("id-ID")} sub={`Cost ${formatIdr(system.aiCostBurnLast24hIdr)}`} />
            <Stat icon={Target} label="Picks (7d)" value={system.picksGeneratedLast7d.toLocaleString("id-ID")} sub="dipublikasikan" />
            <Stat icon={Bell} label="Alerts (24j)" value={system.alertsTriggeredLast24h.toLocaleString("id-ID")} sub="ter-trigger" />
            <Stat icon={AlertCircle} label="Signup belum verif (24j)" value={system.failedSignupsLast24h.toLocaleString("id-ID")} sub="email unverified" tone={system.failedSignupsLast24h > 50 ? "bear" : undefined} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Feedback dari user */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              Feedback User
              <Badge variant="secondary" className="ml-auto text-[10px]">{feedback.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {feedback.length === 0 ? (
              <Empty>Belum ada feedback masuk.</Empty>
            ) : (
              <ul className="divide-y divide-border">
                {feedback.map((f) => (
                  <li key={f.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">{FEEDBACK_LABEL[f.category] ?? f.category}</Badge>
                      {typeof f.rating === "number" && (
                        <span className="flex items-center gap-0.5 text-xs text-amber-500">
                          <Star className="h-3 w-3 fill-current" /> {f.rating}
                        </span>
                      )}
                      <span className="ml-auto text-[11px] text-muted-foreground">{timeAgo(f.createdAt)}</span>
                    </div>
                    <p className="mt-1 text-sm">{f.message}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {f.userEmail ?? "—"}
                      {f.contextUrl ? ` · ${f.contextUrl}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Tiket terbaru */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ticket className="h-4 w-4 text-primary" />
              Tiket Dukungan
              <Badge variant="secondary" className="ml-auto text-[10px]">{tickets.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tickets.length === 0 ? (
              <Empty>Belum ada tiket masuk.</Empty>
            ) : (
              <ul className="divide-y divide-border">
                {tickets.map((t) => (
                  <li key={t.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{t.subject}</span>
                      <Badge
                        variant={t.status === "open" ? "default" : "secondary"}
                        className="ml-auto shrink-0 text-[10px] capitalize"
                      >
                        {t.status}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {t.userEmail ?? "—"} · {t.category} · {t.priority} · {timeAgo(t.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ──────────────── components ──────────────── */

function Stat({
  icon: Icon, label, value, sub, tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub: string;
  tone?: "bull" | "bear";
}) {
  return (
    <div className="rounded-md border border-border bg-background p-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className={`mt-2 font-mono text-xl font-bold tabular-nums ${tone === "bear" ? "text-bear" : tone === "bull" ? "text-bull" : ""}`}>
        {value}
      </div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">{sub}</div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}
