# lib/ai — AI Copilot Module (Agent 7)

## API
- `streamChat(opts)` — async generator dari `ChatStreamChunk`. Dipakai oleh
  `POST /api/ai/chat` untuk SSE streaming ke client.
- `generateTitle(conversationId, userId)` — auto-generate judul percakapan via
  mini LLM call. Dipakai oleh `POST /api/ai/conversations/[id]/title`.
- `getAiClient()` — factory OpenAI-compatible client. Provider, base URL, model, API
  key SEMUA dari DB (`app_config` + `app_secrets`). Throws `ConfigurationError`
  kalau key belum di-set.
- `loadActivePrompt(key, opts?)` — load system prompt dari tabel `ai_prompts`.
- `recordUsage(delta)` — increment daily aggregate di `ai_usage_log`.
- `retrieveContext(query)` — RAG stub. MVP return [].

## Tool Registry
File di `lib/ai/tools/*.ts`. Setiap tool mengikuti contract `ToolDefinition`:
- `name`, `description`
- `parameters` (JSON Schema)
- `handler(args, ctx)` → `ToolResult`

Tools tersedia:
- `get_quote` — wrap `lib/market-data.getQuote` (Agent 5)
- `get_ohlcv` — wrap `lib/market-data.getOhlcv`
- `get_company_info` — query langsung tabel `companies` (Agent 2)
- `search_companies` — fuzzy search
- `compute_indicators` — RSI/SMA/EMA/MACD server-side dari OHLCV
- `get_user_watchlist` — wrap `lib/watchlist` (Agent 6, dynamic import)
- `get_daily_picks` — wrap `lib/picks` (Agent 8, dynamic import)

## Configuration (semua di `app_config` & `app_secrets`)

```
ai.provider                       = "deepseek" | "openai" (anthropic future)
ai.{provider}.base_url            = string
ai.{provider}.default_model       = string
ai.{provider}.deep_model          = string
ai.{provider}.max_tokens          = number
ai.{provider}.temperature         = number
ai.{provider}.timeout_ms          = number
ai.{provider}.context_caching     = boolean
ai.system_prompt_version          = string ("v1")
ai.history_message_limit          = number (default 20)
ai.{provider}.price.input_per_1k_idr  = number (cost estimation)
ai.{provider}.price.output_per_1k_idr = number
app.disclaimer_text               = string (auto-appended ke setiap response)
```

Secrets:
- `ai.deepseek.api_key`
- `ai.openai.api_key`

## Entitlement
- `ai.queries_per_day` — quota konsumsi via `consumeQuota(userId, "ai.queries")`.
  Limit per tier diatur Agent 4 di `tier_entitlements`.

## Streaming Protocol (SSE)
`POST /api/ai/chat` → `text/event-stream`. Setiap event:
```
data: {"type":"delta","content":"..."}\n\n
```
End:
```
data: [DONE]\n\n
```
Lihat `ChatStreamChunk` di `lib/types/ai.ts`.

## File Map
```
db/schema/ai.ts          — 5 tabel (conversations, messages, tool_calls, prompts, usage_log)
db/seed/ai-prompts.ts    — seed system prompts versioned v1
lib/types/ai.ts          — Zod schemas + DTOs + ChatStreamChunk type
lib/ai/
  ├── client.ts          — OpenAI-compat factory dari DB config
  ├── prompts.ts         — load & resolve variables
  ├── chat.ts            — streamChat() + generateTitle()
  ├── usage.ts           — recordUsage() + getUserDailyUsage()
  ├── rag.ts             — stub retriever
  ├── tools/             — tool registry
  ├── EVENTS.md
  └── README.md
app/api/ai/
  ├── chat/route.ts                       — POST (SSE)
  ├── conversations/route.ts              — GET (list), POST (create)
  ├── conversations/[id]/route.ts         — GET, PATCH, DELETE
  └── conversations/[id]/title/route.ts   — POST (regenerate title)
app/(app)/copilot/
  ├── page.tsx           — main chat page (new chat)
  ├── [id]/page.tsx      — focused on one conversation
  ├── _ConversationListServer.tsx
  └── _DisclaimerFooter.tsx
components/ai/
  ├── ChatPanel.tsx
  ├── ChatMessage.tsx
  ├── ChatInput.tsx
  ├── ToolCallCard.tsx
  ├── ConversationList.tsx
  └── NotConfigured.tsx
```

## Dependencies (dari scaffold)
- `openai` ^4.77 — already in package.json
- `drizzle-orm`, `zod`, `drizzle-zod` — already present

No new deps required.

## Catatan untuk scaffold-owner
- Lihat `db/seed/ai-prompts.ts` — system prompt panjang (~600 kata) sengaja di-source-control
  via seed file, BUKAN inline di kode app (sesuai aturan §4 NO HARDCODE).
- Set `BOOTSTRAP_AI_DEEPSEEK_API_KEY` saat pertama kali `npm run db:seed` untuk
  bootstrap API key. Setelah itu kelola via /admin/config.
