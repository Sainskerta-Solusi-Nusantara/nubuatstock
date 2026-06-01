import Link from "next/link";
import { ShieldAlert, MessageSquare, Ban, AlertTriangle } from "lucide-react";
import {
  getModerationStats,
  listFlaggedMessages,
  listConversations,
} from "@/lib/superadmin/moderation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

const RISK_BADGE: Record<string, { label: string; cls: string }> = {
  high: { label: "HIGH", cls: "bg-bear/15 text-bear" },
  medium: { label: "MEDIUM", cls: "bg-amber-500/15 text-amber-600" },
  low: { label: "LOW", cls: "bg-muted text-muted-foreground" },
};

function timeAgo(d: Date | null): string {
  if (!d) return "—";
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "baru saja";
  if (m < 60) return `${m}m lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}j lalu`;
  return `${Math.floor(h / 24)}h lalu`;
}

export default async function AiModerationPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";

  // Best-effort: kalau kolom moderasi belum ada (DB belum migrasi), empty state.
  let stats = { totalMessages: 0, flaggedTotal: 0, high: 0, medium: 0, low: 0, blocked: 0, last7dFlagged: 0 };
  let flagged: Awaited<ReturnType<typeof listFlaggedMessages>> = [];
  let conversations: Awaited<ReturnType<typeof listConversations>> = [];
  let dbError = false;
  try {
    [stats, flagged, conversations] = await Promise.all([
      getModerationStats(),
      listFlaggedMessages(80),
      listConversations({ q, limit: 100 }),
    ]);
  } catch {
    dbError = true;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <ShieldAlert className="h-7 w-7 text-bear" />
          AI Moderation
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pantau percakapan user dengan AI Buddy, percobaan prompt-injection/jailbreak, dan
          konten menyimpang. Akses penuh isi chat — gunakan secara bertanggung jawab (privasi user).
        </p>
      </div>

      {dbError && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-700">
          Kolom moderasi belum tersedia di database. Jalankan migrasi <code>0012_ai_moderation.sql</code> dulu.
        </div>
      )}

      {/* KPI */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Total pesan user" value={stats.totalMessages.toLocaleString("id-ID")} icon={MessageSquare} />
        <Kpi label="Ter-flag (semua)" value={stats.flaggedTotal.toLocaleString("id-ID")} sub={`${stats.last7dFlagged} dalam 7 hari`} icon={AlertTriangle} tone={stats.flaggedTotal > 0 ? "amber" : undefined} />
        <Kpi label="Risiko tinggi" value={stats.high.toLocaleString("id-ID")} sub={`${stats.medium} medium · ${stats.low} low`} icon={ShieldAlert} tone={stats.high > 0 ? "bear" : undefined} />
        <Kpi label="Diblokir" value={stats.blocked.toLocaleString("id-ID")} icon={Ban} tone={stats.blocked > 0 ? "bear" : undefined} />
      </div>

      {/* Flagged messages */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Pesan ter-flag (percobaan injection/jailbreak)
            <Badge variant="secondary" className="ml-auto text-[10px]">{flagged.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {flagged.length === 0 ? (
            <Empty>Belum ada pesan yang ter-flag. Bagus — pertahanan bekerja & belum ada percobaan signifikan.</Empty>
          ) : (
            <ul className="divide-y divide-border">
              {flagged.map((m) => {
                const badge = RISK_BADGE[m.injectionRisk ?? "low"] ?? RISK_BADGE.low!;
                return (
                  <li key={m.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={`text-[10px] ${badge.cls}`}>{badge.label}</Badge>
                      {m.blocked && <Badge className="bg-bear/15 text-bear text-[10px]">DIBLOKIR</Badge>}
                      <span className="text-xs text-muted-foreground">{m.userEmail ?? m.userId ?? "—"}</span>
                      <span className="ml-auto text-[11px] text-muted-foreground">{timeAgo(m.createdAt)}</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm">{m.content}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                      <span>{m.flagReasons.join(", ") || "—"}</span>
                      <Link href={`/superadmin/ai-moderation/${m.conversationId}`} className="ml-auto text-primary hover:underline">
                        Buka percakapan →
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* All conversations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            Semua percakapan
          </CardTitle>
          <form method="get" className="mt-2">
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Cari email, nama, atau judul percakapan…"
              className="h-9 w-full max-w-sm rounded-md border border-input bg-background px-3 text-sm"
            />
          </form>
        </CardHeader>
        <CardContent>
          {conversations.length === 0 ? (
            <Empty>Tidak ada percakapan.</Empty>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="px-2 py-2 text-left">User</th>
                    <th className="px-2 py-2 text-left">Judul</th>
                    <th className="px-2 py-2 text-center">Pesan</th>
                    <th className="px-2 py-2 text-center">Flag</th>
                    <th className="px-2 py-2 text-center">Risiko</th>
                    <th className="px-2 py-2 text-right">Terakhir</th>
                    <th className="px-2 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {conversations.map((c) => {
                    const badge = c.maxRisk ? RISK_BADGE[c.maxRisk] : null;
                    return (
                      <tr key={c.id} className="border-b border-border/60 hover:bg-accent/40">
                        <td className="px-2 py-2">
                          <div className="font-medium">{c.userName ?? "—"}</div>
                          <div className="text-[11px] text-muted-foreground">{c.userEmail ?? c.userId ?? "—"}</div>
                        </td>
                        <td className="max-w-[220px] truncate px-2 py-2">{c.title ?? "—"}</td>
                        <td className="px-2 py-2 text-center tabular-nums">{c.messageCount}</td>
                        <td className="px-2 py-2 text-center tabular-nums">{c.flaggedCount > 0 ? c.flaggedCount : "—"}</td>
                        <td className="px-2 py-2 text-center">
                          {badge ? <Badge className={`text-[10px] ${badge.cls}`}>{badge.label}</Badge> : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-2 py-2 text-right text-[11px] text-muted-foreground">{timeAgo(c.lastMessageAt)}</td>
                        <td className="px-2 py-2 text-right">
                          <Link href={`/superadmin/ai-moderation/${c.id}`} className="text-primary hover:underline">Buka</Link>
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
    </div>
  );
}

function Kpi({
  label, value, sub, icon: Icon, tone,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "amber" | "bear";
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className={`mt-2 font-mono text-2xl font-bold tabular-nums ${tone === "bear" ? "text-bear" : tone === "amber" ? "text-amber-600" : ""}`}>
          {value}
        </div>
        {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}
