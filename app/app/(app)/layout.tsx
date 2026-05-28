import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/server";
import { AppShell } from "@/components/layout/AppShell";
import { ThemeScript } from "@/components/layout/ThemeScript";
import { getLegalGateStatus } from "@/lib/legal/acceptance";
import { getConfig } from "@/lib/config";
import { AcceptDisclaimerGate } from "@/components/legal/AcceptDisclaimerGate";

// Semua route (app)/* butuh session — tidak boleh statically prerendered.
export const dynamic = "force-dynamic";

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

  // Email verification gate (IMPROVEMENT_PLAN §8.1 #2): user yang belum verifikasi
  // email tidak boleh akses fitur app. Redirect ke /verify-email yang menyediakan
  // status + tombol kirim ulang. Dilakukan SEBELUM gate disclaimer.
  if (!session.user.emailVerified) {
    redirect("/verify-email");
  }

  const userId = (session as { userId?: string; user?: { id?: string } }).userId
    ?? (session as { user?: { id?: string } }).user?.id;

  // Legal gate — versioning aware: gate muncul untuk first-accept ATAU kalau
  // versi dokumen legal di-bump (user wajib re-accept). `isReAccept` membedakan
  // copy "selamat datang" vs "kebijakan diperbarui".
  let needsAcceptance = false;
  let isReAccept = false;
  let acceptVersion = "v1";
  let appName = "Nubuat";
  let disclaimerText = "";
  if (userId) {
    const [gate, name, disclaimer] = await Promise.all([
      getLegalGateStatus(userId),
      getConfig<string>("app.name", { defaultValue: "Nubuat" }),
      getConfig<string>("app.disclaimer_text", {
        defaultValue: "Informasi edukasi semata, bukan ajakan jual/beli efek. Risiko investasi tanggung jawab pribadi.",
      }),
    ]);
    needsAcceptance = gate.needsAcceptance;
    isReAccept = gate.isReAccept;
    acceptVersion = gate.currentVersion;
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
        <AcceptDisclaimerGate
          appName={appName}
          disclaimer={disclaimerText}
          version={acceptVersion}
          isReAccept={isReAccept}
        />
      )}
    </>
  );
}
