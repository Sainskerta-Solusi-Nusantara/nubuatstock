import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { AuthHeading } from "@/components/auth/auth-heading";
import { FormMessage } from "@/components/auth/form-message";
import { ResendVerificationButton } from "@/components/auth/resend-verification-button";
import { getAuth, getSession } from "@/lib/auth/server";
import { logger } from "@/lib/logger";

export const metadata: Metadata = {
  title: "Verifikasi Email",
};

// Halaman cek session/token di server — tidak boleh statically prerendered.
export const dynamic = "force-dynamic";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  // --- Branch 1: user klik link verifikasi (ada token) ---
  if (token) {
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
            Email berhasil diverifikasi. Anda bisa melanjutkan ke aplikasi.
          </FormMessage>
        ) : (
          <FormMessage variant="error">{errorMsg}</FormMessage>
        )}
        <p className="mt-6 text-center text-sm text-neutral-600">
          <Link
            href={success ? "/dashboard" : "/login"}
            className="font-medium text-neutral-900 hover:underline"
          >
            {success ? "Lanjut ke dashboard" : "Kembali ke login"}
          </Link>
        </p>
      </>
    );
  }

  // --- Branch 2: user login tapi belum verifikasi (di-redirect dari app gate) ---
  const session = await getSession();
  if (session) {
    // Kalau ternyata sudah terverifikasi, jangan tahan di sini.
    if (session.user.emailVerified) {
      redirect("/dashboard");
    }

    return (
      <>
        <AuthHeading
          title="Verifikasi email Anda"
          description="Untuk mengakses fitur Nubuat, verifikasi email Anda terlebih dahulu."
        />
        <FormMessage variant="info">
          Kami telah mengirim email verifikasi ke{" "}
          <strong>{session.user.email}</strong>. Klik link di email tersebut
          untuk menyelesaikan verifikasi. Belum menerima? Kirim ulang di bawah.
        </FormMessage>
        <div className="mt-5">
          <ResendVerificationButton email={session.user.email} />
        </div>
        <p className="mt-6 text-center text-sm text-neutral-600">
          Salah akun?{" "}
          <Link
            href="/login"
            className="font-medium text-neutral-900 hover:underline"
          >
            Login dengan akun lain
          </Link>
        </p>
      </>
    );
  }

  // --- Branch 3: tidak login & tidak ada token (datang langsung) ---
  return (
    <>
      <AuthHeading title="Verifikasi email" />
      <FormMessage variant="info">
        Kami telah mengirim email verifikasi setelah pendaftaran. Klik link di
        email untuk menyelesaikan verifikasi, lalu login.
      </FormMessage>
      <p className="mt-6 text-center text-sm text-neutral-600">
        <Link href="/login" className="font-medium text-neutral-900 hover:underline">
          Kembali ke login
        </Link>
      </p>
    </>
  );
}
