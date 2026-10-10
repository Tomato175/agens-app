import type { ToolDefinition } from './index.js';

export const httpRequestTool: ToolDefinition = {
  name: 'http_request',
  description: 'Make an HTTP request to any API endpoint. Supports GET, POST, PUT, DELETE. Returns the response body as JSON or text.',
  parameters: {
    type: 'object',
    properties: {
      url: { type: 'string', description: 'Full URL to request' },
      method: { type: 'string', description: 'HTTP method (GET, POST, PUT, DELETE, etc.)' },
      headers: { type: 'string', description: 'JSON object of headers to include' },
      body: { type: 'string', description: 'Request body (for POST/PUT)' },
    },
    required: ['url'],
  },
  execute: async (args) => {
    const url = String(args.url ?? '');
    const method = (String(args.method ?? 'GET') as string).toUpperCase() || 'GET';
    const headers: Record<string, string> = {};
    if (args.headers) {
      try {
        Object.assign(headers, JSON.parse(String(args.headers)));
      } catch { /* ignore parse error */ }
    }
    headers['Content-Type'] = headers['Content-Type'] ?? 'application/json';

    try {
      const resp = await fetch(url, {
        method,
        headers,
        body: method !== 'GET' && args.body ? String(args.body) : undefined,
        signal: AbortSignal.timeout(20000),
      });
      const text = await resp.text();
      return `[${resp.status} ${resp.statusText}]\n${text.slice(0, 8000)}`;
    } catch (err) {
      return `Request failed: ${err instanceof Error ? err.message : String(err)}`;
    }
  },
};
