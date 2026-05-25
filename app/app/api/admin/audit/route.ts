import { type NextRequest } from "next/server";
import { and, count, desc, eq, gte, ilike, lte } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { auditLog } from "@/db/schema/audit";
import { auditQuerySchema } from "@/lib/types/admin";
import { handleError, ok } from "@/lib/utils/api";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const q = auditQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams.entries()));

    const filters = [];
    if (q.actor) filters.push(eq(auditLog.actorUserId, q.actor));
    if (q.action) filters.push(ilike(auditLog.action, `%${q.action}%`));
    if (q.targetType) filters.push(eq(auditLog.targetType, q.targetType));
    if (q.targetId) filters.push(eq(auditLog.targetId, q.targetId));
    if (q.from) filters.push(gte(auditLog.createdAt, new Date(q.from)));
    if (q.to) filters.push(lte(auditLog.createdAt, new Date(q.to)));

    const whereClause = filters.length > 0 ? and(...filters) : undefined;
    const offset = (q.page - 1) * q.pageSize;

    const [rows, totalRow] = await Promise.all([
      db
        .select()
        .from(auditLog)
        .where(whereClause)
        .orderBy(desc(auditLog.createdAt))
        .limit(q.pageSize)
        .offset(offset),
      db
        .select({ n: count() })
        .from(auditLog)
        .where(whereClause)
        .then((r) => r[0]),
    ]);

    return ok({
      items: rows,
      page: q.page,
      pageSize: q.pageSize,
      total: Number(totalRow?.n ?? 0),
    });
  } catch (err) {
    return handleError(err);
  }
}
