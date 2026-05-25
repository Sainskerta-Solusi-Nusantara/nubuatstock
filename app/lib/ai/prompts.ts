import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { aiPrompts } from "@/db/schema/ai";
import { getConfig } from "@/lib/config";
import { ConfigurationError } from "@/lib/errors";

/**
 * Load system prompt aktif dari DB. Prompt text BUKAN inline di kode.
 *
 * - Versi default dibaca dari `app_config.ai.system_prompt_version`.
 * - Caller bisa override `version` arg untuk pin versi tertentu (mis. A/B test).
 * - Variable placeholder `{name}` di-resolve via `applyVariables()`.
 *
 * Cache: 60s in-process (config layer punya cache; prompt sendiri di-load tiap call —
 * volume rendah, biarkan).
 */

const promptCache = new Map<string, { content: string; expiresAt: number }>();
const PROMPT_CACHE_TTL_MS = 60_000;

export async function loadActivePrompt(
  key: string,
  opts: { version?: string } = {},
): Promise<{ content: string; version: string; variables: string[] }> {
  const version =
    opts.version ?? (await getConfig<string>("ai.system_prompt_version", { defaultValue: "v1" }));

  const cacheKey = `${key}::${version}`;
  const now = Date.now();
  const cached = promptCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return { content: cached.content, version, variables: [] };
  }

  const rows = await db
    .select()
    .from(aiPrompts)
    .where(and(eq(aiPrompts.key, key), eq(aiPrompts.version, version)))
    .limit(1);

  if (rows.length === 0) {
    throw new ConfigurationError(`ai_prompts:${key}:${version}`);
  }
  const row = rows[0]!;
  promptCache.set(cacheKey, { content: row.content, expiresAt: now + PROMPT_CACHE_TTL_MS });
  return { content: row.content, version: row.version, variables: row.variablesJson ?? [] };
}

export function applyVariables(
  content: string,
  vars: Record<string, string | null | undefined>,
): string {
  return content.replace(/\{(\w+)\}/g, (_, name: string) => {
    const v = vars[name];
    if (v === null || v === undefined) return `(${name} tidak diketahui)`;
    return v;
  });
}

export function invalidatePromptCache(): void {
  promptCache.clear();
}
