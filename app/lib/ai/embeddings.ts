import { getConfig, getSecret, hasSecret } from "@/lib/config";
import { logger } from "@/lib/logger";

/**
 * Embedding service — provider-agnostic.
 *
 * Default provider: Voyage AI (`voyage-3-lite`, 1024-dim, free 50M tokens/bulan).
 * Alternative: OpenAI (`text-embedding-3-small`, 1536-dim) — butuh ganti kolom vector dim.
 *
 * Config:
 *   - `embeddings.provider` di app_config ("voyage" | "openai")
 *   - `embeddings.{provider}.api_key` di app_secrets
 *   - `embeddings.{provider}.model` di app_config
 *
 * Soft-fail: kalau API key kosong, return `[]` untuk semua embed call —
 * caller cek `result.length === 0` untuk handle disabled state.
 */

export interface EmbedResult {
  embeddings: number[][];
  model: string;
  tokensUsed: number;
}

const VOYAGE_BASE = "https://api.voyageai.com/v1/embeddings";

let cachedProvider: { provider: string; apiKey: string; model: string; baseUrl: string } | null = null;
let cacheChecked = false;

async function getProviderConfig() {
  if (cacheChecked) return cachedProvider;
  cacheChecked = true;

  try {
    const provider = await getConfig<string>("embeddings.provider", { defaultValue: "voyage" });
    const has = await hasSecret(`embeddings.${provider}.api_key`);
    if (!has) {
      logger.info({ provider }, "Embeddings API key tidak di-set — semantic search disabled");
      return null;
    }
    const apiKey = await getSecret(`embeddings.${provider}.api_key`);
    const model = await getConfig<string>(`embeddings.${provider}.model`, {
      defaultValue: provider === "voyage" ? "voyage-3-lite" : "text-embedding-3-small",
    });
    const baseUrl = provider === "voyage" ? VOYAGE_BASE : "https://api.openai.com/v1/embeddings";
    cachedProvider = { provider, apiKey, model, baseUrl };
    return cachedProvider;
  } catch (err) {
    logger.warn({ err }, "Failed to init embeddings provider");
    return null;
  }
}

export async function embed(texts: string[], opts: { inputType?: "query" | "document" } = {}): Promise<EmbedResult> {
  if (texts.length === 0) return { embeddings: [], model: "none", tokensUsed: 0 };

  const cfg = await getProviderConfig();
  if (!cfg) return { embeddings: [], model: "disabled", tokensUsed: 0 };

  try {
    const body: Record<string, unknown> = {
      input: texts,
      model: cfg.model,
    };
    if (cfg.provider === "voyage" && opts.inputType) {
      body.input_type = opts.inputType;
    }

    const res = await fetch(cfg.baseUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      logger.warn({ status: res.status, errText: errText.slice(0, 200), provider: cfg.provider }, "Embedding API error");
      return { embeddings: [], model: cfg.model, tokensUsed: 0 };
    }

    const data = (await res.json()) as {
      data: Array<{ embedding: number[]; index: number }>;
      usage?: { total_tokens?: number };
      model?: string;
    };

    const embeddings = data.data
      .sort((a, b) => a.index - b.index)
      .map((d) => d.embedding);

    return {
      embeddings,
      model: data.model ?? cfg.model,
      tokensUsed: data.usage?.total_tokens ?? 0,
    };
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "Embedding fetch failed");
    return { embeddings: [], model: cfg.model, tokensUsed: 0 };
  }
}

export async function embedSingle(text: string, opts?: { inputType?: "query" | "document" }): Promise<number[] | null> {
  const result = await embed([text], opts);
  return result.embeddings[0] ?? null;
}

export async function isEmbeddingsAvailable(): Promise<boolean> {
  const cfg = await getProviderConfig();
  return cfg !== null;
}

/**
 * Chunking helper — split research report ke chunks untuk per-paragraph embedding.
 * Strategy: split by paragraph (\n\n), max 800 chars per chunk, preserve context.
 */
export interface TextChunk {
  index: number;
  text: string;
  type: "title" | "summary" | "highlight" | "catalyst" | "risk" | "section";
  sectionKey?: string;
}

export function chunkResearchReport(report: {
  title: string;
  summary: string;
  keyHighlights: string[];
  catalysts: string[];
  riskFactors: string[];
  sections: Array<{ key: string; title: string; content: string }>;
}): TextChunk[] {
  const chunks: TextChunk[] = [];
  let idx = 0;

  // 1. Title
  chunks.push({ index: idx++, text: report.title, type: "title" });

  // 2. Summary (split kalau panjang)
  for (const para of splitByParagraph(report.summary, 800)) {
    chunks.push({ index: idx++, text: para, type: "summary" });
  }

  // 3. Highlights
  for (const h of report.keyHighlights) {
    if (h.trim()) chunks.push({ index: idx++, text: h, type: "highlight" });
  }

  // 4. Catalysts
  for (const c of report.catalysts) {
    if (c.trim()) chunks.push({ index: idx++, text: c, type: "catalyst" });
  }

  // 5. Risk factors
  for (const r of report.riskFactors) {
    if (r.trim()) chunks.push({ index: idx++, text: r, type: "risk" });
  }

  // 6. Sections — chunk per paragraph
  for (const s of report.sections) {
    for (const para of splitByParagraph(s.content, 800)) {
      chunks.push({ index: idx++, text: para, type: "section", sectionKey: s.key });
    }
  }

  return chunks;
}

function splitByParagraph(text: string, maxLen = 800): string[] {
  const paragraphs = text.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  const out: string[] = [];
  for (const p of paragraphs) {
    if (p.length <= maxLen) {
      out.push(p);
    } else {
      // Split panjang by sentence
      let buffer = "";
      for (const sent of p.split(/(?<=[.!?])\s+/)) {
        if ((buffer + " " + sent).length > maxLen && buffer) {
          out.push(buffer.trim());
          buffer = sent;
        } else {
          buffer = buffer ? buffer + " " + sent : sent;
        }
      }
      if (buffer) out.push(buffer.trim());
    }
  }
  return out;
}
