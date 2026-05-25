"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth/client";

export function GoogleSignInButton({
  enabled,
  callbackUrl = "/",
}: {
  enabled: boolean;
  callbackUrl?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      await authClient.signIn.social({ provider: "google", callbackURL: callbackUrl });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal memulai login Google";
      setError(msg);
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={!enabled || loading}
        title={
          enabled
            ? "Login dengan akun Google"
            : "Setup required di /admin/config"
        }
        aria-disabled={!enabled || loading}
        className="flex items-center justify-center gap-2 w-full rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <GoogleIcon />
        {loading ? "Mengarahkan..." : "Lanjut dengan Google"}
      </button>
      {!enabled ? (
        <p className="text-xs text-neutral-500 text-center">
          Login Google belum dikonfigurasi.
        </p>
      ) : null}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.707A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  );
}
