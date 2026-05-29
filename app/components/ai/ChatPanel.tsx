"use client";

import * as React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { ToolCallCard } from "./ToolCallCard";
import type { AiCitation, AiMessageDTO, ChatStreamChunk } from "@/lib/types/ai";

interface ChatPanelProps {
  conversationId: string | null;
  initialMessages: AiMessageDTO[];
  contextKode?: string | null;
  /** Apakah user punya entitlement `feature.ai_deep_mode` (Elite). */
  deepModeAvailable?: boolean;
}

interface UiMessage {
  id: string;
  role: string;
  content: string;
  toolName?: string | null;
  contentFormat?: string;
  pending?: boolean;
  tokensInput?: number | null;
  tokensOutput?: number | null;
  tokensCached?: number | null;
  citations?: AiCitation[];
}

interface UiToolCall {
  id: string;
  toolName: string;
  args: Record<string, unknown>;
  status: "pending" | "ok" | "error";
  latencyMs?: number;
}

export function ChatPanel({
  conversationId,
  initialMessages,
  contextKode,
  deepModeAvailable = false,
}: ChatPanelProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<UiMessage[]>(() =>
    initialMessages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      toolName: m.toolName,
      contentFormat: m.contentFormat,
      citations: m.citations,
    })),
  );
  const [activeToolCalls, setActiveToolCalls] = useState<UiToolCall[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [activeConvId, setActiveConvId] = useState<string | null>(conversationId);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    setStreaming(false);
  }, []);

  // Regenerate: cari last user message, strip assistant terakhir, send ulang.
  const regenerate = useCallback(() => {
    setMessages((prev) => {
      const lastUserIdx = [...prev].reverse().findIndex((m) => m.role === "user");
      if (lastUserIdx === -1) return prev;
      const actualIdx = prev.length - 1 - lastUserIdx;
      const lastUserMsg = prev[actualIdx];
      if (!lastUserMsg) return prev;
      // Strip everything after the last user message
      const trimmed = prev.slice(0, actualIdx);
      // Defer the actual sendMessage call
      setTimeout(() => {
        sendMessageRef.current?.(lastUserMsg.content, { deepMode: false });
      }, 50);
      return trimmed;
    });
  }, []);

  const sendMessageRef = useRef<((text: string, opts: { deepMode: boolean }) => void) | null>(null);

  // Auto-scroll only kalau user sudah dekat bottom (avoid jerking scrol kalau user scroll up to read)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom < 200) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [messages, activeToolCalls]);

  const sendMessage = useCallback(
    async (text: string, opts: { deepMode: boolean }) => {
      setError(null);
      setStreaming(true);

      const userTempId = `tmp-u-${Date.now()}`;
      const assistantTempId = `tmp-a-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        { id: userTempId, role: "user", content: text, contentFormat: "text" },
        {
          id: assistantTempId,
          role: "assistant",
          content: "",
          contentFormat: "markdown",
          pending: true,
        },
      ]);
      setActiveToolCalls([]);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId: activeConvId ?? undefined,
            message: text,
            contextKode: contextKode ?? undefined,
            deepMode: opts.deepMode,
          }),
          signal: controller.signal,
        });
        if (!res.ok || !res.body) {
          const errText = await res.text();
          throw new Error(`HTTP ${res.status}: ${errText.slice(0, 200)}`);
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let assistantContent = "";

        const updateAssistant = (delta: string) => {
          assistantContent += delta;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantTempId ? { ...m, content: assistantContent } : m,
            ),
          );
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const payload = line.slice(6).trim();
            if (payload === "[DONE]") continue;
            try {
              const chunk = JSON.parse(payload) as ChatStreamChunk;
              if (chunk.type === "conversation") {
                if (activeConvId !== chunk.conversationId) {
                  setActiveConvId(chunk.conversationId);
                  // Update URL without remount.
                  history.replaceState(null, "", `/copilot/${chunk.conversationId}`);
                }
              } else if (chunk.type === "delta") {
                updateAssistant(chunk.content);
              } else if (chunk.type === "tool_call") {
                setActiveToolCalls((p) => [
                  ...p,
                  {
                    id: chunk.toolCallId,
                    toolName: chunk.toolName,
                    args: chunk.arguments,
                    status: "pending",
                  },
                ]);
              } else if (chunk.type === "tool_result") {
                setActiveToolCalls((p) =>
                  p.map((t) =>
                    t.id === chunk.toolCallId
                      ? {
                          ...t,
                          status: chunk.ok ? "ok" : "error",
                          latencyMs: chunk.latencyMs,
                        }
                      : t,
                  ),
                );
              } else if (chunk.type === "usage") {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantTempId
                      ? {
                          ...m,
                          tokensInput: chunk.tokensInput,
                          tokensOutput: chunk.tokensOutput,
                          tokensCached: chunk.tokensCached,
                        }
                      : m,
                  ),
                );
              } else if (chunk.type === "citations") {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantTempId ? { ...m, citations: chunk.citations } : m,
                  ),
                );
              } else if (chunk.type === "done") {
                setMessages((prev) =>
                  prev.map((m) => (m.id === assistantTempId ? { ...m, pending: false } : m)),
                );
              } else if (chunk.type === "error") {
                setError(`${chunk.code}: ${chunk.message}`);
              }
            } catch {
              // Ignore malformed JSON line.
            }
          }
        }
        // Refresh sidebar conversation list.
        router.refresh();
      } catch (err) {
        // AbortError = user stopped manually, jangan tampilkan sebagai error
        const aborted = err instanceof Error && err.name === "AbortError";
        if (!aborted) {
          setError(err instanceof Error ? err.message : String(err));
        }
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantTempId
              ? {
                  ...m,
                  content: m.content || (aborted ? "_(dihentikan oleh pengguna)_" : "_(gagal menerima respons)_"),
                  pending: false,
                }
              : m,
          ),
        );
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [activeConvId, contextKode, router],
  );

  // Keep ref in sync untuk regenerate
  React.useEffect(() => {
    sendMessageRef.current = sendMessage;
  }, [sendMessage]);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-4 md:px-4">
        {messages.length === 0 && (
          <EmptyState contextKode={contextKode ?? null} onPick={(q) => sendMessage(q, { deepMode: false })} />
        )}
        {messages.map((m, i) => {
          // Find last assistant message that's not pending
          const isLastAssistant =
            m.role === "assistant" &&
            !m.pending &&
            i === messages.findLastIndex((x) => x.role === "assistant" && !x.pending);
          return (
            <ChatMessage
              key={m.id}
              role={m.role}
              content={m.content}
              toolName={m.toolName}
              contentFormat={m.contentFormat}
              pending={m.pending}
              tokensInput={m.tokensInput}
              tokensOutput={m.tokensOutput}
              tokensCached={m.tokensCached}
              citations={m.citations}
              onRegenerate={isLastAssistant && !streaming ? regenerate : undefined}
            />
          );
        })}
        {activeToolCalls.map((t) => (
          <ToolCallCard
            key={t.id}
            toolName={t.toolName}
            args={t.args}
            status={t.status}
            latencyMs={t.latencyMs}
          />
        ))}
        {error && (
          <div className="my-3 rounded-md border border-bear/40 bg-bear-soft p-3 text-xs text-bear">
            <div className="flex items-start gap-2">
              <span className="font-bold">⚠️ Error</span>
              <div className="flex-1">
                <div>{error}</div>
                <button
                  onClick={() => setError(null)}
                  className="mt-1 text-[10px] underline opacity-70 hover:opacity-100"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <ChatInput
        onSubmit={sendMessage}
        onStop={stopStreaming}
        streaming={streaming}
        disabled={streaming}
        deepModeAvailable={deepModeAvailable}
        placeholder={
          contextKode
            ? `Tanyakan tentang ${contextKode}…`
            : undefined
        }
      />
    </div>
  );
}

function EmptyState({
  contextKode,
  onPick,
}: {
  contextKode: string | null;
  onPick: (q: string) => void;
}) {
  // Suggestions grouped per category — showcase semua tool capabilities
  const groups = contextKode
    ? [
        {
          title: "📊 Analisis",
          items: [
            `Analisis lengkap ${contextKode} — technical + fundamental`,
            `Apa setup teknikal ${contextKode} sekarang?`,
            `Berita & sentimen ${contextKode} 30 hari terakhir`,
          ],
        },
        {
          title: "💡 Backtest & Strategy",
          items: [
            `Backtest ${contextKode} pakai RSI 30/70 1 tahun terakhir`,
            `Backtest SMA 20/50 crossover di ${contextKode}`,
            `Apakah breakout 20-day high profitable di ${contextKode}?`,
          ],
        },
      ]
    : [
        {
          title: "📊 Analisis Cepat",
          items: [
            "Daily Picks hari ini dan reasoning-nya",
            "Bandingkan BBRI vs BMRI dari sisi PE forward dan ROE",
            "Apa berita bullish hari ini?",
            "Berita yang membahas saham mining bulan ini",
          ],
        },
        {
          title: "💡 Strategy & Backtest",
          items: [
            'Backtest BBRI: beli saat RSI < 30 jual saat RSI > 70, 1 tahun terakhir',
            "Screen saham coal dengan ROE > 15% dan PE < 12",
            "Saham apa yang Wave 3 Elliott sekarang?",
          ],
        },
        {
          title: "📚 Edukasi",
          items: [
            "Apa itu Wyckoff Distribution phase?",
            "Cara baca Bollinger Band squeeze",
            "Beda saham Syariah vs konvensional dari sisi screening",
          ],
        },
      ];

  return (
    <div className="mx-auto max-w-3xl py-8">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <span className="text-2xl">🤖</span>
        </div>
        <h2 className="text-xl font-bold tracking-tight">Nubuat AI Buddy</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Asisten analisis saham Indonesia dengan 9 tools: harga, fundamental, news, backtest,
          screener, dan lainnya. Tanya apa saja tentang IDX.
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((g) => (
          <div key={g.title}>
            <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {g.title}
            </h3>
            <div className="space-y-1.5">
              {g.items.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onPick(s)}
                  className="block w-full rounded-md border border-border bg-card px-3 py-2 text-left text-xs leading-snug text-foreground transition hover:border-primary/40 hover:bg-accent"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-6 text-center text-[11px] text-muted-foreground">
        💡 Tip: Tekan{" "}
        <kbd className="rounded border border-border bg-card px-1 py-0.5 font-mono text-[10px]">
          Cmd+K
        </kbd>{" "}
        di mana saja untuk command palette.
      </p>
    </div>
  );
}
