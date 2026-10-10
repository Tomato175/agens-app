import { OpenAI } from 'openai';
import { getOpenAIToolDefinitions, executeTool } from './tools/index.js';
import { getMemoryContext } from './memory.js';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
  name?: string;
}

export type AgentEvent =
  | { type: 'text'; content: string }
  | { type: 'plan'; steps: string[] }
  | { type: 'tool_call'; tool: string; args: Record<string, unknown>; id: string }
  | { type: 'tool_result'; tool: string; result: string; id: string }
  | { type: 'done' };

export interface AgentOptions {
  client: OpenAI;
  model: string;
  systemPrompt?: string;
}

const PLANNING_PROMPT = `
When the user gives a complex task (multi-step, research, build something), first output a brief plan in this exact format:
[PLAN]
1. Step one
2. Step two
3. Step three
[/PLAN]
Then execute each step. For simple questions, skip the plan and answer directly.
`;

// Default agent positioning: a deep-research / report agent. A custom
// `systemPrompt` passed by the client replaces this (planning + memory still apply).
const RESEARCH_PROMPT = `You are a deep-research agent. Instead of a short chat reply, you investigate the question and deliver a clear, well-structured, cited report.

How you work:
- Break the question into sub-questions. Use web_search to find sources, then web_scrape to read the most promising ones in detail.
- Cross-check key claims across independent sources. When evidence is thin or conflicting, say so explicitly instead of guessing.
- Use calculator, http_request, or execute_code whenever numbers, APIs, or code are involved.

Default report format (unless the user asks for something else):
## Summary
## Findings
## Analysis
## Sources

Search budget: use at most 3 web_search calls and 4 web_scrape calls, then WRITE the report with the material you have. If searches fail or results are weak, do not keep retrying - write the report from the best-available sources and mark uncertainty explicitly. Attach the URL you relied on next to each claim. Always respond in the user's language.`;

function buildSystemPrompt(systemPrompt?: string): string {
  const memoryCtx = getMemoryContext();
  const base = systemPrompt ?? RESEARCH_PROMPT;

  return [
    base,
    PLANNING_PROMPT,
    memoryCtx ? `\n${memoryCtx}` : '',
  ].join('\n');
}

export async function* runAgent(
  options: AgentOptions,
  messages: ChatMessage[],
): AsyncGenerator<AgentEvent> {
  const { client, model, systemPrompt } = options;
  const toolDefs = getOpenAIToolDefinitions();
  const sysContent = buildSystemPrompt(systemPrompt);

  const fullMessages: ChatMessage[] = [
    { role: 'system', content: sysContent },
    ...messages,
  ];

  const maxIterations = 20;

  for (let i = 0; i < maxIterations; i++) {
    const stream = await client.chat.completions.create({
      model,
      messages: fullMessages as any,
      tools: toolDefs,
      stream: true,
    });

    let assistantContent = '';
    let toolCalls: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }> = [];

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      if (!delta) continue;

      if (delta.content) {
        assistantContent += delta.content;
        // Check for plan markers
        if (assistantContent.includes('[PLAN]')) {
          const planEnd = assistantContent.indexOf('[/PLAN]');
          if (planEnd !== -1) {
            const planText = assistantContent.slice(assistantContent.indexOf('[PLAN]'), planEnd + 7);
            const steps = planText
              .replace('[PLAN]', '')
              .replace('[/PLAN]', '')
              .split('\n')
              .map((l) => l.replace(/^\d+\.\s*/, '').trim())
              .filter(Boolean);
            if (steps.length > 0) {
              yield { type: 'plan', steps };
            }
          }
        }
        yield { type: 'text', content: delta.content };
      }

      if (delta.tool_calls) {
        for (const tc of delta.tool_calls) {
          const idx = tc.index ?? 0;
          if (!toolCalls[idx]) {
            toolCalls[idx] = {
              id: '',
              type: 'function',
              function: { name: '', arguments: '' },
            };
          }
          if (tc.id) toolCalls[idx].id = tc.id;
          if (tc.function?.name) toolCalls[idx].function.name += tc.function.name;
          if (tc.function?.arguments) toolCalls[idx].function.arguments += tc.function.arguments;
        }
      }
    }

    if (toolCalls.length === 0) {
      fullMessages.push({ role: 'assistant', content: assistantContent || null });
      yield { type: 'done' };
      return;
    }

    fullMessages.push({
      role: 'assistant',
      content: assistantContent || null,
      tool_calls: toolCalls,
    });

    for (const tc of toolCalls) {
      let parsedArgs: Record<string, unknown> = {};
      try {
        parsedArgs = JSON.parse(tc.function.arguments || '{}');
      } catch {
        parsedArgs = {};
      }

      yield {
        type: 'tool_call',
        tool: tc.function.name,
        args: parsedArgs,
        id: tc.id,
      };

      const result = await executeTool(tc.function.name, parsedArgs);

      yield {
        type: 'tool_result',
        tool: tc.function.name,
        result,
        id: tc.id,
      };

      fullMessages.push({
        role: 'tool',
        content: result,
        tool_call_id: tc.id,
        name: tc.function.name,
      });
    }
  }

  yield { type: 'done' };
}
