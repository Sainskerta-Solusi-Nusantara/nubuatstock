"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";
import { Send, Sparkles, Square } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ChatInputProps {
  onSubmit: (message: string, opts: { deepMode: boolean }) => void;
  onStop?: () => void;
  disabled?: boolean;
  streaming?: boolean;
  placeholder?: string;
  /** Apakah user punya entitlement `feature.ai_deep_mode` (Elite). */
  deepModeAvailable?: boolean;
}

export function ChatInput({
  onSubmit,
  onStop,
  disabled,
  streaming,
  placeholder,
  deepModeAvailable = false,
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const [deepMode, setDeepMode] = useState(false);

  function submit(e?: FormEvent) {
    e?.preventDefault();
    if (streaming && onStop) {
      onStop();
      return;
    }
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSubmit(trimmed, { deepMode: deepModeAvailable && deepMode });
    setValue("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  const showStop = streaming && onStop;

  return (
    <form onSubmit={submit} className="border-t border-border bg-card p-3">
      <div className="flex items-end gap-2">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          rows={2}
          disabled={disabled && !showStop}
          placeholder={
            placeholder ??
            "Tanyakan analisis saham IDX… (Shift+Enter untuk baris baru, Enter untuk kirim)"
          }
          className={cn(
            "flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm",
            "focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary",
          )}
        />
        <button
          type="submit"
          disabled={(disabled && !showStop) || (!showStop && value.trim().length === 0)}
          className={cn(
            "inline-flex h-10 items-center gap-1 rounded-md px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
            showStop
              ? "bg-bear text-white hover:bg-bear/85"
              : "bg-primary text-primary-foreground hover:brightness-110",
          )}
        >
          {showStop ? (
            <>
              <Square className="h-3.5 w-3.5 fill-current" />
              Stop
            </>
          ) : (
            <>
              <Send className="h-3.5 w-3.5" />
              Kirim
            </>
          )}
        </button>
      </div>
      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
        {deepModeAvailable ? (
          <label className="flex cursor-pointer items-center gap-1.5">
            <input
              type="checkbox"
              checked={deepMode}
              onChange={(e) => setDeepMode(e.target.checked)}
              className="h-3.5 w-3.5"
              disabled={streaming}
            />
            <Sparkles className="h-3 w-3 text-primary" />
            Deep Mode
          </label>
        ) : (
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex cursor-not-allowed items-center gap-1.5 opacity-50">
                  <input
                    type="checkbox"
                    checked={false}
                    readOnly
                    disabled
                    className="h-3.5 w-3.5"
                  />
                  <Sparkles className="h-3 w-3" />
                  Deep Mode
                  <span className="rounded bg-primary/10 px-1 text-[10px] font-medium text-primary">
                    Elite
                  </span>
                </span>
              </TooltipTrigger>
              <TooltipContent>Deep Mode tersedia di tier Elite</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        <span className="text-[10px] opacity-70">Enter = kirim · Shift+Enter = baris baru</span>
      </div>
    </form>
  );
}
