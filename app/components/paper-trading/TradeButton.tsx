"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { TrendingUp, TrendingDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

interface TradeButtonProps {
  kode: string;
  defaultSide?: "buy" | "sell";
  /** Optional pre-filled context note (mis. "Follow Daily Pick BBRI 12 Mei") */
  defaultNote?: string;
  /** Optional source identifier */
  source?: string;
  label?: string;
  variant?: "default" | "compact";
}

export function TradeButton({
  kode,
  defaultSide = "buy",
  defaultNote,
  source = "manual",
  label,
  variant = "default",
}: TradeButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [side, setSide] = useState<"buy" | "sell">(defaultSide);
  const [quantity, setQuantity] = useState<number>(100);
  const [note, setNote] = useState(defaultNote ?? "");
  const [isPending, startTransition] = useTransition();

  const submit = () => {
    if (quantity <= 0 || quantity % 100 !== 0) {
      toast.error("Quantity harus kelipatan 100");
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch("/api/paper/trade", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kode, side, quantity, source, note: note || undefined }),
        });
        const data = await res.json();
        if (!data.ok) {
          toast.error(data.error?.message ?? "Trade gagal");
          return;
        }
        const t = data.data.trade;
        toast.success(
          `${t.side === "buy" ? "BUY" : "SELL"} ${t.quantity} ${t.kode} @ ${t.priceIdr.toLocaleString("id-ID")}`,
          { description: `Fee Rp ${Math.round(t.feeIdr).toLocaleString("id-ID")}` },
        );
        setOpen(false);
        router.refresh();
      } catch {
        toast.error("Gagal hubungi server");
      }
    });
  };

  return (
    <>
      <Button
        variant={defaultSide === "buy" ? "default" : "outline"}
        size={variant === "compact" ? "sm" : "default"}
        onClick={() => setOpen(true)}
      >
        {defaultSide === "buy" ? (
          <TrendingUp className="mr-1 h-3.5 w-3.5" />
        ) : (
          <TrendingDown className="mr-1 h-3.5 w-3.5" />
        )}
        {label ?? `Paper ${defaultSide === "buy" ? "Buy" : "Sell"}`}
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-lg border border-border bg-card p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold">Paper Trade {kode}</h2>
              <button onClick={() => setOpen(false)} aria-label="Close">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            {/* Side toggle */}
            <div className="mb-3 grid grid-cols-2 gap-1 rounded-md bg-muted p-1">
              <button
                onClick={() => setSide("buy")}
                className={cn(
                  "rounded px-3 py-2 text-sm font-bold transition",
                  side === "buy" ? "bg-bull text-white" : "text-muted-foreground hover:text-foreground",
                )}
              >
                BUY
              </button>
              <button
                onClick={() => setSide("sell")}
                className={cn(
                  "rounded px-3 py-2 text-sm font-bold transition",
                  side === "sell" ? "bg-bear text-white" : "text-muted-foreground hover:text-foreground",
                )}
              >
                SELL
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Quantity (kelipatan 100)
                </label>
                <input
                  type="number"
                  step="100"
                  min="100"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value || "0", 10))}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 font-mono text-base"
                />
                <div className="mt-1 flex gap-1">
                  {[100, 500, 1000, 5000].map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setQuantity(q)}
                      className="rounded border border-border bg-background px-2 py-0.5 text-xs hover:bg-accent"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Note (opsional)
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="mis. Follow daily pick, breakout SMA50..."
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  maxLength={500}
                />
              </div>

              <p className="rounded-md bg-muted/40 p-2 text-[11px] text-muted-foreground">
                Eksekusi pakai harga last close + fee {side === "buy" ? "0.15%" : "0.25%"}. Paper trading
                — bukan order broker sungguhan.
              </p>

              <Button
                onClick={submit}
                disabled={isPending}
                className={cn(
                  "w-full",
                  side === "buy" ? "bg-bull hover:bg-bull/85" : "bg-bear hover:bg-bear/85",
                )}
              >
                {isPending ? "Processing..." : `Confirm ${side.toUpperCase()} ${quantity} ${kode}`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
