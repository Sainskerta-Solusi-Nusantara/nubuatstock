import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/server";
import { AppShell } from "@/components/layout/AppShell";
import { ThemeScript } from "@/components/layout/ThemeScript";
import { getLegalGateStatus } from "@/lib/legal/acceptance";
import { getConfig, hasSecret } from "@/lib/config";
import { getUserTier } from "@/lib/billing/entitlements";
import { AcceptDisclaimerGate } from "@/components/legal/AcceptDisclaimerGate";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import { TrialFeedbackGate } from "@/components/trial/TrialFeedbackGate";
import { getTrialFeedbackGate } from "@/lib/trial/feedback-gate";

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

  // Email verification gate (IMPROVEMENT_PLAN §8.1 #2): hanya di-enforce kalau
  // email sender (Resend) AKTIF. Kalau belum dikonfigurasi, verifikasi tak bisa
  // dikirim → JANGAN kunci user (mencegah signup baru stuck di /verify-email).
  // Begitu `email.resend.api_key` di-set, gate otomatis aktif.
  if (!session.user.emailVerified) {
    const emailSenderConfigured = await hasSecret("email.resend.api_key");
    if (emailSenderConfigured) {
      redirect("/verify-email");
    }
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

  // Resolve tier aktif user untuk badge "Paket" di Sidebar (fallback "free").
  const tier = userId ? await getUserTier(userId).catch(() => "free") : "free";

  // Gate feedback wajib hari ke-3 untuk user trial (hanya dievaluasi kalau gate
  // legal sudah lewat — legal punya prioritas). Soft-fail kalau error.
  const trialFeedback =
    userId && !needsAcceptance
      ? await getTrialFeedbackGate(userId).catch(() => ({ required: false, trialEndsAt: null }))
      : { required: false, trialEndsAt: null };

  return (
    <>
      <ThemeScript />
      <AppShell user={session.user} tier={tier}>
        {children}
      </AppShell>
      {needsAcceptance ? (
        <AcceptDisclaimerGate
          appName={appName}
          disclaimer={disclaimerText}
          version={acceptVersion}
          isReAccept={isReAccept}
        />
      ) : trialFeedback.required ? (
        // Gate feedback trial hari ke-3 — blocking, tampil di atas onboarding.
        <TrialFeedbackGate trialEndsAt={trialFeedback.trialEndsAt} />
      ) : (
        // Onboarding tour first-time user — hanya saat gate legal sudah lewat
        // supaya tidak menutupi disclaimer wajib. Tampil sekali via localStorage.
        <OnboardingTour />
      )}
    </>
  );
}
