"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { authClient } from "@/lib/auth/client";
import { loginInputSchema, type LoginInput } from "@/lib/types/auth";
import { FormMessage } from "./form-message";

export function LoginForm({ callbackUrl = "/dashboard" }: { callbackUrl?: string }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginInputSchema),
    defaultValues: { email: "", password: "", rememberMe: false },
  });

  async function onSubmit(values: LoginInput) {
    setServerError(null);
    setSubmitting(true);
    try {
      const result = await authClient.signIn.email({
        email: values.email,
        password: values.password,
        rememberMe: values.rememberMe,
        callbackURL: callbackUrl,
      });
      if (result.error) {
        setServerError(result.error.message ?? "Email atau password salah");
        setSubmitting(false);
        return;
      }
      router.push(callbackUrl);
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Login gagal";
      setServerError(msg);
      setSubmitting(false);
    }
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
        {errors.email ? (
          <p className="text-xs text-red-600">{errors.email.message}</p>
        ) : null}
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="text-sm font-medium text-neutral-800">
            Password
          </label>
          <Link
            href="/forgot-password"
            className="text-xs text-neutral-600 hover:text-neutral-900"
          >
            Lupa password?
          </Link>
        </div>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            {...register("password")}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 pr-16 text-sm focus:border-neutral-900 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-neutral-600 hover:text-neutral-900"
            aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
          >
            {showPassword ? "Sembunyikan" : "Tampilkan"}
          </button>
        </div>
        {errors.password ? (
          <p className="text-xs text-red-600">{errors.password.message}</p>
        ) : null}
      </div>

      <label className="flex items-center gap-2 text-sm text-neutral-700">
        <input type="checkbox" {...register("rememberMe")} className="rounded" />
        Tetap masuk di perangkat ini
      </label>

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {submitting ? "Memproses..." : "Masuk"}
      </button>
    </form>
  );
}
