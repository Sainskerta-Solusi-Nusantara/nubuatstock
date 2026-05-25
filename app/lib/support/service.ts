import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { supportMessages, supportTickets } from "@/db/schema/support";

export interface SupportTicketCreate {
  userId: string;
  userEmail: string;
  subject: string;
  initialMessage: string;
  category?: "bug" | "feature_request" | "account" | "billing" | "trading" | "other";
  priority?: "low" | "normal" | "high" | "urgent";
  contextUrl?: string | null;
  metadata?: Record<string, unknown>;
}

export async function createTicket(opts: SupportTicketCreate): Promise<{ id: string }> {
  const [row] = await db
    .insert(supportTickets)
    .values({
      userId: opts.userId,
      userEmail: opts.userEmail,
      subject: opts.subject.slice(0, 200),
      category: opts.category ?? "other",
      priority: opts.priority ?? "normal",
      contextUrl: opts.contextUrl,
      metadata: opts.metadata,
    })
    .returning({ id: supportTickets.id });

  if (!row) throw new Error("Failed to create ticket");

  // First message (user's initial inquiry)
  await db.insert(supportMessages).values({
    ticketId: row.id,
    authorUserId: opts.userId,
    authorRole: "user",
    content: opts.initialMessage,
  });

  return { id: row.id };
}

export async function addMessage(opts: {
  ticketId: string;
  authorUserId: string;
  authorRole: "user" | "admin" | "superadmin" | "system";
  content: string;
  isInternal?: boolean;
}): Promise<void> {
  await db.insert(supportMessages).values({
    ticketId: opts.ticketId,
    authorUserId: opts.authorUserId,
    authorRole: opts.authorRole,
    content: opts.content,
    isInternal: opts.isInternal ? "true" : "false",
  });

  // Auto-update ticket state
  if (opts.authorRole === "admin" || opts.authorRole === "superadmin") {
    await db
      .update(supportTickets)
      .set({
        status: "waiting_user",
        firstRepliedAt: sql`coalesce(${supportTickets.firstRepliedAt}, now())`,
        updatedAt: new Date(),
      })
      .where(eq(supportTickets.id, opts.ticketId));
  } else if (opts.authorRole === "user") {
    await db
      .update(supportTickets)
      .set({ status: "open", updatedAt: new Date() })
      .where(eq(supportTickets.id, opts.ticketId));
  }
}

export async function listTickets(opts: {
  status?: "open" | "in_progress" | "waiting_user" | "resolved" | "closed";
  limit?: number;
  offset?: number;
} = {}) {
  const conds = [];
  if (opts.status) conds.push(eq(supportTickets.status, opts.status));

  return db
    .select()
    .from(supportTickets)
    .where(conds.length > 0 ? and(...conds) : undefined)
    .orderBy(desc(supportTickets.createdAt))
    .limit(opts.limit ?? 100)
    .offset(Math.max(opts.offset ?? 0, 0));
}

async function countTicketsRaw(opts: {
  status?: "open" | "in_progress" | "waiting_user" | "resolved" | "closed";
} = {}): Promise<number> {
  const conds = [];
  if (opts.status) conds.push(eq(supportTickets.status, opts.status));

  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(supportTickets)
    .where(conds.length > 0 ? and(...conds) : undefined);
  return row?.n ?? 0;
}

export const countTickets = countTicketsRaw;

export async function getTicketWithMessages(ticketId: string) {
  const [ticket] = await db
    .select()
    .from(supportTickets)
    .where(eq(supportTickets.id, ticketId))
    .limit(1);
  if (!ticket) return null;

  const messages = await db
    .select()
    .from(supportMessages)
    .where(eq(supportMessages.ticketId, ticketId))
    .orderBy(supportMessages.createdAt);

  return { ticket, messages };
}

export async function updateStatus(ticketId: string, status: "open" | "in_progress" | "waiting_user" | "resolved" | "closed"): Promise<void> {
  await db
    .update(supportTickets)
    .set({
      status,
      resolvedAt: status === "resolved" || status === "closed" ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(supportTickets.id, ticketId));
}

export async function getTicketStats() {
  const rows = await db
    .select({
      status: supportTickets.status,
      n: sql<number>`count(*)::int`,
    })
    .from(supportTickets)
    .groupBy(supportTickets.status);

  const stats = {
    open: 0,
    in_progress: 0,
    waiting_user: 0,
    resolved: 0,
    closed: 0,
    total: 0,
  };
  for (const r of rows) {
    stats[r.status as keyof typeof stats] = r.n;
    stats.total += r.n;
  }
  return stats;
}
