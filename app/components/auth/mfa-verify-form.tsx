"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { mfaVerifyInputSchema, type MfaVerifyInput } from "@/lib/types/auth";
import { FormMessage } from "./form-message";

export function MfaVerifyForm({ callbackUrl = "/" }: { callbackUrl?: string }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MfaVerifyInput>({ resolver: zodResolver(mfaVerifyInputSchema) });

  async function onSubmit(values: MfaVerifyInput) {
    setSubmitting(true);
    setServerError(null);
    try {
      const res = await fetch("/api/auth/mfa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = (await res.json()) as
        | { ok: true; data: unknown }
        | { ok: false; error: { message: string } };
      if (!res.ok || !json.ok) {
        setServerError(json.ok ? "Verifikasi gagal" : json.error.message);
        setSubmitting(false);
        return;
      }
      router.push(callbackUrl);
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Verifikasi gagal";
      setServerError(msg);
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {serverError ? <FormMessage variant="error">{serverError}</FormMessage> : null}
      <div className="space-y-1">
        <label htmlFor="code" className="text-sm font-medium text-neutral-800">
          Kode 6 digit dari authenticator
        </label>
        <input
          id="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          {...register("code")}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm tracking-widest text-center font-mono focus:border-neutral-900 focus:outline-none"
        />
        {errors.code ? <p className="text-xs text-red-600">{errors.code.message}</p> : null}
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {submitting ? "Memverifikasi..." : "Verifikasi"}
      </button>
    </form>
  );
}
