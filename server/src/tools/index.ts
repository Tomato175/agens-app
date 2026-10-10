export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, { type: string; description: string }>;
    required?: string[];
  };
  execute: (args: Record<string, unknown>) => Promise<string>;
}

import { webSearchTool } from './webSearch.js';
import { webScrapeTool } from './webScrape.js';
import { calculatorTool } from './calculator.js';
import { httpRequestTool } from './httpRequest.js';
import { codeExecutorTool } from './codeExecutor.js';
import { makePptxTool } from './pptx.js';

export const tools: ToolDefinition[] = [
  webSearchTool,
  webScrapeTool,
  calculatorTool,
  httpRequestTool,
  codeExecutorTool,
  makePptxTool,
];

export function getOpenAIToolDefinitions() {
  return tools.map(t => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }));
}

export async function executeTool(name: string, args: Record<string, unknown>): Promise<string> {
  const tool = tools.find(t => t.name === name);
  if (!tool) return `Unknown tool: ${name}`;
  try {
    return await tool.execute(args);
  } catch (err) {
    return `Tool execution error: ${err instanceof Error ? err.message : String(err)}`;
  }
}
