import Link from "next/link";
import type { Metadata } from "next";

import { SignupForm } from "@/components/auth/signup-form";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { AuthHeading } from "@/components/auth/auth-heading";
import { RefCapture } from "@/components/referral/ref-capture";
import { getGoogleOAuthCreds, getPasswordMinLength } from "@/lib/auth/config";

export const metadata: Metadata = {
  title: "Daftar",
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; trial?: string }>;
}) {
  const { callbackUrl, trial } = await searchParams;
  // Terima `trial=1`, `trial=true`, `trial=pro` — semua value non-empty
  // dianggap niat trial. Tier default Pro 7 hari di server.
  const trialIntent = typeof trial === "string" && trial.length > 0 && trial !== "0" && trial !== "false";
  const [minLen, google] = await Promise.all([
    getPasswordMinLength(),
    getGoogleOAuthCreds(),
  ]);
  return (
    <>
      <RefCapture />
      <AuthHeading
        title={trialIntent ? "Mulai trial Pro 7 hari" : "Buat akun baru"}
        description={
          trialIntent
            ? "Akses semua fitur Pro selama 7 hari. Tidak perlu kartu kredit."
            : "Gratis untuk fitur dasar. Tidak perlu kartu kredit."
        }
      />
      <SignupForm
        minPasswordLength={minLen}
        callbackUrl={callbackUrl ?? "/"}
        trial={trialIntent}
      />
      <div className="my-5 flex items-center gap-3 text-xs text-neutral-400">
        <div className="h-px flex-1 bg-neutral-200" />
        atau
        <div className="h-px flex-1 bg-neutral-200" />
      </div>
      <GoogleSignInButton enabled={google.enabled} callbackUrl={callbackUrl ?? "/"} />
      <p className="mt-6 text-center text-sm text-neutral-600">
        Sudah punya akun?{" "}
        <Link href="/login" className="font-medium text-neutral-900 hover:underline">
          Masuk
        </Link>
      </p>
    </>
  );
}
