import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { requireSuperadmin } from "@/lib/auth/roles";
import { getSession } from "@/lib/auth/server";
import { SuperadminNavLink } from "./_NavLink";

export const dynamic = "force-dynamic";

/**
 * Superadmin route group layout — gating ketat hanya untuk role=superadmin.
 *
 * Admin biasa (role=admin) tetap akses /(admin)/* lain (config/secrets/dll)
 * tapi DITOLAK di /(admin)/superadmin/*.
 */
export default async function SuperadminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  try {
    requireSuperadmin(session);
  } catch {
    redirect("/login?error=superadmin_required");
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-bear/30 bg-bear-soft/50">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-6 py-2 text-xs font-medium text-bear">
          <ShieldAlert className="h-4 w-4" />
          <span>Mode Super Admin — perubahan di sini berdampak ke seluruh sistem & user.</span>
        </div>
      </div>

      <div className="flex w-full">
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-r border-border bg-card/50 p-4 lg:block">
          <div className="mb-6 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Super Admin
          </div>
          <nav className="space-y-1 text-sm">
            <SuperadminNavLink href="/superadmin" exact>📊 Overview</SuperadminNavLink>
            <SuperadminNavLink href="/superadmin/growth">📈 Growth & Retention</SuperadminNavLink>
            <SuperadminNavLink href="/superadmin/revenue">💰 Revenue & MRR</SuperadminNavLink>
            <SuperadminNavLink href="/superadmin/landing">🎨 Landing Content</SuperadminNavLink>
            <SuperadminNavLink href="/superadmin/users">👥 Users & Roles</SuperadminNavLink>
            <SuperadminNavLink href="/superadmin/system">🩺 System Health</SuperadminNavLink>
            <Link
              href="/superadmin/pitchdeck"
              className="flex items-center justify-between rounded-md border border-primary/40 bg-primary/10 px-3 py-2 font-semibold text-primary transition hover:bg-primary hover:text-primary-foreground"
            >
              <span>🎯 Pitchdeck</span>
              <span className="rounded-full bg-bull px-1.5 py-0.5 text-[9px] font-bold text-white">NEW</span>
            </Link>
          </nav>
          <div className="mt-8 border-t border-border pt-4">
            <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Admin (shared)
            </div>
            <nav className="space-y-1 text-sm">
              <SuperadminNavLink href="/admin/config">⚙️ Config</SuperadminNavLink>
              <SuperadminNavLink href="/admin/secrets">🔐 Secrets</SuperadminNavLink>
              <SuperadminNavLink href="/admin/feature-flags">🚩 Feature Flags</SuperadminNavLink>
              <SuperadminNavLink href="/admin/audit">📜 Audit Log</SuperadminNavLink>
              <SuperadminNavLink href="/admin/jobs">⚙️ Jobs</SuperadminNavLink>
              <SuperadminNavLink href="/admin/ai-prompts">🤖 AI Prompts</SuperadminNavLink>
              <SuperadminNavLink href="/admin/pricing">💵 Pricing</SuperadminNavLink>
            </nav>
          </div>
        </aside>

        <main className="min-w-0 flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
