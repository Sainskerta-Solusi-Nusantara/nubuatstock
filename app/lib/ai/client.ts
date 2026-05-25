import OpenAI from "openai";
import { getConfig, getSecret, SecretNotFoundError } from "@/lib/config";
import { ConfigurationError } from "@/lib/errors";
import { logger } from "@/lib/logger";

/**
 * AI client factory.
 *
 * - Provider, base URL, model, API key, timeout, max tokens, temperature SEMUA dari DB.
 * - JANGAN hardcode model atau base URL.
 * - Kalau API key belum di-set → throw ConfigurationError dengan client message yang
 *   menyuruh admin set di /admin/config.
 *
 * Returned config bisa di-cache caller (config layer sudah punya cache 60s).
 */

export interface AiRuntimeConfig {
  provider: string;
  baseUrl: string;
  defaultModel: string;
  deepModel: string;
  maxTokens: number;
  temperature: number;
  timeoutMs: number;
  contextCachingEnabled: boolean;
}

export async function loadAiRuntimeConfig(): Promise<AiRuntimeConfig> {
  const provider = await getConfig<string>("ai.provider");
  const baseUrl = await getConfig<string>(`ai.${provider}.base_url`);
  const defaultModel = await getConfig<string>(`ai.${provider}.default_model`);
  const deepModel = await getConfig<string>(`ai.${provider}.deep_model`, {
    defaultValue: defaultModel,
  });
  const maxTokens = await getConfig<number>(`ai.${provider}.max_tokens`, { defaultValue: 4096 });
  const temperature = await getConfig<number>(`ai.${provider}.temperature`, {
    defaultValue: 0.3,
  });
  const timeoutMs = await getConfig<number>(`ai.${provider}.timeout_ms`, {
    defaultValue: 60_000,
  });
  const contextCachingEnabled = await getConfig<boolean>(
    `ai.${provider}.context_caching`,
    { defaultValue: false },
  );
  return {
    provider,
    baseUrl,
    defaultModel,
    deepModel,
    maxTokens,
    temperature,
    timeoutMs,
    contextCachingEnabled,
  };
}

export async function loadAiApiKey(provider: string): Promise<string> {
  try {
    return await getSecret(`ai.${provider}.api_key`);
  } catch (err) {
    if (err instanceof SecretNotFoundError) {
      logger.warn({ provider }, "AI API key belum dikonfigurasi");
      throw new ConfigurationError(`ai.${provider}.api_key`);
    }
    throw err;
  }
}

/**
 * Buat OpenAI-compatible client (dipakai DeepSeek, OpenAI, dan provider lain yang kompatibel).
 *
 * Anthropic punya SDK terpisah; kalau provider = anthropic, caller bertanggung jawab
 * pakai jalur berbeda. Untuk MVP: support deepseek & openai via SDK ini.
 */
export async function getAiClient(): Promise<{
  client: OpenAI;
  config: AiRuntimeConfig;
}> {
  const config = await loadAiRuntimeConfig();
  if (config.provider === "anthropic") {
    throw new ConfigurationError(
      "Provider 'anthropic' belum didukung di MVP. Pakai 'deepseek' atau 'openai'.",
    );
  }
  const apiKey = await loadAiApiKey(config.provider);
  const client = new OpenAI({
    apiKey,
    baseURL: config.baseUrl,
    timeout: config.timeoutMs,
  });
  return { client, config };
}
