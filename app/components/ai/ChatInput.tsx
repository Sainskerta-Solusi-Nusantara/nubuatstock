"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";
import { Send, Square } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface ChatInputProps {
  onSubmit: (message: string, opts: { deepResearch: boolean }) => void;
  onStop?: () => void;
  disabled?: boolean;
  streaming?: boolean;
  placeholder?: string;
}

export function ChatInput({ onSubmit, onStop, disabled, streaming, placeholder }: ChatInputProps) {
  const [value, setValue] = useState("");
  const [deepResearch, setDeepResearch] = useState(false);

  function submit(e?: FormEvent) {
    e?.preventDefault();
    if (streaming && onStop) {
      onStop();
      return;
    }
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSubmit(trimmed, { deepResearch });
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
        <label className="flex cursor-pointer items-center gap-1.5">
          <input
            type="checkbox"
            checked={deepResearch}
            onChange={(e) => setDeepResearch(e.target.checked)}
            className="h-3.5 w-3.5"
            disabled={streaming}
          />
          Deep Research <span className="text-[10px] opacity-70">(Pro+)</span>
        </label>
        <span className="text-[10px] opacity-70">Enter = kirim · Shift+Enter = baris baru</span>
      </div>
    </form>
  );
}
