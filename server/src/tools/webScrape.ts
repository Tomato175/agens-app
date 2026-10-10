import type { ToolDefinition } from './index.js';

export const webScrapeTool: ToolDefinition = {
  name: 'web_scrape',
  description: 'Fetch a web page and extract its text content. Useful for reading articles, docs, or API responses.',
  parameters: {
    type: 'object',
    properties: {
      url: { type: 'string', description: 'The URL to fetch' },
    },
    required: ['url'],
  },
  execute: async (args) => {
    const url = String(args.url ?? '');
    if (!url || !url.startsWith('http')) return 'A valid URL is required.';

    try {
      const resp = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; AgentApp/1.0)',
          'Accept': 'text/html,application/json',
        },
        signal: AbortSignal.timeout(15000),
      });
      const contentType = resp.headers.get('content-type') ?? '';

      if (contentType.includes('application/json')) {
        const data = await resp.text();
        return data.slice(0, 10000);
      }

      const html = await resp.text();
      // Strip HTML tags for readable text
      const text = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
        .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\s+/g, ' ')
        .trim();

      return text.slice(0, 15000);
    } catch (err) {
      return `Scrape failed: ${err instanceof Error ? err.message : String(err)}`;
    }
  },
};
