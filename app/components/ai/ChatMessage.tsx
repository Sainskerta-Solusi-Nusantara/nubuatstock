"use client";

import * as React from "react";
import { Check, ChevronDown, Copy, RefreshCw, Sparkles, User, Wrench, Zap } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { MarkdownContent } from "./MarkdownContent";

interface ChatMessageProps {
  role: string;
  content: string;
  toolName?: string | null;
  contentFormat?: string;
  pending?: boolean;
  tokensInput?: number | null;
  tokensOutput?: number | null;
  tokensCached?: number | null;
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

function ToolMessage({ toolName, content }: { toolName?: string | null; content: string }) {
  const [expanded, setExpanded] = React.useState(false);
  const label = toolName ? TOOL_LABELS[toolName] ?? toolName : "tool call";
  const summary = buildToolSummary(content);

  return (
    <div className="my-1.5 flex items-start gap-2">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary">
        <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <button
          onClick={() => setExpanded((e) => !e)}
          className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-border bg-card/50 px-2 py-1 text-[11px] transition hover:bg-card"
        >
          <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-primary">
            {toolName ?? "tool"}
          </span>
          <span className="shrink-0 font-medium">{label}</span>
          {summary && (
            <span className="truncate text-muted-foreground">· {summary}</span>
          )}
          <ChevronDown
            className={cn("h-3 w-3 shrink-0 text-muted-foreground transition-transform", expanded && "rotate-180")}
          />
        </button>
        {expanded && (
          <pre className="mt-1 max-h-64 overflow-auto rounded-md border border-border bg-secondary/30 p-2 text-[10px] leading-relaxed">
            <code>{truncate(prettyJson(content), 3000)}</code>
          </pre>
        )}
      </div>
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
