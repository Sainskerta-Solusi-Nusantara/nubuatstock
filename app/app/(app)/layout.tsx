import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/server";
import { AppShell } from "@/components/layout/AppShell";
import { ThemeScript } from "@/components/layout/ThemeScript";
import { hasAcceptedDisclaimer } from "@/lib/legal/acceptance";
import { getConfig } from "@/lib/config";
import { AcceptDisclaimerGate } from "@/components/legal/AcceptDisclaimerGate";

/**
 * Authenticated application shell. Membungkus seluruh route `(app)`.
 *
 * - Require session: redirect ke `/login` kalau anonymous.
 * - Gate disclaimer: kalau user belum accept disclaimer versi terkini,
 *   render full-page overlay yang wajib di-accept (P0 compliance mitigation).
 * - Tier resolution: pakai `getActiveTier` dari billing kalau ada; fallback "free".
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const userId = (session as { userId?: string; user?: { id?: string } }).userId
    ?? (session as { user?: { id?: string } }).user?.id;

  // Legal gate
  let needsAcceptance = false;
  let appName = "Nubuat";
  let disclaimerText = "";
  if (userId) {
    const [accepted, name, disclaimer] = await Promise.all([
      hasAcceptedDisclaimer(userId),
      getConfig<string>("app.name", { defaultValue: "Nubuat" }),
      getConfig<string>("app.disclaimer_text", {
        defaultValue: "Informasi edukasi semata, bukan ajakan jual/beli efek. Risiko investasi tanggung jawab pribadi.",
      }),
    ]);
    needsAcceptance = !accepted;
    appName = name;
    disclaimerText = disclaimer;
  }

  return (
    <>
      <ThemeScript />
      <AppShell user={session.user} tier={null}>
        {children}
      </AppShell>
      {needsAcceptance && (
        <AcceptDisclaimerGate appName={appName} disclaimer={disclaimerText} />
      )}
    </>
  );
}
