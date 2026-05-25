import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { AuthHeading } from "@/components/auth/auth-heading";
import { MfaSetupForm } from "@/components/auth/mfa-setup-form";
import { FormMessage } from "@/components/auth/form-message";
import { getSession } from "@/lib/auth/server";
import { startTotpEnrollment } from "@/lib/auth/mfa";

export const metadata: Metadata = {
  title: "Setup MFA",
};

export default async function MfaSetupPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login?callbackUrl=/mfa-setup");
  }

  if (session.user.mfaEnabled) {
    return (
      <>
        <AuthHeading title="MFA sudah aktif" />
        <FormMessage variant="info">
          Akun Anda sudah memiliki MFA aktif. Untuk reset, hubungi admin atau matikan
          via pengaturan akun.
        </FormMessage>
      </>
    );
  }

  // Generate fresh secret on each page visit. Factor row dibuat di DB tapi
  // belum confirmed — akan dibersihkan kalau user tinggalkan halaman.
  const { factorId, secret, otpauthUrl } = await startTotpEnrollment(
    session.user.id,
    session.user.email,
  );

  return (
    <>
      <AuthHeading
        title="Aktifkan MFA"
        description="Tambahkan lapisan keamanan ekstra dengan kode 6 digit dari aplikasi authenticator."
      />
      <MfaSetupForm factorId={factorId} secret={secret} otpauthUrl={otpauthUrl} />
    </>
  );
}
