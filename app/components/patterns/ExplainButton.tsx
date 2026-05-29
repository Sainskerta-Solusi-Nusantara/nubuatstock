"use client";

import { useState, useTransition } from "react";
import { Sparkles, Loader2, ChevronUp, AlertCircle } from "lucide-react";
import { MarkdownContent } from "@/components/ai/MarkdownContent";

interface Props {
  patternId: string;
  /**
   * narrative dari DB. Kalau diawali "AI:" berarti sudah ada penjelasan AI
   * yang ter-cache → langsung tampilkan tanpa perlu fetch ulang.
   */
  initialExplanation?: string | null;
}

type ApiError = { message?: string } | string | undefined;

function errorMessage(err: ApiError): string {
  if (!err) return "Gagal generate penjelasan.";
  if (typeof err === "string") return err;
  return err.message ?? "Gagal generate penjelasan.";
}

export function ExplainButton({ patternId, initialExplanation }: Props) {
  const cached =
    initialExplanation && initialExplanation.startsWith("AI:")
      ? initialExplanation.replace(/^AI:\s*/, "")
      : null;

  const [explanation, setExplanation] = useState<string | null>(cached);
  const [open, setOpen] = useState<boolean>(Boolean(cached));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const fetchExplanation = () => {
    setError(null);
    // Sudah ada di state → cukup buka panel, jangan fetch ulang (hemat).
    if (explanation) {
      setOpen(true);
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch("/api/patterns/explain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ patternId }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          setError(errorMessage(data.error));
          return;
        }
        const text: string = data.data?.explanation ?? "";
        if (!text) {
          setError("AI tidak mengembalikan penjelasan. Coba lagi.");
          return;
        }
        setExplanation(text);
        setOpen(true);
      } catch {
        setError("Gagal menghubungi layanan AI. Coba lagi.");
      }
    });
  };

  // Panel terbuka dengan penjelasan
  if (open && explanation) {
    return (
      <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
        <div className="mb-1.5 flex items-center justify-between">
          <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
            <Sparkles className="h-3 w-3" />
            Penjelasan Pola
          </div>
          <button
            onClick={() => setOpen(false)}
            className="inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] text-muted-foreground transition hover:bg-primary/10"
            aria-label="Tutup penjelasan"
          >
            <ChevronUp className="h-3 w-3" />
            Tutup
          </button>
        </div>
        <div className="text-[12px]">
          <MarkdownContent content={explanation} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <button
        onClick={fetchExplanation}
        disabled={isPending}
        className="inline-flex items-center gap-1 rounded-md border border-primary/40 bg-primary/5 px-2 py-1 text-[10px] font-semibold text-primary transition hover:bg-primary/10 disabled:opacity-50"
      >
        {isPending ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Sparkles className="h-3 w-3" />
        )}
        {isPending ? "Menjelaskan..." : "Jelaskan pola ini"}
      </button>

      {error && (
        <div className="flex items-start gap-1 rounded-md border border-bear/30 bg-bear-soft px-2 py-1 text-[10px] text-bear">
          <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
