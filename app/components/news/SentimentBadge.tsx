import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface SentimentBadgeProps {
  sentiment: "bullish" | "neutral" | "bearish" | null;
  score: number | null;
  reason?: string | null;
  size?: "sm" | "md";
}

export function SentimentBadge({ sentiment, score, reason, size = "sm" }: SentimentBadgeProps) {
  if (!sentiment) {
    return (
      <span
        title="Sentimen otomatis belum dinilai untuk artikel ini."
        className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
      >
        <Minus className="h-3 w-3" />
        Belum dinilai
      </span>
    );
  }

  const config = {
    bullish: {
      Icon: TrendingUp,
      bg: "bg-bull-soft",
      fg: "text-bull",
      label: "Bullish",
    },
    bearish: {
      Icon: TrendingDown,
      bg: "bg-bear-soft",
      fg: "text-bear",
      label: "Bearish",
    },
    neutral: {
      Icon: Minus,
      bg: "bg-muted",
      fg: "text-muted-foreground",
      label: "Neutral",
    },
  } as const;

  const c = config[sentiment];

  return (
    <span
      title={reason ?? undefined}
      className={cn(
        "inline-flex items-center gap-1 rounded font-medium",
        c.bg,
        c.fg,
        size === "md" ? "px-2 py-0.5 text-xs" : "px-1.5 py-0.5 text-[10px]",
      )}
    >
      <c.Icon className={size === "md" ? "h-3.5 w-3.5" : "h-3 w-3"} />
      <span>{c.label}</span>
      {score != null && (
        <span className="opacity-70 font-mono">
          {score >= 0 ? "+" : ""}
          {score.toFixed(2)}
        </span>
      )}
    </span>
  );
}
