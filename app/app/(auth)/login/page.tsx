import Link from "next/link";
import type { Metadata } from "next";

import { LoginForm } from "@/components/auth/login-form";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { AuthHeading } from "@/components/auth/auth-heading";
import { getGoogleOAuthCreds } from "@/lib/auth/config";

export const metadata: Metadata = {
  title: "Masuk",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;
  const google = await getGoogleOAuthCreds();
  return (
    <>
      <AuthHeading title="Masuk ke akunmu" description="Lanjutkan analisis pasar." />
      <LoginForm callbackUrl={callbackUrl ?? "/dashboard"} />
      <div className="my-5 flex items-center gap-3 text-xs text-neutral-400">
        <div className="h-px flex-1 bg-neutral-200" />
        atau
        <div className="h-px flex-1 bg-neutral-200" />
      </div>
      <GoogleSignInButton enabled={google.enabled} callbackUrl={callbackUrl ?? "/dashboard"} />
      <p className="mt-6 text-center text-sm text-neutral-600">
        Belum punya akun?{" "}
        <Link href="/signup" className="font-medium text-neutral-900 hover:underline">
          Daftar gratis
        </Link>
      </p>
    </>
  );
}
