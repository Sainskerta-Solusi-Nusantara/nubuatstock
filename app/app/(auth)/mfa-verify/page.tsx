import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { AuthHeading } from "@/components/auth/auth-heading";
import { MfaVerifyForm } from "@/components/auth/mfa-verify-form";
import { getSession } from "@/lib/auth/server";

export const metadata: Metadata = {
  title: "Verifikasi MFA",
};

export default async function MfaVerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;
  const session = await getSession();
  if (!session) {
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl ?? "/")}`);
  }
  if (!session.user.mfaEnabled) {
    redirect(callbackUrl ?? "/");
  }

  return (
    <>
      <AuthHeading
        title="Verifikasi MFA"
        description="Masukkan kode dari aplikasi authenticator Anda."
      />
      <MfaVerifyForm callbackUrl={callbackUrl ?? "/"} />
    </>
  );
}
