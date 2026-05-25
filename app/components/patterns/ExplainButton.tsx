"use client";

import { useState, useTransition } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  patternId: string;
  initialExplanation?: string | null;
}

export function ExplainButton({ patternId, initialExplanation }: Props) {
  const [explanation, setExplanation] = useState<string | null>(
    initialExplanation?.startsWith("AI:") ? initialExplanation.replace(/^AI:\s*/, "") : null,
  );
  const [isPending, startTransition] = useTransition();

  const fetchExplanation = () => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/patterns/explain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ patternId }),
        });
        const data = await res.json();
        if (!data.ok) {
          toast.error(data.error ?? "Gagal generate explanation");
          return;
        }
        setExplanation(data.data.explanation || "Tidak ada response dari AI");
      } catch {
        toast.error("Gagal hubungi AI service");
      }
    });
  };

  if (explanation) {
    return (
      <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
        <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
          <Sparkles className="h-3 w-3" />
          AI Explanation
        </div>
        <div className="text-[11px] leading-relaxed text-foreground whitespace-pre-line">
          {explanation}
        </div>
      </div>
    );
  }

  return (
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
      {isPending ? "Generating..." : "Explain with AI"}
    </button>
  );
}
