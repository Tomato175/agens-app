import type { AgentEvent } from './types';

// In dev, /api is proxied to the local backend by Vite.
// For static hosting (GitHub Pages), set VITE_API_BASE at build time to the
// public URL of the hosted backend, e.g. VITE_API_BASE=https://agent-server.onrender.com
const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? '/api';

export async function streamChat(
  messages: Array<{ role: string; content: string }>,
  onEvent: (event: AgentEvent) => void,
  signal?: AbortSignal,
  model?: string,
  systemPrompt?: string,
): Promise<void> {
  const body: Record<string, unknown> = { messages };
  if (model) body.model = model;
  if (systemPrompt) body.systemPrompt = systemPrompt;

  const resp = await fetch(`${API_BASE}/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });

  if (!resp.ok) {
    let errMsg = `Server error (${resp.status})`;
    try {
      const err = await resp.json();
      if (err.error) errMsg = err.error;
    } catch { /* ignore */ }
    throw new Error(errMsg);
  }

  if (!resp.body) throw new Error('No response body');

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop()!;

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') return;
        try {
          const event = JSON.parse(data);
          if (event.type === 'error') throw new Error(event.error);
          onEvent(event as AgentEvent);
        } catch (e) {
          if (e instanceof SyntaxError) continue;
          throw e;
        }
      }
    }
  }
}

export async function generateImage(
  prompt: string,
  size?: string,
  model?: string,
): Promise<{ url: string }[]> {
  const body: Record<string, unknown> = { prompt, n: 1 };
  if (size) body.size = size;
  if (model) body.model = model;

  const resp = await fetch(`${API_BASE}/generate-image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: 'Image generation failed' }));
    throw new Error(err.error ?? 'Image generation failed');
  }

  const data = await resp.json();
  return data.images ?? [];
}

export async function checkHealth(): Promise<{ status: string; model: string; hasApiKey: boolean }> {
  try {
    const resp = await fetch(`${API_BASE}/health`);
    if (!resp.ok) throw new Error('Server not reachable');
    return await resp.json();
  } catch {
    return { status: 'error', model: '', hasApiKey: false };
  }
}

export interface ModelInfo {
  id: string;
  name: string;
  owned_by: string;
}

export async function fetchModels(): Promise<{ data: ModelInfo[]; default: string }> {
  const resp = await fetch(`${API_BASE}/models`);
  if (!resp.ok) throw new Error('Failed to fetch models');
  return resp.json();
}
