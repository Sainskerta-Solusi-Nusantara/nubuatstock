"use client";

import * as React from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils/cn";

/**
 * Markdown renderer untuk konten lesson Academy.
 *
 * Reuse pola dari components/ai/MarkdownContent.tsx (react-markdown + remark-gfm),
 * tapi disesuaikan untuk konteks "membaca artikel panjang" (spacing prose lega,
 * heading lebih besar) bukan chat. Tidak menambah dependency baru.
 */
export function LessonMarkdown({ content }: { content: string }) {
  return (
    <div className="text-[15px] leading-relaxed text-foreground">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="mt-8 mb-3 text-2xl font-bold tracking-tight first:mt-0">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="mt-8 mb-3 text-xl font-bold tracking-tight first:mt-0">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-6 mb-2 text-base font-bold first:mt-0">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="mt-4 mb-1.5 text-sm font-semibold uppercase tracking-wide text-muted-foreground first:mt-0">
              {children}
            </h4>
          ),
          p: ({ children }) => <p className="mb-4 last:mb-0 text-muted-foreground">{children}</p>,
          ul: ({ children }) => (
            <ul className="mb-4 ml-5 list-disc space-y-1.5 text-muted-foreground last:mb-0">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-4 ml-5 list-decimal space-y-1.5 text-muted-foreground last:mb-0">{children}</ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          table: ({ children }) => (
            <div className="my-4 overflow-x-auto rounded-md border border-border">
              <table className="w-full text-sm">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="border-b border-border bg-muted/50">{children}</thead>
          ),
          th: ({ children }) => <th className="px-3 py-2 text-left font-semibold">{children}</th>,
          td: ({ children }) => <td className="px-3 py-2 align-top text-muted-foreground">{children}</td>,
          tr: ({ children }) => <tr className="border-b border-border last:border-b-0">{children}</tr>,
          code: ({ inline, children, ...rest }: { inline?: boolean; className?: string; children?: React.ReactNode }) => {
            if (inline) {
              return (
                <code className="rounded bg-secondary px-1 py-0.5 font-mono text-[0.85em] text-foreground" {...rest}>
                  {children}
                </code>
              );
            }
            const text = String(children).replace(/\n$/, "");
            return (
              <pre className="my-4 overflow-x-auto rounded-md border border-border bg-secondary/50 p-3 text-[13px] leading-relaxed">
                <code className="font-mono">{text}</code>
              </pre>
            );
          },
          pre: ({ children }) => <>{children}</>,
          a: ({ href, children }) => {
            if (href && (href.startsWith("/") || href.startsWith("#"))) {
              return (
                <Link href={href} className="text-primary underline-offset-2 hover:underline">
                  {children}
                </Link>
              );
            }
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline-offset-2 hover:underline"
              >
                {children}
              </a>
            );
          },
          blockquote: ({ children }) => (
            <blockquote
              className={cn(
                "my-4 rounded-r-md border-l-4 border-primary/40 bg-primary/5 py-2 pl-4 pr-3 text-sm text-muted-foreground",
              )}
            >
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-6 border-border" />,
          strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
