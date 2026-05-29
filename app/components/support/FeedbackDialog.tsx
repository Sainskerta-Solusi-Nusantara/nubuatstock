"use client";

import * as React from "react";
import { MessageSquarePlus, Star } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toast";

type FeedbackCategory = "feedback" | "bug" | "feature" | "billing" | "other";

const CATEGORIES: { value: FeedbackCategory; label: string }[] = [
  { value: "feedback", label: "Feedback umum" },
  { value: "feature", label: "Usul fitur" },
  { value: "bug", label: "Lapor bug" },
  { value: "billing", label: "Tagihan / langganan" },
  { value: "other", label: "Lainnya" },
];

interface FeedbackDialogProps {
  /** Optional custom trigger. Default: outline button "Kirim Feedback". */
  trigger?: React.ReactNode;
}

/**
 * Widget feedback ringan — rating bintang (opsional) + pesan singkat.
 * POST ke /api/feedback. Tidak bikin thread/ticket (lihat /support untuk itu).
 */
export function FeedbackDialog({ trigger }: FeedbackDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [category, setCategory] = React.useState<FeedbackCategory>("feedback");
  const [rating, setRating] = React.useState<number>(0);
  const [message, setMessage] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const reset = () => {
    setCategory("feedback");
    setRating(0);
    setMessage("");
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim().length < 3) {
      toast.error("Pesan terlalu pendek.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: message.trim(),
          category,
          rating: rating > 0 ? rating : null,
          contextUrl:
            typeof window !== "undefined" ? window.location.href : null,
        }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok: boolean; error?: { message?: string } }
        | null;
      if (!res.ok || !data?.ok) {
        toast.error(data?.error?.message ?? "Gagal mengirim feedback.");
        return;
      }
      toast.success("Makasih! Feedback kamu sudah terkirim.");
      reset();
      setOpen(false);
    } catch {
      toast.error("Terjadi kesalahan jaringan.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            <MessageSquarePlus className="mr-1.5 size-4" aria-hidden />
            Kirim Feedback
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Kirim Feedback</DialogTitle>
            <DialogDescription>
              Punya masukan, ide, atau menemukan yang aneh? Kasih tahu kami.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="feedback-category">Kategori</Label>
              <Select
                value={category}
                onValueChange={(v) => setCategory(v as FeedbackCategory)}
              >
                <SelectTrigger id="feedback-category">
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Rating (opsional)</Label>
              <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={rating === n}
                    aria-label={`${n} bintang`}
                    onClick={() => setRating(rating === n ? 0 : n)}
                    className="rounded p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Star
                      className={cn(
                        "size-6 transition-colors",
                        n <= rating
                          ? "fill-amber-400 text-amber-400"
                          : "text-muted-foreground",
                      )}
                      aria-hidden
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="feedback-message">Pesan</Label>
              <Textarea
                id="feedback-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ceritakan masukan kamu..."
                rows={4}
                maxLength={5000}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Mengirim..." : "Kirim"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
