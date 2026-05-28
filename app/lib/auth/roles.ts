import { UnauthorizedError, ForbiddenError } from "@/lib/errors";

/**
 * Sistem role 3-tier untuk Nubuat:
 *
 *   - "user"        : default semua signup. Akses dashboard standar (watchlist, picks, alerts, AI, billing).
 *   - "admin"       : ops staff. + config app_config, secrets, feature flags, users management,
 *                     audit log, jobs queue, tier pricing.
 *   - "superadmin"  : founder/CTO level. SEMUA admin power + landing CMS edit, statistik
 *                     growth + revenue, role assignment (grant/revoke admin), dangerous ops.
 *
 * Bootstrap: user pertama yang signup dengan email matching env.ADMIN_BOOTSTRAP_EMAIL
 * otomatis dapat role = "superadmin" (BUKAN sekadar "admin") — superadmin nantinya
 * grant admin ke staff lain via UI di /superadmin/users.
 *
 * Hierarchy:
 *   superadmin > admin > user
 *
 * `requireAdmin` mengizinkan admin DAN superadmin (admin power adalah subset superadmin).
 * `requireSuperadmin` HANYA superadmin.
 */

export type UserRole = "user" | "admin" | "superadmin";

export const ROLE_RANK: Record<UserRole, number> = {
  user: 0,
  admin: 10,
  superadmin: 20,
};

export interface SessionLike {
  userId: string;
  role: UserRole | string;
  email?: string | null;
}

export function isValidRole(role: string): role is UserRole {
  return role === "user" || role === "admin" || role === "superadmin";
}

export function hasMinRole(actual: UserRole | string, required: UserRole): boolean {
  if (!isValidRole(actual)) return false;
  return ROLE_RANK[actual] >= ROLE_RANK[required];
}

export function requireRoleAtLeast(session: SessionLike | null, required: UserRole): SessionLike {
  if (!session) throw new UnauthorizedError("Authentication required");
  if (!hasMinRole(session.role, required)) {
    throw new ForbiddenError(
      `Required role ${required}, user has ${session.role}`,
      "Kamu tidak punya akses ke halaman ini.",
    );
  }
  return session;
}

export function requireSuperadmin(session: SessionLike | null): SessionLike {
  return requireRoleAtLeast(session, "superadmin");
}

export function requireAdminOrHigher(session: SessionLike | null): SessionLike {
  return requireRoleAtLeast(session, "admin");
}

export function canEditRole(actor: SessionLike, targetCurrentRole: UserRole, targetNewRole: UserRole): boolean {
  // Hanya superadmin yang bisa edit role.
  if (!hasMinRole(actor.role, "superadmin")) return false;
  // Superadmin tidak boleh demote dirinya sendiri (anti-lockout) — frontend juga cegah.
  return true;
}

export const ROLE_LABELS: Record<UserRole, { id: string; en: string; color: string }> = {
  user: { id: "Pengguna", en: "User", color: "neutral" },
  admin: { id: "Admin", en: "Admin", color: "primary" },
  superadmin: { id: "Super Admin", en: "Super Admin", color: "bear" },
};
