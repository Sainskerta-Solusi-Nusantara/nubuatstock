import Link from "next/link";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UsersRoleEditor } from "@/components/superadmin/UsersRoleEditor";
import { UserTierEditor } from "@/components/superadmin/UserTierEditor";
import { UserRowActions } from "@/components/superadmin/UserRowActions";
import { getSession } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

interface UserRow {
  id: string;
  email: string;
  name: string | null;
  role: string;
  tier: string | null;
  status: string | null;
  phone: string | null;
  telegram: string | null;
  createdAt: Date;
  lastLoginAt: Date | null;
}

const PAGE_SIZE = 25;

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string; role?: string; page?: string }> }) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const roleFilter = sp.role?.trim() ?? "";
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;
  const session = await getSession();
  const selfId = (session as { user?: { id?: string } } | null)?.user?.id ?? null;

  // Best-effort query — kalau tabel users belum ada (DB kosong), tampilkan empty state
  let users: UserRow[] = [];
  let total = 0;
  try {
    const countRows = await db.execute(sql`
      SELECT count(*)::int AS n
      FROM users u
      WHERE (${q} = '' OR u.email ILIKE '%' || ${q} || '%' OR u.name ILIKE '%' || ${q} || '%')
        AND (${roleFilter} = '' OR u.role = ${roleFilter})
        AND u.deleted_at IS NULL
    `);
    total = Number((countRows as unknown as Array<Record<string, unknown>>)[0]?.n ?? 0);

    const rows = await db.execute(sql`
      SELECT u.id, u.email, u.name, u.role, u.phone, u.telegram, u.created_at, u.last_login_at,
             us.tier_kode AS tier, us.status AS status
      FROM users u
      LEFT JOIN user_subscriptions us ON us.user_id = u.id AND us.status IN ('active','trialing')
      WHERE (${q} = '' OR u.email ILIKE '%' || ${q} || '%' OR u.name ILIKE '%' || ${q} || '%')
        AND (${roleFilter} = '' OR u.role = ${roleFilter})
        AND u.deleted_at IS NULL
      ORDER BY u.created_at DESC
      LIMIT ${PAGE_SIZE} OFFSET ${offset}
    `);
    users = (rows as unknown as Array<Record<string, unknown>>).map((r) => ({
      id: String(r.id),
      email: String(r.email),
      name: r.name as string | null,
      role: String(r.role ?? "user"),
      tier: r.tier as string | null,
      status: r.status as string | null,
      phone: (r.phone as string | null) ?? null,
      telegram: (r.telegram as string | null) ?? null,
      createdAt: new Date(String(r.created_at)),
      lastLoginAt: r.last_login_at ? new Date(String(r.last_login_at)) : null,
    }));
  } catch {
    users = [];
    total = 0;
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const buildHref = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (roleFilter) params.set("role", roleFilter);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/superadmin/users?${qs}` : "/superadmin/users";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Users & Roles</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Grant/revoke role admin & superadmin. Setiap perubahan ter-audit di <code className="rounded bg-secondary px-1 text-xs">audit_log</code>.
        </p>
      </div>

      <form className="flex flex-wrap gap-3" method="get">
        <input
          name="q"
          defaultValue={q}
          placeholder="Cari email atau nama..."
          className="h-9 flex-1 min-w-[200px] rounded-md border border-input bg-background px-3 text-sm"
        />
        <select
          name="role"
          defaultValue={roleFilter}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">Semua role</option>
          <option value="user">User</option>
          <option value="admin">Admin</option>
          <option value="superadmin">Super Admin</option>
        </select>
        <button className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:brightness-110">
          Filter
        </button>
      </form>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {total.toLocaleString("id-ID")} user{q || roleFilter ? " (terfilter)" : ""} — halaman {page} dari {totalPages}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {users.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Belum ada user yang cocok. Filter terlalu sempit atau DB masih kosong.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-secondary/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2">Email</th>
                    <th className="px-4 py-2">Nama</th>
                    <th className="px-4 py-2">Role</th>
                    <th className="px-4 py-2">Tier</th>
                    <th className="px-4 py-2">Daftar</th>
                    <th className="px-4 py-2">Last login</th>
                    <th className="px-4 py-2 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-2 font-mono text-xs">{u.email}</td>
                      <td className="px-4 py-2">{u.name ?? "—"}</td>
                      <td className="px-4 py-2">
                        <RoleBadge role={u.role} />
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <UserTierEditor userId={u.id} email={u.email} currentTier={u.tier} />
                          {u.status === "trialing" && (
                            <Badge variant="outline" className="text-[10px] uppercase">
                              trial
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">
                        {u.createdAt.toLocaleDateString("id-ID")}
                      </td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">
                        {u.lastLoginAt ? u.lastLoginAt.toLocaleDateString("id-ID") : "—"}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="inline-flex items-center gap-1">
                          <UsersRoleEditor userId={u.id} email={u.email} currentRole={u.role} />
                          <UserRowActions
                            userId={u.id}
                            email={u.email}
                            name={u.name}
                            whatsapp={u.phone}
                            telegram={u.telegram}
                            isSelf={u.id === selfId}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">
            Menampilkan {users.length} dari {total.toLocaleString("id-ID")} user
          </span>
          <div className="flex items-center gap-2">
            {page > 1 ? (
              <Link
                href={buildHref(page - 1)}
                className="inline-flex h-9 items-center rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent"
              >
                ← Sebelumnya
              </Link>
            ) : (
              <span className="inline-flex h-9 cursor-not-allowed items-center rounded-md border border-input px-3 text-sm font-medium opacity-40">
                ← Sebelumnya
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              {page} / {totalPages}
            </span>
            {page < totalPages ? (
              <Link
                href={buildHref(page + 1)}
                className="inline-flex h-9 items-center rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent"
              >
                Berikutnya →
              </Link>
            ) : (
              <span className="inline-flex h-9 cursor-not-allowed items-center rounded-md border border-input px-3 text-sm font-medium opacity-40">
                Berikutnya →
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const variant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    user: "secondary",
    admin: "default",
    superadmin: "destructive",
  };
  return (
    <Badge variant={variant[role] ?? "secondary"} className="capitalize">
      {role}
    </Badge>
  );
}
