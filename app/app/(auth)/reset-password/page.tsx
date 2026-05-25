import type { Metadata } from "next";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { AuthHeading } from "@/components/auth/auth-heading";
import { getPasswordMinLength } from "@/lib/auth/config";

export const metadata: Metadata = {
  title: "Reset Password",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const minLen = await getPasswordMinLength();
  return (
    <>
      <AuthHeading
        title="Atur password baru"
        description="Pilih password yang kuat dan unik untuk akun Anda."
      />
      <ResetPasswordForm token={token ?? ""} minPasswordLength={minLen} />
    </>
  );
}
