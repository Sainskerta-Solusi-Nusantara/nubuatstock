"use client";

import * as React from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface Props {
  content: string;
  isUser?: boolean;
}

/**
 * Throttle markdown re-parse selama streaming progresif.
 *
 * Tanpa throttle: setiap delta chunk dari SSE → re-parse full markdown → CPU spike.
 *
 * Kenapa throttle (bukan pure debounce): saat token mengalir cepat & terus-menerus
 * (gap antar-delta < interval), pure debounce akan terus me-reset timer sehingga
 * render bisa "macet" sampai stream berhenti. Throttle leading+trailing menjamin UI
 * ter-update minimal setiap ~interval (≈16fps) sambil tetap menampilkan chunk terakhir.
 *
 * - Render pertama (leading): langsung, tanpa delay → tidak ada flash kosong.
 * - Update berikutnya: di-batch per `interval` ms via rAF (hemat CPU, halus).
 * - Update terakhir (trailing): dijamin tampil walau datang di tengah window throttle.
 */
function useThrottledContent(content: string, interval = 60): string {
  const [shown, setShown] = React.useState(content);
  const lastFlush = React.useRef<number>(0);
  const latest = React.useRef(content);
  const rafId = React.useRef<number | null>(null);
  const timerId = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  latest.current = content;

  React.useEffect(() => {
    // Jika sudah sinkron (mis. pesan historis statis), tidak ada kerja.
    if (shown === content) return;

    const now = Date.now();
    const elapsed = now - lastFlush.current;

    const flush = () => {
      lastFlush.current = Date.now();
      rafId.current = null;
      timerId.current = null;
      setShown(latest.current);
    };

    const scheduleRaf = () => {
      if (typeof requestAnimationFrame === "function") {
        rafId.current = requestAnimationFrame(flush);
      } else {
        flush();
      }
    };

    if (elapsed >= interval) {
      // Leading edge / window sudah lewat → render segera (di rAF berikutnya).
      scheduleRaf();
    } else if (timerId.current === null) {
      // Trailing edge → render di akhir window throttle.
      timerId.current = setTimeout(scheduleRaf, interval - elapsed);
    }

    return () => {
      if (rafId.current !== null && typeof cancelAnimationFrame === "function") {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
      if (timerId.current !== null) {
        clearTimeout(timerId.current);
        timerId.current = null;
      }
    };
  }, [content, shown, interval]);

  return shown;
}

/**
 * Markdown renderer untuk AI Buddy messages.
 *
 * Features:
 * - GitHub-flavored markdown (tables, strikethrough, autolinks)
 * - Ticker auto-link (BBRI → /ticker/BBRI) via post-process
 * - Code blocks dengan copy button
 * - Compact spacing untuk chat context
 * - Inline color hint untuk numbers dengan % (bullish/bearish)
 */
export function MarkdownContent({ content, isUser = false }: Props) {
  // Throttle ~60ms (≈16fps) supaya streaming progresif tidak overload CPU
  // (re-parse full markdown setiap delta) sambil tetap halus & responsif.
  const throttled = useThrottledContent(content, 60);
  // Pre-process: auto-link 4-letter UPPERCASE ticker codes
  // Wrap as [BBRI](/ticker/BBRI) BUT only OUTSIDE code blocks / links / tables
  const preprocessed = React.useMemo(() => autoLinkTickers(throttled), [throttled]);

  const baseTextClass = isUser ? "text-white/95" : "text-foreground";
  const linkClass = isUser ? "text-white underline underline-offset-2 hover:text-white/80" : "text-primary underline-offset-2 hover:underline";
  const codeClass = isUser ? "bg-white/15 text-white" : "bg-secondary text-foreground";

  return (
    <div className={cn("text-sm leading-relaxed", baseTextClass)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Headings — compact
          h1: ({ children }) => <h1 className="mt-3 mb-2 text-base font-bold first:mt-0">{children}</h1>,
          h2: ({ children }) => <h2 className="mt-3 mb-2 text-base font-bold first:mt-0">{children}</h2>,
          h3: ({ children }) => <h3 className="mt-2.5 mb-1.5 text-sm font-bold first:mt-0">{children}</h3>,
          h4: ({ children }) => <h4 className="mt-2 mb-1 text-sm font-semibold first:mt-0">{children}</h4>,
          // Paragraphs
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          // Lists
          ul: ({ children }) => <ul className="mb-2 ml-4 list-disc space-y-1 last:mb-0">{children}</ul>,
          ol: ({ children }) => <ol className="mb-2 ml-5 list-decimal space-y-1 last:mb-0">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          // Tables — wrap with overflow
          table: ({ children }) => (
            <div className={cn("my-2 overflow-x-auto rounded-md border", isUser ? "border-white/20" : "border-border")}>
              <table className="w-full text-xs">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className={cn("border-b", isUser ? "border-white/20 bg-white/10" : "border-border bg-muted/50")}>{children}</thead>,
          th: ({ children }) => <th className="px-2 py-1.5 text-left font-semibold">{children}</th>,
          td: ({ children }) => <td className="px-2 py-1 align-top">{children}</td>,
          tr: ({ children }) => <tr className={cn("border-b last:border-b-0", isUser ? "border-white/10" : "border-border")}>{children}</tr>,
          // Code
          code: ({ inline, className, children, ...rest }: { inline?: boolean; className?: string; children?: React.ReactNode }) => {
            if (inline) {
              return (
                <code className={cn("rounded px-1 py-0.5 font-mono text-[0.85em]", codeClass)} {...rest}>
                  {children}
                </code>
              );
            }
            const lang = className?.replace("language-", "") ?? "";
            const text = String(children).replace(/\n$/, "");
            return <CodeBlock text={text} lang={lang} isUser={isUser} />;
          },
          pre: ({ children }) => <>{children}</>,
          // Links — Next Link kalau internal (/...), external pakai <a>
          a: ({ href, children }) => {
            if (href && (href.startsWith("/") || href.startsWith("#"))) {
              return (
                <Link href={href} className={linkClass}>
                  {children}
                </Link>
              );
            }
            return (
              <a href={href} target="_blank" rel="noopener noreferrer" className={linkClass}>
                {children}
              </a>
            );
          },
          // Blockquote
          blockquote: ({ children }) => (
            <blockquote
              className={cn(
                "my-2 border-l-4 pl-3 italic",
                isUser ? "border-white/30 text-white/85" : "border-primary/40 text-muted-foreground",
              )}
            >
              {children}
            </blockquote>
          ),
          // Horizontal rule
          hr: () => <hr className={cn("my-3", isUser ? "border-white/20" : "border-border")} />,
          // Strong / em
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
        }}
      >
        {preprocessed}
      </ReactMarkdown>
    </div>
  );
}

function CodeBlock({ text, lang, isUser }: { text: string; lang: string; isUser: boolean }) {
  const [copied, setCopied] = React.useState(false);
  const copy = React.useCallback(() => {
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [text]);

  return (
    <div className={cn("group relative my-2 overflow-hidden rounded-md border", isUser ? "border-white/20" : "border-border bg-secondary/50")}>
      {(lang || text.length > 50) && (
        <div className={cn("flex items-center justify-between border-b px-2 py-1 text-[10px]", isUser ? "border-white/10 bg-white/5" : "border-border bg-muted/50")}>
          <span className="font-mono uppercase tracking-wide opacity-70">{lang || "code"}</span>
          <button
            onClick={copy}
            className={cn(
              "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] transition",
              isUser ? "text-white/80 hover:bg-white/10" : "text-muted-foreground hover:bg-muted",
            )}
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      )}
      <pre className="overflow-x-auto p-2.5 text-[11px] leading-relaxed">
        <code className="font-mono">{text}</code>
      </pre>
    </div>
  );
}

/**
 * Auto-link 4-letter UPPERCASE ticker codes that look like IDX tickers.
 * Skip kalau sudah dalam markdown link [text](url) atau code block.
 */
function autoLinkTickers(input: string): string {
  // Skip blocks: code (```...```) and inline code (`...`) and existing links
  const lines = input.split("\n");
  let inCodeBlock = false;
  const out: string[] = [];

  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      out.push(line);
      continue;
    }
    if (inCodeBlock) {
      out.push(line);
      continue;
    }

    // Process line: split by inline code segments and markdown links
    let result = "";
    let i = 0;
    while (i < line.length) {
      // Skip inline code `...`
      if (line[i] === "`") {
        const end = line.indexOf("`", i + 1);
        if (end > i) {
          result += line.slice(i, end + 1);
          i = end + 1;
          continue;
        }
      }
      // Skip markdown link [text](url)
      if (line[i] === "[") {
        const close = line.indexOf("](", i);
        if (close > i) {
          const linkEnd = line.indexOf(")", close + 2);
          if (linkEnd > close) {
            result += line.slice(i, linkEnd + 1);
            i = linkEnd + 1;
            continue;
          }
        }
      }
      result += line[i];
      i += 1;
    }

    // Now apply ticker auto-link on non-code/non-link segments.
    // Pattern: \b[A-Z]{4}\b but skip common acronyms.
    const COMMON_ACRONYMS = new Set([
      "IDX", "BEI", "OJK", "CEO", "CFO", "CTO", "COO", "IPO", "PER", "EPS",
      "ROE", "ROI", "ROA", "MFI", "RSI", "MACD", "SMA", "EMA", "ATR", "ADX",
      "USD", "IDR", "USDT", "WIB", "WIT", "USA", "MSCI", "FTSE", "PBV", "ESG",
      "DCF", "DDM", "RRG", "EOD", "EOS", "EBIT", "EBITDA", "EBITDARM",
    ]);
    const finalLine = result.replace(/\b([A-Z]{4})\b/g, (m, code) => {
      if (COMMON_ACRONYMS.has(code)) return m;
      return `[${code}](/ticker/${code})`;
    });

    out.push(finalLine);
  }

  return out.join("\n");
}
