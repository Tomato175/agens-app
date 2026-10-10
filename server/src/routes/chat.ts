import { Router, type Request, type Response } from 'express';
import { createLLMClient, getLLMConfig } from '../llm.js';
import { runAgent, type ChatMessage } from '../agent.js';

const router = Router();

interface ChatRequest {
  messages: ChatMessage[];
  systemPrompt?: string;
  model?: string;
}

router.post('/stream', async (req: Request, res: Response) => {
  const { messages, systemPrompt, model } = req.body as ChatRequest;

  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: 'messages array is required' });
    return;
  }

  const config = getLLMConfig();
  if (!config.apiKey) {
    res.status(500).json({ error: 'LLM_API_KEY is not configured. Set it in .env file.' });
    return;
  }

  const client = createLLMClient();
  const useModel = model ?? config.model;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  try {
    const generator = runAgent(
      { client, model: useModel, systemPrompt },
      messages,
    );

    for await (const event of generator) {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.write(`data: ${JSON.stringify({ type: 'error', error: errorMsg })}\n\n`);
  }

  res.write('data: [DONE]\n\n');
  res.end();
});

router.post('/chat', async (req: Request, res: Response) => {
  const { messages, systemPrompt, model } = req.body as ChatRequest;

  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: 'messages array is required' });
    return;
  }

  const config = getLLMConfig();
  if (!config.apiKey) {
    res.status(500).json({ error: 'LLM_API_KEY is not configured. Set it in .env file.' });
    return;
  }

  const client = createLLMClient();
  const useModel = model ?? config.model;

  try {
    const textParts: string[] = [];
    const toolCalls: Array<{ tool: string; args: unknown; result: string }> = [];

    const generator = runAgent(
      { client, model: useModel, systemPrompt },
      messages,
    );

    for await (const event of generator) {
      if (event.type === 'text') {
        textParts.push(event.content);
      } else if (event.type === 'tool_call') {
        toolCalls.push({ tool: event.tool, args: event.args, result: '' });
      } else if (event.type === 'tool_result') {
        const tc = toolCalls.find((t) => t.tool === event.tool);
        if (tc) tc.result = event.result;
      }
    }

    res.json({
      response: textParts.join(''),
      tool_calls: toolCalls,
      model: useModel,
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

export default router;
