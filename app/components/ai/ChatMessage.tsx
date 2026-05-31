"use client";

import * as React from "react";
import { Check, ChevronDown, Copy, ExternalLink, RefreshCw, Sparkles, User, Wrench, Zap } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { MarkdownContent } from "./MarkdownContent";
import type { AiCitation } from "@/lib/types/ai";

interface ChatMessageProps {
  role: string;
  content: string;
  toolName?: string | null;
  contentFormat?: string;
  pending?: boolean;
  tokensInput?: number | null;
  tokensOutput?: number | null;
  tokensCached?: number | null;
  citations?: AiCitation[];
  onRegenerate?: () => void;
}

const TOOL_LABELS: Record<string, string> = {
  get_quote: "Harga real-time",
  get_ohlcv: "Historical OHLCV",
  get_company_info: "Profil emiten",
  search_companies: "Search emiten",
  compute_indicators: "Compute indicators",
  get_user_watchlist: "Watchlist user",
  get_daily_picks: "Daily Picks",
  get_recent_news: "Berita terbaru",
  run_backtest: "Backtest strategy",
};

/**
 * Single chat bubble. Three modes:
 *   - role=user → right-aligned, primary bubble
 *   - role=assistant → left-aligned card dengan markdown rendering
 *   - role=tool → collapsed chip dengan tool name + summary; expandable JSON
 */
export function ChatMessage({
  role,
  content,
  toolName,
  contentFormat,
  pending,
  tokensInput,
  tokensOutput,
  tokensCached,
  citations,
  onRegenerate,
}: ChatMessageProps) {
  if (role === "tool") return <ToolMessage toolName={toolName} content={content} />;
  if (role === "system") return null;

  const isUser = role === "user";
  const isAssistant = role === "assistant";

  return (
    <div className={cn("group/msg my-3 flex gap-2", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
        </div>
      )}

      <div className="flex min-w-0 max-w-[85%] flex-col gap-1">
        <div
          className={cn(
            "min-w-0 overflow-hidden rounded-2xl px-4 py-2.5",
            isUser
              ? "rounded-br-sm bg-primary text-primary-foreground"
              : "rounded-bl-sm border border-border bg-card",
          )}
        >
          {contentFormat === "json" ? (
            <pre className="overflow-auto text-xs">{content}</pre>
          ) : (
            <MarkdownContent content={content} isUser={isUser} />
          )}
          {pending && (
            <span className="ml-1 inline-block h-2 w-2 animate-pulse rounded-full bg-current opacity-60" />
          )}
        </div>

        {/* Inline citations (v2) — sumber tool yang dipakai untuk grounding jawaban */}
        {isAssistant && !pending && citations && citations.length > 0 && (
          <CitationList citations={citations} />
        )}

        {/* Assistant message actions — visible on hover */}
        {isAssistant && !pending && (
          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover/msg:opacity-100">
            <CopyButton text={content} />
            {onRegenerate && <RegenerateButton onClick={onRegenerate} />}
            {(tokensInput != null || tokensOutput != null) && (
              <TokenBadge input={tokensInput} output={tokensOutput} cached={tokensCached} />
            )}
          </div>
        )}
      </div>

      {isUser && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
          <User className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <button
      onClick={() => {
        void navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      title="Copy message"
      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-muted-foreground transition hover:bg-accent hover:text-foreground"
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function RegenerateButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title="Regenerate response"
      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-muted-foreground transition hover:bg-accent hover:text-foreground"
    >
      <RefreshCw className="h-3 w-3" />
      Regenerate
    </button>
  );
}

function TokenBadge({ input, output, cached }: { input?: number | null; output?: number | null; cached?: number | null }) {
  const total = (input ?? 0) + (output ?? 0);
  const cacheHitPct = input && input > 0 && cached ? Math.round((cached / input) * 100) : 0;
  return (
    <span
      title={`Input: ${input ?? 0} tokens (${cached ?? 0} cached, ${cacheHitPct}% hit) · Output: ${output ?? 0} tokens`}
      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-muted-foreground"
    >
      <Zap className="h-3 w-3" />
      {total.toLocaleString("id-ID")} tok
      {cacheHitPct > 0 && (
        <span className="rounded bg-bull-soft px-1 text-bull">
          {cacheHitPct}% cached
        </span>
      )}
    </span>
  );
}

/**
 * Daftar chip "Sumber:" di bawah jawaban assistant (inline citations v2).
 * Citation dengan `url` jadi link; tanpa url jadi chip statis.
 */
function CitationList({ citations }: { citations: AiCitation[] }) {
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Sumber:
      </span>
      {citations.map((c, i) => {
        const label = c.kode && !c.label.includes(c.kode) ? `${c.label} (${c.kode})` : c.label;
        const inner = (
          <>
            <span className="rounded bg-primary/10 px-1 py-px font-mono text-[9px] font-bold text-primary">
              {TOOL_LABELS[c.tool] ?? c.tool}
            </span>
            <span className="max-w-[16rem] truncate">{label}</span>
            {c.url && <ExternalLink className="h-2.5 w-2.5 shrink-0 opacity-60" />}
          </>
        );
        const className =
          "inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 text-[10px] text-muted-foreground";
        const isExternal = c.url?.startsWith("http");
        return c.url ? (
          <a
            key={`${c.tool}-${i}`}
            href={c.url}
            target={isExternal ? "_blank" : undefined}
            rel={isExternal ? "noopener noreferrer" : undefined}
            title={label}
            className={cn(className, "transition hover:border-primary/40 hover:text-foreground")}
          >
            {inner}
          </a>
        ) : (
          <span key={`${c.tool}-${i}`} title={label} className={className}>
            {inner}
          </span>
        );
      })}
    </div>
  );
}

function ToolMessage({ toolName }: { toolName?: string | null; content: string }) {
  // Tampilkan HANYA label ramah Bahasa Indonesia. Detail teknis (nama tool mentah
  // mis. "search_companies", summary "count=1 • results=[1]", JSON args/hasil)
  // SENGAJA disembunyikan dari user.
  const label = toolName ? TOOL_LABELS[toolName] ?? "Menganalisis data" : "Menganalisis data";

  return (
    <div className="my-1.5 flex items-center gap-2 text-[11px] text-muted-foreground">
      <Wrench className="h-3 w-3 shrink-0" aria-hidden />
      <span>{label}</span>
    </div>
  );
}

function buildToolSummary(content: string): string {
  try {
    const parsed = JSON.parse(content);
    if (parsed.ok === false) {
      return `❌ ${parsed.error?.message ?? "Tool error"}`;
    }
    const data = parsed.data ?? parsed;
    if (typeof data !== "object" || data === null) return "";
    const keys = Object.keys(data).slice(0, 3);
    return keys
      .map((k) => {
        const v = (data as Record<string, unknown>)[k];
        if (typeof v === "number") return `${k}=${v.toLocaleString("id-ID")}`;
        if (typeof v === "string") return `${k}="${v.slice(0, 30)}"`;
        if (Array.isArray(v)) return `${k}=[${v.length}]`;
        if (typeof v === "object" && v !== null) return `${k}={…}`;
        return `${k}=${String(v).slice(0, 20)}`;
      })
      .join(" • ");
  } catch {
    return "";
  }
}

function prettyJson(s: string): string {
  try {
    return JSON.stringify(JSON.parse(s), null, 2);
  } catch {
    return s;
  }
}

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max)}\n... (${s.length - max} char terpotong)` : s;
}
