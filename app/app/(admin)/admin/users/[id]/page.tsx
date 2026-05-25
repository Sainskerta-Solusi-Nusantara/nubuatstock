import { desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { users, sessions } from "@/db/schema/auth";
import { userSubscriptions, subscriptionHistory } from "@/db/schema/billing";
import { auditLog } from "@/db/schema/audit";
import { UserActions } from "./actions";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminUserDetailPage({ params }: PageProps) {
  const { id } = await params;
  const [userRow] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!userRow) notFound();

  const [subs, history, recentSessions, recentAudit] = await Promise.all([
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
    db
      .select()
      .from(auditLog)
      .where(eq(auditLog.targetId, id))
      .orderBy(desc(auditLog.createdAt))
      .limit(20),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <Link href="/admin/users" className="text-xs text-neutral-500 hover:underline">
          ← Kembali ke users
        </Link>
        <h1 className="text-2xl font-semibold mt-1">{userRow.email}</h1>
        <div className="flex items-center gap-3 mt-1">
          <span
            className={`text-xs px-2 py-0.5 rounded ${
              userRow.role === "admin"
                ? "bg-amber-100 text-amber-800"
                : "bg-neutral-100 text-neutral-700"
            }`}
          >
            {userRow.role}
          </span>
          {userRow.emailVerified ? (
            <span className="text-xs text-green-700">✓ Verified</span>
          ) : (
            <span className="text-xs text-neutral-500">Unverified</span>
          )}
          {userRow.lockedUntil && userRow.lockedUntil > new Date() ? (
            <span className="text-xs text-red-700">
              Locked sampai {userRow.lockedUntil.toLocaleString("id-ID")}
            </span>
          ) : null}
        </div>
      </header>

      <UserActions
        userId={userRow.id}
        currentRole={userRow.role}
        isLocked={!!userRow.lockedUntil && userRow.lockedUntil > new Date()}
      />

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <h2 className="font-semibold mb-3">Profile</h2>
          <dl className="text-sm grid grid-cols-3 gap-y-1">
            <dt className="text-neutral-500">ID</dt>
            <dd className="col-span-2 font-mono text-xs break-all">{userRow.id}</dd>
            <dt className="text-neutral-500">Nama</dt>
            <dd className="col-span-2">{userRow.name || "—"}</dd>
            <dt className="text-neutral-500">Locale</dt>
            <dd className="col-span-2">{userRow.locale}</dd>
            <dt className="text-neutral-500">Timezone</dt>
            <dd className="col-span-2">{userRow.timezone}</dd>
            <dt className="text-neutral-500">MFA</dt>
            <dd className="col-span-2">{userRow.mfaEnabled ? "Enabled" : "Disabled"}</dd>
            <dt className="text-neutral-500">Signup</dt>
            <dd className="col-span-2">{userRow.createdAt.toLocaleString("id-ID")}</dd>
            <dt className="text-neutral-500">Last login</dt>
            <dd className="col-span-2">
              {userRow.lastLoginAt ? userRow.lastLoginAt.toLocaleString("id-ID") : "—"}
            </dd>
          </dl>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <h2 className="font-semibold mb-3">Subscription</h2>
          {subs.length === 0 ? (
            <p className="text-sm text-neutral-500">Belum ada subscription.</p>
          ) : (
            <ul className="text-sm divide-y divide-neutral-100">
              {subs.map((s) => (
                <li key={s.id} className="py-2">
                  <div className="flex justify-between">
                    <span className="font-medium">{s.tierKode}</span>
                    <span className="text-xs text-neutral-500">{s.status}</span>
                  </div>
                  <div className="text-xs text-neutral-500">
                    {s.billingCycle} · started {s.startedAt.toLocaleDateString("id-ID")}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <h2 className="font-semibold mb-3">Subscription History</h2>
          {history.length === 0 ? (
            <p className="text-sm text-neutral-500">Belum ada history.</p>
          ) : (
            <ul className="text-sm divide-y divide-neutral-100">
              {history.map((h) => (
                <li key={h.id} className="py-2">
                  <div className="flex justify-between">
                    <span>{h.action}</span>
                    <span className="text-xs text-neutral-500">
                      {h.occurredAt.toLocaleString("id-ID")}
                    </span>
                  </div>
                  <div className="text-xs text-neutral-500">
                    {h.fromTierKode ?? "—"} → {h.toTierKode ?? "—"}
                    {h.reason ? ` · ${h.reason}` : ""}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <h2 className="font-semibold mb-3">Recent Sessions</h2>
          {recentSessions.length === 0 ? (
            <p className="text-sm text-neutral-500">Belum ada session.</p>
          ) : (
            <ul className="text-sm divide-y divide-neutral-100">
              {recentSessions.map((s) => (
                <li key={s.id} className="py-2 text-xs">
                  <div className="flex justify-between">
                    <span className="font-mono">{s.ipAddress ?? "—"}</span>
                    <span className="text-neutral-500">
                      {s.lastActiveAt.toLocaleString("id-ID")}
                    </span>
                  </div>
                  <div className="text-neutral-500 truncate">{s.userAgent ?? "—"}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white p-5">
        <h2 className="font-semibold mb-3">Audit Trail</h2>
        {recentAudit.length === 0 ? (
          <p className="text-sm text-neutral-500">Belum ada event audit untuk user ini.</p>
        ) : (
          <ul className="text-sm divide-y divide-neutral-100">
            {recentAudit.map((a) => (
              <li key={a.id} className="py-2">
                <div className="flex justify-between">
                  <span className="font-mono text-xs">{a.action}</span>
                  <span className="text-xs text-neutral-500">
                    {a.createdAt.toLocaleString("id-ID")}
                  </span>
                </div>
                <div className="text-xs text-neutral-500">
                  Actor: {a.actorUserId ?? "system"}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
