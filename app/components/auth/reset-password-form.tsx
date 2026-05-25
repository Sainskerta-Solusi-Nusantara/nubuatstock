"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { authClient } from "@/lib/auth/client";
import { FormMessage } from "./form-message";

export function ResetPasswordForm({
  token,
  minPasswordLength,
}: {
  token: string;
  minPasswordLength: number;
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const schema = z
    .object({
      password: z
        .string()
        .min(minPasswordLength, `Password minimal ${minPasswordLength} karakter`)
        .max(256),
      confirmPassword: z.string().min(1, "Konfirmasi password wajib diisi"),
    })
    .refine((d) => d.password === d.confirmPassword, {
      message: "Konfirmasi password tidak cocok",
      path: ["confirmPassword"],
    });
  type Values = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  async function onSubmit(values: Values) {
    setSubmitting(true);
    setServerError(null);
    try {
      const result = await authClient.resetPassword({
        newPassword: values.password,
        token,
      });
      if (result.error) {
        setServerError(result.error.message ?? "Gagal reset password");
        setSubmitting(false);
        return;
      }
      setSuccess(true);
      setTimeout(() => router.push("/login"), 1500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal reset password";
      setServerError(msg);
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <FormMessage variant="error">
        Token reset tidak valid. Minta link baru di halaman lupa password.
      </FormMessage>
    );
  }

  if (success) {
    return (
      <FormMessage variant="success">
        Password berhasil diubah. Mengarahkan ke halaman login...
      </FormMessage>
    );
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      {serverError ? <FormMessage variant="error">{serverError}</FormMessage> : null}
      <div className="space-y-1">
        <label htmlFor="password" className="text-sm font-medium text-neutral-800">
          Password baru
        </label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          {...register("password")}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
        />
        {errors.password ? (
          <p className="text-xs text-red-600">{errors.password.message}</p>
        ) : null}
      </div>
      <div className="space-y-1">
        <label
          htmlFor="confirmPassword"
          className="text-sm font-medium text-neutral-800"
        >
          Konfirmasi password
        </label>
        <input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          {...register("confirmPassword")}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
        />
        {errors.confirmPassword ? (
          <p className="text-xs text-red-600">{errors.confirmPassword.message}</p>
        ) : null}
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {submitting ? "Memproses..." : "Reset password"}
      </button>
    </form>
  );
}
