import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/db/schema/auth";
import { getOrCreatePreferences } from "@/lib/notifications/preferences";
import { NotificationPrefs } from "@/components/settings/NotificationPrefs";
import { PushToggle } from "@/components/pwa/PushToggle";

/**
 * Pengaturan Notifikasi & WhatsApp (`/settings/notifications`).
 * Server component: load preferensi + nomor WA user, render form client.
 */
export const dynamic = "force-dynamic";

export default async function NotificationSettingsPage() {
  const session = await requireSession().catch(() => null);
  if (!session) {
    redirect("/login?next=/settings/notifications");
  }
  const userId = session.user.id;

  const [prefs, [u]] = await Promise.all([
    getOrCreatePreferences(userId),
    db.select({ phone: users.phone }).from(users).where(eq(users.id, userId)).limit(1),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-2">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Notifikasi</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Kelola bagaimana & kapan Nubuat menghubungimu.
        </p>
      </div>
      <NotificationPrefs
        phone={u?.phone ?? null}
        initial={{
          inAppEnabled: prefs.inAppEnabled,
          emailEnabled: prefs.emailEnabled,
          whatsappEnabled: prefs.whatsappEnabled,
          whatsappConsentAt: prefs.whatsappConsentAt ? prefs.whatsappConsentAt.toISOString() : null,
          alertsEnabled: prefs.alertsEnabled,
          dailyPicksEnabled: prefs.dailyPicksEnabled,
          newsEnabled: prefs.newsEnabled,
          quietHoursStart: prefs.quietHoursStart,
          quietHoursEnd: prefs.quietHoursEnd,
          dailyCap: prefs.dailyCap,
        }}
      />
      <PushToggle />
    </div>
  );
}
