"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Star, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils/cn";

const PROMPTS = [
  { value: 1, label: "Sangat kurang" },
  { value: 2, label: "Kurang" },
  { value: 3, label: "Cukup" },
  { value: 4, label: "Bagus" },
  { value: 5, label: "Sangat bagus" },
];

/**
 * Modal feedback WAJIB untuk user trial di jam ke-3 (trial total 1 hari). Tidak bisa ditutup
 * (hideClose, ESC & klik luar dinonaktifkan) sampai user submit rating 1–5 +
 * pesan. Setelah sukses, server gate akan menilai ulang (router.refresh) dan
 * modal hilang — trial gratis lanjut sampai habis (1 hari).
 */
export function TrialFeedbackGate({ trialEndsAt }: { trialEndsAt: string | null }) {
  const router = useRouter();
  const [rating, setRating] = React.useState(0);
  const [hover, setHover] = React.useState(0);
  const [message, setMessage] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const hoursLeft = React.useMemo(() => {
    if (!trialEndsAt) return null;
    const ms = new Date(trialEndsAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(ms / (60 * 60 * 1000)));
  }, [trialEndsAt]);

  const canSubmit = rating >= 1 && rating <= 5 && message.trim().length >= 10 && !submitting;

  async function onSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: message.trim(),
          rating,
          category: "feedback",
          source: "trial_gate",
          contextUrl: window.location.href,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error?.message ?? "Gagal mengirim feedback");
      }
      toast.success("Terima kasih! 🙌", {
        description: "Feedback kamu tersimpan. Selamat melanjutkan trial-mu.",
      });
      // Server menilai ulang gate → modal hilang.
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengirim feedback");
      setSubmitting(false);
    }
  }

  const active = hover || rating;

  return (
    <Dialog open>
      <DialogContent
        hideClose
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        className="max-w-md"
      >
        <DialogHeader>
          <div className="mx-auto mb-1 flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="size-5" />
          </div>
          <DialogTitle className="text-center">Bagaimana pengalamanmu sejauh ini?</DialogTitle>
          <DialogDescription className="text-center">
            Kamu sudah 3 jam mencoba Nubuat.{" "}
            {hoursLeft != null && hoursLeft > 0 ? (
              <>
                Beri feedback singkat untuk <strong>melanjutkan trial gratismu</strong>{" "}
                (sisa ~{hoursLeft} jam). Masukanmu membantu kami memperbaiki fitur.
              </>
            ) : (
              <>Beri feedback singkat untuk melanjutkan. Masukanmu membantu kami memperbaiki fitur.</>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Rating bintang 1–5 — WAJIB */}
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-sm font-medium">
            Beri rating pengalamanmu <span className="text-bear">*</span>
          </span>
          <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating 1 sampai 5 bintang (wajib)">
            {PROMPTS.map((p) => (
              <button
                key={p.value}
                type="button"
                role="radio"
                aria-checked={rating === p.value}
                aria-label={`${p.value} bintang — ${p.label}`}
                onMouseEnter={() => setHover(p.value)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setRating(p.value)}
                className="rounded p-1 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Star
                  className={cn(
                    "size-8 transition",
                    p.value <= active ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40",
                  )}
                />
              </button>
            ))}
          </div>
          <span className="h-4 text-xs text-muted-foreground">
            {active ? PROMPTS[active - 1]?.label : "Wajib — pilih 1 sampai 5 bintang"}
          </span>
        </div>

        {/* Pesan feedback */}
        <div className="space-y-1">
          <label htmlFor="trial-feedback-msg" className="text-sm font-medium">
            Ceritakan pengalamanmu <span className="text-bear">*</span>
          </label>
          <textarea
            id="trial-feedback-msg"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            maxLength={5000}
            placeholder="Fitur apa yang paling membantu? Apa yang masih membingungkan atau perlu diperbaiki?"
            className="w-full resize-none rounded-md border border-input bg-background p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
          <p className="text-right text-[11px] text-muted-foreground">
            {message.trim().length < 10
              ? `Minimal 10 karakter (${message.trim().length}/10)`
              : `${message.length}/5000`}
          </p>
        </div>

        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Menyimpan…
            </>
          ) : (
            "Kirim & Lanjutkan Trial"
          )}
        </button>
        <p className="text-center text-[11px] text-muted-foreground">
          Feedback ini wajib sekali saja selama masa trial.
        </p>
      </DialogContent>
    </Dialog>
  );
}
