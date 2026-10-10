import type { ToolDefinition } from './index.js';

export const webSearchTool: ToolDefinition = {
  name: 'web_search',
  description: 'Search the web for information. Returns a list of relevant results with titles, URLs, and snippets.',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'The search query' },
      max_results: { type: 'string', description: 'Maximum number of results (default 5)' },
    },
    required: ['query'],
  },
  execute: async (args) => {
    const query = String(args.query ?? '');
    const maxResults = parseInt(String(args.max_results ?? '5'), 10) || 5;
    if (!query) return 'Search query is required.';

    // Use DuckDuckGo HTML search as a fallback (no API key needed)
    try {
      const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      const resp = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AgentApp/1.0)' },
      });
      const html = await resp.text();

      // Simple regex extraction of results
      const results: string[] = [];
      const titleRegex = /<a[^>]*class="result__a"[^>]*>(.*?)<\/a>/gs;
      const snippetRegex = /<a[^>]*class="result__snippet"[^>]*>(.*?)<\/a>/gs;
      const urlRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"/g;

      let titleMatch: RegExpExecArray | null;
      let i = 0;
      const titles: string[] = [];
      const snippets: string[] = [];
      const urls: string[] = [];

      while ((titleMatch = titleRegex.exec(html)) !== null && i < maxResults) {
        titles.push(titleMatch[1].replace(/<[^>]+>/g, '').trim());
        i++;
      }
      let sMatch: RegExpExecArray | null;
      i = 0;
      while ((sMatch = snippetRegex.exec(html)) !== null && i < maxResults) {
        snippets.push(sMatch[1].replace(/<[^>]+>/g, '').trim());
        i++;
      }
      let uMatch: RegExpExecArray | null;
      i = 0;
      while ((uMatch = urlRegex.exec(html)) !== null && i < maxResults) {
        let u = uMatch[1];
        const ddgMatch = u.match(/uddg=([^&]+)/);
        if (ddgMatch) u = decodeURIComponent(ddgMatch[1]);
        urls.push(u);
        i++;
      }

      if (titles.length === 0) {
        return 'No search results found.';
      }

      const lines = titles.map((t, idx) =>
        `**[${idx + 1}] ${t}**\nURL: ${urls[idx] || 'N/A'}\n${snippets[idx] || ''}`
      );
      return lines.join('\n\n');
    } catch (err) {
      return `Search failed: ${err instanceof Error ? err.message : String(err)}`;
    }
  },
};
