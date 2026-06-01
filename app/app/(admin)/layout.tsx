import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Toaster } from "sonner";
import { getSession } from "@/lib/auth/server";
import type { UserRole } from "@/lib/auth/roles";
import { getConfig } from "@/lib/config";

// Admin pages butuh session + role check — tidak boleh statically prerendered.
export const dynamic = "force-dynamic";

/**
 * Admin shell — wajib role=admin.
 *
 * - Sidebar fixed dengan link ke seluruh sub-page admin.
 * - Warning banner "Admin Mode" supaya tidak salah operasi.
 * - Disclaimer global: perubahan config berdampak ke seluruh user.
 */
const NAV = [
  { href: "/admin", label: "Overview", icon: "•" },
  { href: "/admin/config", label: "Config", icon: "•" },
  { href: "/admin/secrets", label: "Secrets", icon: "•" },
  { href: "/admin/integrations", label: "Integrations", icon: "•" },
  { href: "/admin/feature-flags", label: "Feature Flags", icon: "•" },
  { href: "/admin/users", label: "Users", icon: "•" },
  { href: "/admin/audit", label: "Audit Log", icon: "•" },
  { href: "/admin/jobs", label: "Jobs Queue", icon: "•" },
  { href: "/admin/pricing", label: "Pricing", icon: "•" },
  { href: "/admin/ai-prompts", label: "AI Prompts", icon: "•" },
  { href: "/admin/glossary", label: "Glossary", icon: "•" },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) {
    redirect("/login?next=/admin");
  }
  // Admin role OR superadmin role boleh akses /(admin)/*.
  // Superadmin = superset dari admin (hierarki: superadmin > admin > user)
  const role = session.user.role as UserRole;
  if (role !== "admin" && role !== "superadmin") {
    redirect("/?error=admin_required");
  }

  const appName = await getConfig<string>("app.name", { defaultValue: "Nubuat" });

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <div className="bg-emerald-600 text-white text-xs font-medium px-4 py-2 text-center border-b border-emerald-700">
        ADMIN MODE — Perubahan config berdampak ke seluruh user. Selalu review diff sebelum save.
      </div>
      <div className="flex">
        <aside className="w-64 min-h-[calc(100vh-32px)] bg-white border-r border-neutral-200 p-4 sticky top-0">
          <Link href="/admin" className="block text-lg font-semibold tracking-tight mb-6">
            {appName} <span className="text-xs text-neutral-500">/ admin</span>
          </Link>
          <nav className="flex flex-col gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-3 py-2 rounded-md hover:bg-neutral-100 text-sm text-neutral-700"
              >
                <span className="text-neutral-400 mr-2">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-6 pt-4 border-t border-neutral-200 text-xs text-neutral-500">
            Signed in sebagai
            <div className="font-medium text-neutral-700 truncate">{session.user.email}</div>
          </div>
          <Link
            href="/dashboard"
            className="mt-4 block text-xs text-neutral-500 hover:text-neutral-700 underline"
          >
            ← Kembali ke app
          </Link>
        </aside>
        <main className="flex-1 p-8">{children}</main>
      </div>
      <Toaster position="top-right" />
    </div>
  );
}
