"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  mfaSetupConfirmInputSchema,
  type MfaSetupConfirmInput,
} from "@/lib/types/auth";
import { FormMessage } from "./form-message";

export interface MfaSetupFormProps {
  factorId: string;
  secret: string;
  otpauthUrl: string;
}

export function MfaSetupForm({ factorId, secret, otpauthUrl }: MfaSetupFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MfaSetupConfirmInput>({
    resolver: zodResolver(mfaSetupConfirmInputSchema),
    defaultValues: { factorId, code: "" },
  });

  async function onSubmit(values: MfaSetupConfirmInput) {
    setSubmitting(true);
    setServerError(null);
    try {
      const res = await fetch("/api/auth/mfa/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = (await res.json()) as
        | { ok: true; data: unknown }
        | { ok: false; error: { message: string } };
      if (!res.ok || !json.ok) {
        setServerError(json.ok ? "Gagal konfirmasi" : json.error.message);
        setSubmitting(false);
        return;
      }
      router.push("/");
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal konfirmasi";
      setServerError(msg);
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <ol className="list-decimal pl-5 text-sm text-neutral-700 space-y-1">
        <li>Buka aplikasi authenticator (Google Authenticator, 1Password, Authy).</li>
        <li>Scan QR code atau masukkan secret manual.</li>
        <li>Masukkan 6 digit kode untuk konfirmasi.</li>
      </ol>

      <div className="rounded-md border border-neutral-200 p-3 bg-neutral-50 space-y-2">
        <p className="text-xs text-neutral-500 uppercase tracking-wide">Secret</p>
        <code className="block break-all text-sm font-mono">{secret}</code>
        <p className="text-xs text-neutral-500 uppercase tracking-wide pt-2">
          otpauth URL
        </p>
        <code className="block break-all text-xs font-mono text-neutral-600">
          {otpauthUrl}
        </code>
        <p className="text-xs text-neutral-500">
          QR rendering otomatis menyusul (post-MVP). Sementara, paste URL otpauth ke
          aplikasi authenticator atau ketik manual secret di atas.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3">
        <input type="hidden" {...register("factorId")} value={factorId} />
        {serverError ? <FormMessage variant="error">{serverError}</FormMessage> : null}
        <div className="space-y-1">
          <label htmlFor="code" className="text-sm font-medium text-neutral-800">
            Kode 6 digit
          </label>
          <input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
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
          {submitting ? "Memproses..." : "Aktifkan MFA"}
        </button>
      </form>
    </div>
  );
}
