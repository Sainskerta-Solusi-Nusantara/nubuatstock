"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, MailCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { authClient } from "@/lib/auth/client";
import { emailSchema, nameSchema } from "@/lib/types/auth";
import { FormMessage } from "./form-message";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function SignupForm({
  minPasswordLength,
  callbackUrl = "/dashboard",
  trial = false,
  emailVerificationEnabled = false,
}: {
  minPasswordLength: number;
  callbackUrl?: string;
  /** True kalau user datang via `/signup?trial=1` — server hook pakai cookie ini untuk start trial Pro 1 hari. */
  trial?: boolean;
  /** True kalau email sender (Resend) aktif → instruksi cek email verifikasi ditampilkan. */
  emailVerificationEnabled?: boolean;
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [successEmail, setSuccessEmail] = useState<string | null>(null);

  const schema = z.object({
    name: nameSchema,
    email: emailSchema,
    whatsapp: z
      .string()
      .trim()
      .regex(/^\+?[0-9]{8,20}$/, "Nomor WhatsApp tidak valid (8-20 digit)"),
    telegram: z.string().trim().max(64).optional(),
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
      // autoSignIn aktif → user sudah punya session. Simpan kontak (WhatsApp
      // wajib + Telegram opsional). Best-effort: kalau gagal, user tetap lanjut
      // (bisa lengkapi di Settings).
      try {
        await fetch("/api/account/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ whatsapp: values.whatsapp, telegram: values.telegram }),
        });
      } catch {
        /* abaikan — non-blocking */
      }
      // Tampilkan popup sukses (instruksi cek email kalau verifikasi aktif).
      // Redirect dilakukan saat user klik "Lanjut" di dialog.
      setSuccessEmail(values.email);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Pendaftaran gagal";
      setServerError(msg);
      setSubmitting(false);
    }
  }

  return (
    <>
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
        <label htmlFor="whatsapp" className="text-sm font-medium text-neutral-800">
          Nomor WhatsApp
        </label>
        <input
          id="whatsapp"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="08xxxxxxxxxx"
          {...register("whatsapp")}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
        />
        <p className="text-xs text-neutral-500">Wajib — untuk notifikasi penting & verifikasi.</p>
        {errors.whatsapp ? (
          <p className="text-xs text-red-600">{errors.whatsapp.message}</p>
        ) : null}
      </div>

      <div className="space-y-1">
        <label htmlFor="telegram" className="text-sm font-medium text-neutral-800">
          Telegram <span className="font-normal text-neutral-500">(opsional)</span>
        </label>
        <input
          id="telegram"
          type="text"
          autoComplete="off"
          placeholder="@username"
          {...register("telegram")}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
        />
        {errors.telegram ? (
          <p className="text-xs text-red-600">{errors.telegram.message}</p>
        ) : null}
      </div>

      <div className="space-y-1">
        <label htmlFor="password" className="text-sm font-medium text-neutral-800">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            {...register("password")}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 pr-10 text-sm focus:border-neutral-900 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-900"
            aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        <p className="text-xs text-neutral-500">
          Minimal {minPasswordLength} karakter. Tip: pakai saran password kuat dari
          browser kamu.
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

      <Dialog open={successEmail !== null} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" hideClose>
          <DialogHeader className="items-center text-center">
            <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-green-100 text-green-600">
              <MailCheck className="size-6" />
            </div>
            <DialogTitle className="text-center">Pendaftaran berhasil! 🎉</DialogTitle>
          </DialogHeader>
          <p className="text-center text-sm text-muted-foreground">
            {emailVerificationEnabled ? (
              <>
                Kami sudah mengirim email verifikasi ke{" "}
                <span className="font-medium text-foreground">{successEmail}</span>. Cek inbox
                (atau folder spam) dan klik tautannya untuk mengaktifkan akunmu.
              </>
            ) : (
              <>
                Akunmu sudah aktif. Selamat datang di Nubuat — yuk mulai analisis saham IDX
                pertamamu!
              </>
            )}
          </p>
          <DialogFooter className="sm:justify-center">
            <Button
              onClick={() => {
                router.push(emailVerificationEnabled ? "/verify-email" : callbackUrl);
                router.refresh();
              }}
            >
              {emailVerificationEnabled ? "Lanjut & verifikasi email" : "Masuk ke dashboard"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
