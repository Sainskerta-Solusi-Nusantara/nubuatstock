import { type NextRequest } from "next/server";
import { and, count, desc, eq, gte, ilike, isNull, lte, or, sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { users } from "@/db/schema/auth";
import { userSubscriptions } from "@/db/schema/billing";
import { userListQuerySchema } from "@/lib/types/admin";
import { handleError, ok } from "@/lib/utils/api";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const params = Object.fromEntries(req.nextUrl.searchParams.entries());
    const q = userListQuerySchema.parse(params);

    const filters = [isNull(users.deletedAt)];
    if (q.q) {
      filters.push(or(ilike(users.email, `%${q.q}%`), ilike(users.name, `%${q.q}%`))!);
    }
    if (q.role) filters.push(eq(users.role, q.role));
    if (q.signupFrom) filters.push(gte(users.createdAt, new Date(q.signupFrom)));
    if (q.signupTo) filters.push(lte(users.createdAt, new Date(q.signupTo)));

    const whereClause = and(...filters);
    const offset = (q.page - 1) * q.pageSize;

    const [rows, totalRow] = await Promise.all([
      db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          role: users.role,
          emailVerified: users.emailVerified,
          createdAt: users.createdAt,
          lastLoginAt: users.lastLoginAt,
          lockedUntil: users.lockedUntil,
          tierKode: sql<string | null>`(
            SELECT ${userSubscriptions.tierKode}
            FROM ${userSubscriptions}
            WHERE ${userSubscriptions.userId} = ${users.id}
              AND ${userSubscriptions.status} IN ('active', 'trialing')
            ORDER BY ${userSubscriptions.createdAt} DESC
            LIMIT 1
          )`.as("tier_kode"),
        })
        .from(users)
        .where(whereClause)
        .orderBy(desc(users.createdAt))
        .limit(q.pageSize)
        .offset(offset),
      db
        .select({ n: count() })
        .from(users)
        .where(whereClause)
        .then((r) => r[0]),
    ]);

    const filtered = q.tier ? rows.filter((r) => r.tierKode === q.tier) : rows;

    return ok({
      items: filtered,
      page: q.page,
      pageSize: q.pageSize,
      total: Number(totalRow?.n ?? 0),
    });
  } catch (err) {
    return handleError(err);
  }
}
