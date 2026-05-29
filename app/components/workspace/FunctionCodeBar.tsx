"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Terminal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FUNCTION_CODES, parseFunctionInput } from "./function-codes";

interface FunctionCodeBarProps {
  /** Dipanggil kalau kode menghasilkan ticker — workspace bisa buka pane. */
  onTicker?: (ticker: string) => void;
}

/**
 * Bloomberg-style command line: ketik "<TICKER> <CODE>" → navigate.
 * Mis. "BBRI DES", "EQS", "BMRI BMAP".
 */
export function FunctionCodeBar({ onTicker }: FunctionCodeBarProps) {
  const router = useRouter();
  const [value, setValue] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFunctionInput(value);
    if (!parsed.ok || !parsed.href) {
      setError(parsed.error ?? "Input tidak valid");
      return;
    }
    setError(null);
    if (parsed.ticker && onTicker) onTicker(parsed.ticker);
    router.push(parsed.href);
    setValue("");
  };

  return (
    <div className="space-y-1.5">
      <form onSubmit={submit} className="flex items-center gap-2">
        <div className="relative flex-1">
          <Terminal
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (error) setError(null);
            }}
            placeholder="Function code (mis. BBRI DES, EQS, BMRI BMAP)"
            aria-label="Function code command line"
            className="h-9 pl-8 font-mono text-sm uppercase"
          />
        </div>
        <Button type="submit" size="sm" className="h-9">
          Jalankan
          <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
        </Button>
      </form>

      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : (
        <div className="flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
          {FUNCTION_CODES.map((f) => (
            <span
              key={f.code}
              className="rounded border bg-muted/40 px-1.5 py-0.5"
              title={f.label}
            >
              <span className="font-mono font-semibold text-foreground">
                {f.code}
              </span>{" "}
              {f.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
