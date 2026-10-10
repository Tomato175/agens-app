import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

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

export function createLLMClient(config?: LLMConfig): OpenAI {
  const cfg = config ?? getLLMConfig();
  return new OpenAI({
    apiKey: cfg.apiKey,
    baseURL: cfg.baseUrl,
  });
}
