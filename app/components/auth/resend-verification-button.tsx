"use client";

import { useState } from "react";

import { authClient } from "@/lib/auth/client";
import { FormMessage } from "./form-message";

/**
 * Tombol "kirim ulang email verifikasi".
 *
 * Memanggil endpoint better-auth `/send-verification-email` (rate-limited di
 * server: 3 req / 5 menit / IP). `callbackURL` mengarah ke /dashboard supaya
 * setelah user klik link verifikasi (autoSignInAfterVerification=true) langsung
 * masuk app.
 */
export function ResendVerificationButton({ email }: { email: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function onResend() {
    setState("sending");
    setErrorMsg(null);
    try {
      const result = await authClient.sendVerificationEmail({
        email,
        callbackURL: "/dashboard",
      });
      if (result.error) {
        setState("error");
        setErrorMsg(
          result.error.message ??
            "Gagal mengirim ulang. Coba lagi beberapa saat.",
        );
        return;
      }
      setState("sent");
    } catch (err) {
      setState("error");
      setErrorMsg(err instanceof Error ? err.message : "Gagal mengirim ulang.");
    }
  }

  if (state === "sent") {
    return (
      <FormMessage variant="success">
        Email verifikasi sudah dikirim ulang ke <strong>{email}</strong>. Periksa
        inbox (dan folder spam) kamu.
      </FormMessage>
    );
  }

  return (
    <div className="space-y-3">
      {state === "error" && errorMsg ? (
        <FormMessage variant="error">{errorMsg}</FormMessage>
      ) : null}
      <button
        type="button"
        onClick={onResend}
        disabled={state === "sending"}
        className="w-full rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {state === "sending" ? "Mengirim..." : "Kirim ulang email verifikasi"}
      </button>
    </div>
  );
}
