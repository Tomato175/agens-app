import type { ToolDefinition } from './index.js';

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

interface SearchItem {
  title: string;
  url: string;
  snippet: string;
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

// Primary: DuckDuckGo Lite (plain HTML, no API key, browser UA)
function parseLiteDdg(html: string, maxResults: number): SearchItem[] {
  const out: SearchItem[] = [];
  const blocks = html.split(/class=["']result-link["']/i).slice(1);
  for (const blk of blocks.slice(0, maxResults)) {
    const title = blk.match(/^>([\s\S]*?)<\/a>/i)?.[1];
    const snip = blk.match(/<td class=["']result-snippet["'][^>]*>([\s\S]*?)<\/td>/i)?.[1];
    const cleanUrl = blk.match(/<span class=["']link-text["']>([\s\S]*?)<\/span>/i)?.[1];
    let url = cleanUrl ? cleanUrl.trim() : '';
    if (!url) {
      const uddg = blk.match(/uddg=([^&"']+)/);
      if (uddg) url = decodeURIComponent(uddg[1]);
    }
    if (title || url) out.push({ title: title ? stripTags(title) : '', url, snippet: snip ? stripTags(snip) : '' });
  }
  return out;
}

// Fallback 1: Bing SERP
function parseBing(html: string, maxResults: number): SearchItem[] {
  const out: SearchItem[] = [];
  const blocks = html.split(/<li class="b_algo"/i).slice(1);
  for (const blk of blocks.slice(0, maxResults)) {
    const a = blk.match(/<h2[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    const snip = blk.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1];
    if (a) out.push({ title: stripTags(a[2]), url: a[1], snippet: snip ? stripTags(snip) : '' });
  }
  return out;
}

// Fallback 2: DuckDuckGo full HTML (legacy layout)
function parseDdgHtml(html: string, maxResults: number): SearchItem[] {
  const out: SearchItem[] = [];
  const titles = [...html.matchAll(/<a[^>]*class="result__a"[^>]*>([\s\S]*?)<\/a>/gi)].map((m) => m[1]);
  const urls = [...html.matchAll(/<a[^>]*class="result__a"[^>]*href="([^"]*)"/gi)].map((m) => {
    let u = m[1];
    const ddg = u.match(/uddg=([^&]+)/);
    if (ddg) u = decodeURIComponent(ddg[1]);
    return u;
  });
  const snips = [...html.matchAll(/<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi)].map((m) => m[1]);
  for (let i = 0; i < Math.min(maxResults, titles.length); i++) {
    out.push({ title: stripTags(titles[i]), url: urls[i] ?? '', snippet: snips[i] ? stripTags(snips[i]) : '' });
  }
  return out;
}

export const webSearchTool: ToolDefinition = {
  name: 'web_search',
  description:
    'Search the web for information (multiple providers: DuckDuckGo Lite, Bing, DuckDuckGo HTML). Returns a list of relevant results with titles, URLs, and snippets.',
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

    const providers: Array<{
      name: string;
      url: string;
      parse: (html: string, n: number) => SearchItem[];
      extraHeaders?: Record<string, string>;
    }> = [
      {
        name: 'duckduckgo-lite',
        url: `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`,
        parse: parseLiteDdg,
      },
      {
        name: 'bing',
        url: `https://www.bing.com/search?q=${encodeURIComponent(query)}&count=${Math.min(maxResults, 10)}`,
        parse: parseBing,
        extraHeaders: { 'Accept-Language': 'en-US,en;q=0.9' },
      },
      {
        name: 'duckduckgo-html',
        url: `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
        parse: parseDdgHtml,
      },
    ];

    for (const p of providers) {
      try {
        const resp = await fetch(p.url, {
          headers: {
            'User-Agent': BROWSER_UA,
            Accept: 'text/html,application/xhtml+xml',
            ...(p.extraHeaders ?? {}),
          },
          signal: AbortSignal.timeout(15000),
        });
        if (!resp.ok) continue;
        const html = await resp.text();
        const items = p.parse(html, maxResults);
        if (items.length > 0) {
          return items
            .map((it, i) => `**[${i + 1}] ${it.title}**\nURL: ${it.url}\n${it.snippet}`)
            .join('\n\n');
        }
      } catch {
        // provider unavailable - try the next one
      }
    }

    return 'Search failed: all providers returned no results (possibly rate-limited). Retry in a moment, or use web_scrape directly on a known URL.';
  },
};