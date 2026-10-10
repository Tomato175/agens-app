import { Router } from 'express';
import { getLLMConfig } from '../llm.js';

const router = Router();

router.get('/health', (_req, res) => {
  const config = getLLMConfig();
  res.json({
    status: 'ok',
    model: config.model,
    baseUrl: config.baseUrl,
    hasApiKey: !!config.apiKey,
  });
});

router.get('/config', (_req, res) => {
  const config = getLLMConfig();
  res.json({
    model: config.model,
    baseUrl: config.baseUrl,
  });
});

export default router;
