import Link from "next/link";
import { ArrowLeft, ShieldAlert, Bot, User, Wrench } from "lucide-react";
import { getConversationDetail } from "@/lib/superadmin/moderation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

const RISK_BADGE: Record<string, string> = {
  high: "bg-bear/15 text-bear",
  medium: "bg-amber-500/15 text-amber-600",
  low: "bg-muted text-muted-foreground",
};

export default async function ModerationConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let conversation: Awaited<ReturnType<typeof getConversationDetail>>["conversation"] = null;
  let messages: Awaited<ReturnType<typeof getConversationDetail>>["messages"] = [];
  let dbError = false;
  try {
    const detail = await getConversationDetail(id);
    conversation = detail.conversation;
    messages = detail.messages;
  } catch {
    dbError = true;
  }

  return (
    <div className="space-y-6">
      <Link
        href="/superadmin/ai-moderation"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Kembali ke AI Moderation
      </Link>

      {dbError || !conversation ? (
        <div className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Percakapan tidak ditemukan atau kolom moderasi belum tersedia.
        </div>
      ) : (
        <>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{conversation.title ?? "Percakapan"}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {conversation.userName ?? "—"} · {conversation.userEmail ?? conversation.userId ?? "—"} ·{" "}
              {conversation.messageCount} pesan
            </p>
          </div>

          <Card>
            <CardContent className="space-y-4 p-4">
              {messages.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground">Tidak ada pesan.</p>
              ) : (
                messages.map((m) => {
                  const isUser = m.role === "user";
                  const isTool = m.role === "tool";
                  const Icon = isUser ? User : isTool ? Wrench : Bot;
                  const flagged = m.injectionRisk && m.injectionRisk !== "none";
                  return (
                    <div
                      key={m.id}
                      className={`rounded-lg border p-3 ${
                        flagged ? "border-bear/40 bg-bear/5" : "border-border bg-card"
                      }`}
                    >
                      <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Icon className="size-3.5" />
                        <span className="font-semibold uppercase">{isTool ? `tool: ${m.toolName ?? ""}` : m.role}</span>
                        {flagged && (
                          <Badge className={`text-[10px] ${RISK_BADGE[m.injectionRisk!] ?? RISK_BADGE.low}`}>
                            <ShieldAlert className="mr-1 size-3" />
                            {m.injectionRisk!.toUpperCase()}
                          </Badge>
                        )}
                        {m.blocked && <Badge className="bg-bear/15 text-bear text-[10px]">DIBLOKIR</Badge>}
                        <span className="ml-auto">
                          {m.createdAt.toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap break-words text-sm">
                        {isTool ? <span className="font-mono text-xs text-muted-foreground line-clamp-3">{m.content}</span> : m.content}
                      </p>
                      {flagged && m.flagReasons.length > 0 && (
                        <p className="mt-1.5 text-[11px] text-bear">Pola: {m.flagReasons.join(", ")}</p>
                      )}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
