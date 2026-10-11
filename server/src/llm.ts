import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { ProxyAgent, fetch as undiciFetch } from 'undici';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

export interface LLMConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export function getLLMConfig(): LLMConfig {
  return {
    apiKey: process.env.LLM_API_KEY ?? '',
    baseUrl: process.env.LLM_API_BASE ?? 'https://api.openai.com/v1',
    model: process.env.LLM_MODEL ?? 'gpt-4o',
  };
}

// Outbound proxy for LLM requests. When HTTPS_PROXY/HTTP_PROXY is set (e.g.
// local Clash at 127.0.0.1:7890) we route the OpenAI client's fetch through
// it, because the default Node fetch can be reset/blocked on some hosts.
// Unset on hosted runs (Render), so behavior there is unchanged.
let cachedProxyFetch: typeof globalThis.fetch | undefined;

function resolveProxyFetch(): typeof globalThis.fetch | undefined {
  if (cachedProxyFetch) return cachedProxyFetch;
  const proxy =
    process.env.HTTPS_PROXY || process.env.https_proxy ||
    process.env.HTTP_PROXY || process.env.http_proxy;
  if (!proxy) return undefined;
  const agent = new ProxyAgent(proxy);
  console.log('[llm] routing LLM fetch through proxy ' + proxy);
  cachedProxyFetch = ((url: any, init: any) =>
    undiciFetch(url, { ...init, dispatcher: agent })) as unknown as typeof globalThis.fetch;
  return cachedProxyFetch;
}

export function createLLMClient(config?: LLMConfig): OpenAI {
  const cfg = config ?? getLLMConfig();
  const customFetch = resolveProxyFetch();
  return new OpenAI({
    apiKey: cfg.apiKey,
    baseURL: cfg.baseUrl,
    ...(customFetch ? { fetch: customFetch } : {}),
  });
}