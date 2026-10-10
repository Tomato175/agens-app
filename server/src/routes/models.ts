import { Router } from 'express';
import { createLLMClient, getLLMConfig } from '../llm.js';

const router = Router();

router.get('/models', async (_req, res) => {
  try {
    const config = getLLMConfig();
    if (!config.apiKey) {
      res.json({ data: [], error: 'No API key configured' });
      return;
    }

    const client = createLLMClient();
    const models = await client.models.list();

    // Filter to chat-capable models (exclude image/video models for simplicity)
    const chatModels = models.data.filter(m =>
      m.id.includes('flash') || m.id.includes('pro') || m.id.includes('chat') || m.id.includes('gpt')
    );

    res.json({
      data: (chatModels.length > 0 ? chatModels : models.data).map(m => ({
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
