import Link from "next/link";
import type { Metadata } from "next";

import { AuthHeading } from "@/components/auth/auth-heading";
import { FormMessage } from "@/components/auth/form-message";
import { getAuth } from "@/lib/auth/server";
import { logger } from "@/lib/logger";

export const metadata: Metadata = {
  title: "Verifikasi Email",
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <>
        <AuthHeading title="Verifikasi email" />
        <FormMessage variant="info">
          Kami telah mengirim email verifikasi. Klik link di email untuk
          menyelesaikan verifikasi.
        </FormMessage>
        <p className="mt-6 text-center text-sm text-neutral-600">
          <Link href="/login" className="font-medium text-neutral-900 hover:underline">
            Kembali ke login
          </Link>
        </p>
      </>
    );
  }

  let success = false;
  let errorMsg: string | null = null;
  try {
    const auth = await getAuth();
    await auth.api.verifyEmail({ query: { token } });
    success = true;
  } catch (err) {
    logger.warn({ err }, "verifyEmail failed");
    errorMsg = "Token verifikasi tidak valid atau sudah kedaluwarsa.";
  }

  return (
    <>
      <AuthHeading title="Verifikasi email" />
      {success ? (
        <FormMessage variant="success">
          Email berhasil diverifikasi. Anda bisa login sekarang.
        </FormMessage>
      ) : (
        <FormMessage variant="error">{errorMsg}</FormMessage>
      )}
      <p className="mt-6 text-center text-sm text-neutral-600">
        <Link href="/login" className="font-medium text-neutral-900 hover:underline">
          Lanjut ke login
        </Link>
      </p>
    </>
  );
}
