import { Router } from 'express';
import { createLLMClient, getLLMConfig } from '../llm.js';

const router = Router();

// Fallback model list used when the upstream relay does not implement GET /models
// (common with relays such as agnes-ai), so this endpoint never 500s or hangs.
function fallbackModels(defaultModel: string) {
  const ids = [defaultModel, 'agnes-3.0-flash', 'agnes-image-2.5-flash'];
  return Array.from(new Set(ids)).map((id) => ({ id, name: id, owned_by: '' }));
}

router.get('/models', async (_req, res) => {
  try {
    const config = getLLMConfig();
    if (!config.apiKey) {
      res.json({ data: [], error: 'No API key configured' });
      return;
    }

    const client = createLLMClient();
    let upstream: Array<{ id: string; owned_by?: string }> | null = null;
    try {
      const models = await client.models.list({ signal: AbortSignal.timeout(8000) } as any);
      upstream = models.data ?? [];
    } catch {
      upstream = null; // relays often don't implement GET /models - fall back below
    }

    let list: Array<{ id: string; owned_by?: string }>;
    if (upstream && upstream.length > 0) {
      // Filter to chat-capable models (exclude image/video models for simplicity)
      const chatModels = upstream.filter(m =>
        m.id.includes('flash') || m.id.includes('pro') || m.id.includes('chat') || m.id.includes('gpt')
      );
      list = chatModels.length > 0 ? chatModels : upstream;
    } else {
      list = fallbackModels(config.model);
    }

    res.json({
      data: list.map(m => ({
        id: m.id,
        name: m.id,
        owned_by: (m as any).owned_by ?? '',
      })),
      default: config.model,
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

export default router;
