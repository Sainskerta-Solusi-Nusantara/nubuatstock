import Link from "next/link";
import type { Metadata } from "next";

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { AuthHeading } from "@/components/auth/auth-heading";

export const metadata: Metadata = {
  title: "Lupa Password",
};

export default function ForgotPasswordPage() {
  return (
    <>
      <AuthHeading
        title="Lupa password"
        description="Masukkan email akun Anda. Kami akan mengirim link untuk mengatur ulang password."
      />
      <ForgotPasswordForm />
      <p className="mt-6 text-center text-sm text-neutral-600">
        <Link href="/login" className="font-medium text-neutral-900 hover:underline">
          Kembali ke login
        </Link>
      </p>
    </>
  );
}
