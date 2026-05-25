"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { authClient } from "@/lib/auth/client";
import {
  forgotPasswordInputSchema,
  type ForgotPasswordInput,
} from "@/lib/types/auth";
import { FormMessage } from "./form-message";

export function ForgotPasswordForm() {
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordInputSchema),
  });

  async function onSubmit(values: ForgotPasswordInput) {
    setSubmitting(true);
    setServerError(null);
    try {
      // Better-Auth v1.6+: `forgetPassword` di-rename jadi `requestPasswordReset`.
      const result = await authClient.requestPasswordReset({
        email: values.email,
        redirectTo: "/reset-password",
      });
      if (result.error) {
        // Untuk privacy, jangan ungkapkan kalau email tidak terdaftar.
        // Tetap tampilkan success state.
      }
      setSubmitted(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal memproses";
      setServerError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <FormMessage variant="success">
        Jika email terdaftar, kami telah mengirim instruksi reset password. Periksa
        inbox Anda.
      </FormMessage>
    );
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      {serverError ? <FormMessage variant="error">{serverError}</FormMessage> : null}
      <div className="space-y-1">
        <label htmlFor="email" className="text-sm font-medium text-neutral-800">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          {...register("email")}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
        />
        {errors.email ? <p className="text-xs text-red-600">{errors.email.message}</p> : null}
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {submitting ? "Mengirim..." : "Kirim instruksi reset"}
      </button>
    </form>
  );
}
