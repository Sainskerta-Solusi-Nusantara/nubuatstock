"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { authClient } from "@/lib/auth/client";
import { emailSchema, nameSchema } from "@/lib/types/auth";
import { FormMessage } from "./form-message";

export function SignupForm({
  minPasswordLength,
  callbackUrl = "/dashboard",
  trial = false,
}: {
  minPasswordLength: number;
  callbackUrl?: string;
  /** True kalau user datang via `/signup?trial=1` — server hook pakai cookie ini untuk start trial Pro 7 hari. */
  trial?: boolean;
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const schema = z.object({
    name: nameSchema,
    email: emailSchema,
    password: z
      .string()
      .min(minPasswordLength, `Password minimal ${minPasswordLength} karakter`)
      .max(256),
  });
  type Values = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  async function onSubmit(values: Values) {
    setServerError(null);
    setSubmitting(true);
    try {
      // Trial intent disampaikan ke server via short-lived cookie. Server
      // `databaseHooks.user.create.after` baca cookie ini saat keputusan
      // trial-vs-free dibuat, lalu clear cookie. Max-Age 5 menit cukup
      // untuk satu flow signup.
      if (trial && typeof document !== "undefined") {
        document.cookie = "nubuat_trial_intent=1; Path=/; Max-Age=300; SameSite=Lax";
      }
      const result = await authClient.signUp.email({
        email: values.email,
        password: values.password,
        name: values.name,
        callbackURL: callbackUrl,
      });
      if (result.error) {
        setServerError(result.error.message ?? "Gagal mendaftar");
        setSubmitting(false);
        return;
      }
      router.push(callbackUrl);
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Pendaftaran gagal";
      setServerError(msg);
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      {serverError ? <FormMessage variant="error">{serverError}</FormMessage> : null}

      <div className="space-y-1">
        <label htmlFor="name" className="text-sm font-medium text-neutral-800">
          Nama
        </label>
        <input
          id="name"
          autoComplete="name"
          {...register("name")}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
        />
        {errors.name ? <p className="text-xs text-red-600">{errors.name.message}</p> : null}
      </div>

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

      <div className="space-y-1">
        <label htmlFor="password" className="text-sm font-medium text-neutral-800">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          {...register("password")}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
        />
        <p className="text-xs text-neutral-500">
          Minimal {minPasswordLength} karakter. Gunakan kombinasi huruf, angka, &
          simbol.
        </p>
        {errors.password ? (
          <p className="text-xs text-red-600">{errors.password.message}</p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {submitting ? "Memproses..." : "Daftar"}
      </button>
    </form>
  );
}
