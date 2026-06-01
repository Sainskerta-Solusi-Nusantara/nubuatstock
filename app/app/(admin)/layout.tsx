import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/server";
import type { UserRole } from "@/lib/auth/roles";
import { getConfig } from "@/lib/config";
import { AdminChrome } from "@/components/layout/AdminChrome";

// Admin pages butuh session + role check — tidak boleh statically prerendered.
export const dynamic = "force-dynamic";

/**
 * Admin shell — wajib role=admin/superadmin.
 *
 * Chrome (banner + sidebar kiri) dirender oleh <AdminChrome> yang HANYA tampil di
 * /admin/*. Di /superadmin/* chrome ini disembunyikan (layout superadmin punya
 * sidebar sendiri) supaya tidak dobel.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) {
    redirect("/login?next=/admin");
  }
  // Admin role OR superadmin role boleh akses /(admin)/*.
  const role = session.user.role as UserRole;
  if (role !== "admin" && role !== "superadmin") {
    redirect("/?error=admin_required");
  }

  const appName = await getConfig<string>("app.name", { defaultValue: "Nubuat" });

  return (
    <AdminChrome appName={appName} email={session.user.email}>
      {children}
    </AdminChrome>
  );
}
