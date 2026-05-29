import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { requireSession } from "@/lib/auth/server";
import { getUserTicket } from "@/lib/support/service";
import { NotFoundError } from "@/lib/errors";
import { cn } from "@/lib/utils/cn";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TicketReplyForm } from "@/components/support/TicketReplyForm";
import { STATUS_META, categoryLabel } from "@/components/support/ticket-meta";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Detail Tiket",
};

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;

  let data: Awaited<ReturnType<typeof getUserTicket>>;
  try {
    data = await getUserTicket(session.userId, id);
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }

  const { ticket, messages } = data;
  const meta = STATUS_META[ticket.status];
  const closed = ticket.status === "resolved" || ticket.status === "closed";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/support"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Kembali ke daftar tiket
        </Link>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div className="space-y-1">
            <CardTitle className="text-lg">{ticket.subject}</CardTitle>
            <p className="text-xs text-muted-foreground">
              {categoryLabel(ticket.category)} ·{" "}
              {new Date(ticket.createdAt).toLocaleDateString("id-ID", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
          <Badge variant={meta.variant} className="shrink-0">
            {meta.label}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-3">
            {messages.map((m) => {
              const isUser = m.authorRole === "user";
              return (
                <li
                  key={m.id}
                  className={cn("flex", isUser ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                      isUser
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground",
                    )}
                  >
                    <p className="mb-1 text-[10px] font-medium uppercase tracking-wider opacity-70">
                      {isUser ? "Kamu" : "Tim Support"}
                    </p>
                    <p className="whitespace-pre-wrap break-words">
                      {m.content}
                    </p>
                    <p className="mt-1 text-[10px] opacity-60">
                      {new Date(m.createdAt).toLocaleString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="border-t pt-4">
            <TicketReplyForm ticketId={ticket.id} disabled={closed} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
