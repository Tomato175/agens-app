import { Router, type Request, type Response } from 'express';
import { createLLMClient, getLLMConfig } from '../llm.js';

const router = Router();

interface ImageRequest {
  prompt: string;
  size?: string;
  n?: number;
  model?: string;
}

router.post('/generate-image', async (req: Request, res: Response) => {
  const { prompt, size, n, model } = req.body as ImageRequest;

  if (!prompt) {
    res.status(400).json({ error: 'prompt is required' });
    return;
  }

  const config = getLLMConfig();
  if (!config.apiKey) {
    res.status(500).json({ error: 'LLM_API_KEY is not configured' });
    return;
  }

  try {
    const client = createLLMClient();
    const useModel = model ?? 'agnes-image-2.5-flash';

    const resp = await client.images.generate({
      model: useModel,
      prompt,
      n: n ?? 1,
      size: size ?? '1024x1024',
    } as any);

    const images = resp.data?.map((d: any) => ({
      url: d.url,
      b64: d.b64_json,
      revisedPrompt: d.revised_prompt,
    })) ?? [];

    res.json({ images, model: useModel });
  } catch (err: any) {
    const msg = err?.error?.message ?? err?.message ?? String(err);
    res.status(500).json({ error: msg });
  }
});

export default router;
