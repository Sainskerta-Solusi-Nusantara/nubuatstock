import { desc, eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { users, sessions } from "@/db/schema/auth";
import { userSubscriptions, subscriptionHistory } from "@/db/schema/billing";
import { NotFoundError } from "@/lib/errors";
import { handleError, ok } from "@/lib/utils/api";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, ctx: RouteContext) {
  try {
    await requireAdmin();
    const { id } = await ctx.params;
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!user) throw new NotFoundError("User");

    const [subs, history, recentSessions] = await Promise.all([
      db
        .select()
        .from(userSubscriptions)
        .where(eq(userSubscriptions.userId, id))
        .orderBy(desc(userSubscriptions.createdAt))
        .limit(10),
      db
        .select()
        .from(subscriptionHistory)
        .where(eq(subscriptionHistory.userId, id))
        .orderBy(desc(subscriptionHistory.occurredAt))
        .limit(20),
      db
        .select()
        .from(sessions)
        .where(eq(sessions.userId, id))
        .orderBy(desc(sessions.lastActiveAt))
        .limit(10),
    ]);

    return ok({ user, subscriptions: subs, history, sessions: recentSessions });
  } catch (err) {
    return handleError(err);
  }
}
