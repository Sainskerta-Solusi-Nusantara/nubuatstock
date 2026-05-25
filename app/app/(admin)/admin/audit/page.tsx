import Link from "next/link";
import { and, count, desc, eq, gte, ilike, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLog } from "@/db/schema/audit";
import { auditQuerySchema } from "@/lib/types/admin";
import { formatDateTimeId } from "@/lib/utils/datetime";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminAuditPage({ searchParams }: PageProps) {
  const raw = await searchParams;
  const parsed = auditQuerySchema.safeParse(raw);
  const query = parsed.success
    ? parsed.data
    : { page: 1, pageSize: 50 };

  const filters = [];
  if (query.actor) filters.push(eq(auditLog.actorUserId, query.actor));
  if (query.action) filters.push(ilike(auditLog.action, `%${query.action}%`));
  if (query.targetType) filters.push(eq(auditLog.targetType, query.targetType));
  if (query.targetId) filters.push(eq(auditLog.targetId, query.targetId));
  if (query.from) filters.push(gte(auditLog.createdAt, new Date(query.from)));
  if (query.to) filters.push(lte(auditLog.createdAt, new Date(query.to)));

  const whereClause = filters.length > 0 ? and(...filters) : undefined;
  const offset = (query.page - 1) * query.pageSize;

  const [rows, totalRow] = await Promise.all([
    db
      .select()
      .from(auditLog)
      .where(whereClause)
      .orderBy(desc(auditLog.createdAt))
      .limit(query.pageSize)
      .offset(offset),
    db
      .select({ n: count() })
      .from(auditLog)
      .where(whereClause)
      .then((r) => r[0]),
  ]);

  const total = Number(totalRow?.n ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / query.pageSize));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Audit Log</h1>
        <p className="text-sm text-neutral-500">{total.toLocaleString("id-ID")} event total.</p>
      </header>

      <form className="flex flex-wrap gap-2 items-end bg-white rounded-xl border border-neutral-200 p-4">
        <div>
          <label className="text-xs text-neutral-500 block mb-1">Actor ID</label>
          <input
            name="actor"
            defaultValue={query.actor ?? ""}
            className="text-sm border border-neutral-300 rounded px-2 py-1.5 w-48 font-mono"
          />
        </div>
        <div>
          <label className="text-xs text-neutral-500 block mb-1">Action contains</label>
          <input
            name="action"
            defaultValue={query.action ?? ""}
            className="text-sm border border-neutral-300 rounded px-2 py-1.5 w-48"
          />
        </div>
        <div>
          <label className="text-xs text-neutral-500 block mb-1">Target type</label>
          <input
            name="targetType"
            defaultValue={query.targetType ?? ""}
            className="text-sm border border-neutral-300 rounded px-2 py-1.5 w-40"
          />
        </div>
        <div>
          <label className="text-xs text-neutral-500 block mb-1">Target ID</label>
          <input
            name="targetId"
            defaultValue={query.targetId ?? ""}
            className="text-sm border border-neutral-300 rounded px-2 py-1.5 w-40 font-mono"
          />
        </div>
        <div>
          <label className="text-xs text-neutral-500 block mb-1">Dari</label>
          <input
            type="datetime-local"
            name="from"
            defaultValue={query.from ?? ""}
            className="text-sm border border-neutral-300 rounded px-2 py-1.5"
          />
        </div>
        <div>
          <label className="text-xs text-neutral-500 block mb-1">Sampai</label>
          <input
            type="datetime-local"
            name="to"
            defaultValue={query.to ?? ""}
            className="text-sm border border-neutral-300 rounded px-2 py-1.5"
          />
        </div>
        <button
          type="submit"
          className="text-sm px-3 py-1.5 rounded-md bg-neutral-900 text-white"
        >
          Apply
        </button>
      </form>

      <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-neutral-600 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-2">Time</th>
              <th className="text-left px-4 py-2">Action</th>
              <th className="text-left px-4 py-2">Actor</th>
              <th className="text-left px-4 py-2">Target</th>
              <th className="text-left px-4 py-2">OK</th>
              <th className="text-left px-4 py-2">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center text-neutral-500 py-8">
                  Tidak ada event yang cocok.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-2 text-xs">
                    {formatDateTimeId(r.createdAt)}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">{r.action}</td>
                  <td className="px-4 py-2 font-mono text-xs">{r.actorUserId ?? "system"}</td>
                  <td className="px-4 py-2 text-xs">
                    {r.targetType ?? "—"}
                    {r.targetId ? <span className="text-neutral-500"> · {r.targetId}</span> : null}
                  </td>
                  <td className="px-4 py-2 text-xs">
                    {r.success ? (
                      <span className="text-green-700">✓</span>
                    ) : (
                      <span className="text-red-700">✗ {r.errorCode ?? ""}</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-xs font-mono">{r.ip ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={query.page} totalPages={totalPages} query={query} />
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  query,
}: {
  page: number;
  totalPages: number;
  query: { actor?: string; action?: string; targetType?: string; targetId?: string; from?: string; to?: string; pageSize: number };
}) {
  function build(p: number): string {
    const sp = new URLSearchParams();
    sp.set("page", String(p));
    if (query.actor) sp.set("actor", query.actor);
    if (query.action) sp.set("action", query.action);
    if (query.targetType) sp.set("targetType", query.targetType);
    if (query.targetId) sp.set("targetId", query.targetId);
    if (query.from) sp.set("from", query.from);
    if (query.to) sp.set("to", query.to);
    sp.set("pageSize", String(query.pageSize));
    return `?${sp.toString()}`;
  }

  return (
    <div className="flex items-center justify-between text-sm">
      <div className="text-neutral-500">
        Halaman {page} dari {totalPages}
      </div>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link
            href={build(page - 1)}
            className="px-3 py-1.5 rounded-md border border-neutral-300 hover:bg-neutral-50"
          >
            ← Prev
          </Link>
        ) : null}
        {page < totalPages ? (
          <Link
            href={build(page + 1)}
            className="px-3 py-1.5 rounded-md border border-neutral-300 hover:bg-neutral-50"
          >
            Next →
          </Link>
        ) : null}
      </div>
    </div>
  );
}
