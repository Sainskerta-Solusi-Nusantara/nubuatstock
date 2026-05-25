import Link from "next/link";
import { and, count, desc, eq, gte, ilike, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/db/schema/auth";
import { userSubscriptions } from "@/db/schema/billing";
import { userListQuerySchema } from "@/lib/types/admin";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminUsersPage({ searchParams }: PageProps) {
  const raw = await searchParams;
  const parsed = userListQuerySchema.safeParse(raw);
  const query = parsed.success
    ? parsed.data
    : { page: 1, pageSize: 25, q: undefined, tier: undefined, role: undefined, active: undefined, signupFrom: undefined, signupTo: undefined };

  const filters = [isNull(users.deletedAt)];
  if (query.q) {
    filters.push(
      or(ilike(users.email, `%${query.q}%`), ilike(users.name, `%${query.q}%`))!,
    );
  }
  if (query.role) {
    filters.push(eq(users.role, query.role));
  }
  if (query.signupFrom) {
    filters.push(gte(users.createdAt, new Date(query.signupFrom)));
  }
  if (query.signupTo) {
    filters.push(lte(users.createdAt, new Date(query.signupTo)));
  }

  const whereClause = and(...filters);

  const offset = (query.page - 1) * query.pageSize;

  const [rows, totalRow] = await Promise.all([
    db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        emailVerified: users.emailVerified,
        lockedUntil: users.lockedUntil,
        createdAt: users.createdAt,
        lastLoginAt: users.lastLoginAt,
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
      .limit(query.pageSize)
      .offset(offset),
    db
      .select({ n: count() })
      .from(users)
      .where(whereClause)
      .then((r) => r[0]),
  ]);

  // Filter by tier post-query (cheaper than nested join for MVP).
  const filteredRows = query.tier ? rows.filter((r) => r.tierKode === query.tier) : rows;
  const total = Number(totalRow?.n ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / query.pageSize));

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Users</h1>
          <p className="text-sm text-neutral-500">
            Total {total.toLocaleString("id-ID")} user (terfilter).
          </p>
        </div>
      </header>

      <form className="flex flex-wrap gap-2 items-end bg-white rounded-xl border border-neutral-200 p-4">
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs text-neutral-500 block mb-1">Search</label>
          <input
            type="search"
            name="q"
            defaultValue={query.q ?? ""}
            placeholder="email / nama"
            className="w-full text-sm border border-neutral-300 rounded px-2 py-1.5"
          />
        </div>
        <div>
          <label className="text-xs text-neutral-500 block mb-1">Role</label>
          <select
            name="role"
            defaultValue={query.role ?? ""}
            className="text-sm border border-neutral-300 rounded px-2 py-1.5"
          >
            <option value="">Semua</option>
            <option value="user">user</option>
            <option value="admin">admin</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-neutral-500 block mb-1">Tier</label>
          <input
            type="text"
            name="tier"
            defaultValue={query.tier ?? ""}
            placeholder="free / starter / pro / elite"
            className="text-sm border border-neutral-300 rounded px-2 py-1.5"
          />
        </div>
        <div>
          <label className="text-xs text-neutral-500 block mb-1">Signup dari</label>
          <input
            type="datetime-local"
            name="signupFrom"
            defaultValue={query.signupFrom ?? ""}
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
              <th className="text-left px-4 py-2">Email</th>
              <th className="text-left px-4 py-2">Name</th>
              <th className="text-left px-4 py-2">Role</th>
              <th className="text-left px-4 py-2">Tier</th>
              <th className="text-left px-4 py-2">Verified</th>
              <th className="text-left px-4 py-2">Locked</th>
              <th className="text-left px-4 py-2">Signup</th>
              <th className="text-left px-4 py-2">Last Login</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center text-neutral-500 py-8">
                  Tidak ada user yang cocok dengan filter.
                </td>
              </tr>
            ) : (
              filteredRows.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-2 font-mono text-xs">{u.email}</td>
                  <td className="px-4 py-2">{u.name || "-"}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        u.role === "admin"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-neutral-100 text-neutral-700"
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-xs">{u.tierKode ?? "—"}</td>
                  <td className="px-4 py-2 text-xs">{u.emailVerified ? "✓" : "—"}</td>
                  <td className="px-4 py-2 text-xs">
                    {u.lockedUntil && u.lockedUntil > new Date() ? "Locked" : "—"}
                  </td>
                  <td className="px-4 py-2 text-xs">
                    {u.createdAt.toLocaleDateString("id-ID")}
                  </td>
                  <td className="px-4 py-2 text-xs">
                    {u.lastLoginAt ? u.lastLoginAt.toLocaleDateString("id-ID") : "—"}
                  </td>
                  <td className="px-4 py-2">
                    <Link
                      href={`/admin/users/${u.id}`}
                      className="text-xs text-neutral-700 hover:underline"
                    >
                      Detail →
                    </Link>
                  </td>
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
  query: { q?: string; role?: string; tier?: string; pageSize: number; signupFrom?: string };
}) {
  function build(p: number): string {
    const sp = new URLSearchParams();
    sp.set("page", String(p));
    if (query.q) sp.set("q", query.q);
    if (query.role) sp.set("role", query.role);
    if (query.tier) sp.set("tier", query.tier);
    if (query.signupFrom) sp.set("signupFrom", query.signupFrom);
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
