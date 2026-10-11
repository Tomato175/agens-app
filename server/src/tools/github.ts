import type { ToolDefinition } from './index.js';

const GH_API = 'https://api.github.com';
const RAW = 'https://raw.githubusercontent.com';
const API_HEADERS = { Accept: 'application/vnd.github+json', 'User-Agent': 'agens-app' };

interface GhRepo {
  full_name: string;
  description: string | null;
  stargazers_count: number;
  html_url: string;
  language: string | null;
}

export const githubSearchTool: ToolDefinition = {
  name: 'github_search',
  description:
    'Search GitHub for open courseware, lesson plans, teaching materials, and academic resources. Use this FIRST when studying a subject before building a deck. Params: query (keywords, Chinese or English), limit (default 6, max 10).',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search keywords, e.g. "赤壁赋 课件" or "辛亥革命 教案"' },
      limit: { type: 'string', description: 'Max results (default 6, max 10)' },
    },
    required: ['query'],
  },
  execute: async (args) => {
    const query = String(args.query ?? '').trim();
    if (!query) return 'github_search: "query" is required.';
    const limit = Math.min(parseInt(String(args.limit ?? '6'), 10) || 6, 10);
    try {
      const resp = await fetch(
        `${GH_API}/search/repositories?q=${encodeURIComponent(query)}&sort=stars&per_page=${limit}`,
        { headers: API_HEADERS, signal: AbortSignal.timeout(15000) },
      );
      if (resp.status === 403) {
        return 'GitHub search is rate-limited (unauthenticated: 10 req/min). Retry in a moment, or use web_search with "site:github.com ..." as a fallback.';
      }
      if (!resp.ok) return `GitHub search failed: HTTP ${resp.status}.`;
      const data = (await resp.json()) as { items?: GhRepo[] };
      const items = data.items ?? [];
      if (items.length === 0) {
        return `No GitHub repositories found for "${query}". Try broader keywords, or fall back to web_search.`;
      }
      return items
        .map(
          (r, i) =>
            `**[${i + 1}] ${r.full_name}** (★${r.stargazers_count}${r.language ? `, ${r.language}` : ''})\n${r.description ?? '(no description)'}\nURL: ${r.html_url}`,
        )
        .join('\n\n');
    } catch (err) {
      return `GitHub search error: ${err instanceof Error ? err.message : String(err)}`;
    }
  },
};

const README_FALLBACKS = ['README.md', 'README', 'readme.md'];

function truncate(text: string): string {
  const LIMIT = 8000;
  if (text.length <= LIMIT) return text;
  return text.slice(0, LIMIT) + '\n\n[truncated at 8000 chars - use a more focused file or a specific section]';
}

function encodePath(filePath: string): string {
  return filePath.split('/').filter(Boolean).map(encodeURIComponent).join('/');
}

// Decode a contents-API JSON response into text. Returns undefined when the
// file is not available inline (> 1 MB) so callers can try raw instead.
async function readContentsJson(resp: Response): Promise<string | undefined> {
  const data = (await resp.json()) as {
    content?: string;
    encoding?: string;
    size?: number;
    type?: string;
  };
  if (data.type === 'file' && data.content && data.encoding === 'base64') {
    const buf = Buffer.from(data.content, 'base64');
    if (buf.includes(0)) return `[binary file (${data.size ?? buf.length} bytes) - not readable as text]`;
    return buf.toString('utf8');
  }
  return undefined;
}

export const githubFetchTool: ToolDefinition = {
  name: 'github_fetch',
  description:
    'Read a file from a public GitHub repository (defaults to README.md). Use after github_search to actually study the material (courseware outlines, lesson plans, notes). Params: repo ("owner/name"), path (optional, e.g. "README.md" or "docs/大纲.md"), ref (optional branch/tag, default HEAD). Content is truncated at 8000 chars.',
  parameters: {
    type: 'object',
    properties: {
      repo: { type: 'string', description: 'Repository in owner/name form, e.g. "example/awesome-slides"' },
      path: { type: 'string', description: 'File path inside the repo (default: README.md)' },
      ref: { type: 'string', description: 'Branch or tag (default: HEAD)' },
    },
    required: ['repo'],
  },
  execute: async (args) => {
    const repo = String(args.repo ?? '').trim();
    if (!/^[^/]+\/[^/]+$/.test(repo)) return 'github_fetch: "repo" must be in owner/name form.';
    const filePath = String(args.path ?? 'README.md').trim().replace(/^\/+/, '') || 'README.md';
    const ref = String(args.ref ?? 'HEAD').trim() || 'HEAD';
    const apiPath = encodePath(filePath);
    // The contents API does not accept ref=HEAD - omit the param when ref is the default.
    const refParam = ref === 'HEAD' ? '' : `?ref=${encodeURIComponent(ref)}`;

    // Primary: GitHub contents API (reliable where raw.githubusercontent.com is blocked/slow).
    try {
      const resp = await fetch(`${GH_API}/repos/${repo}/contents/${apiPath}${refParam}`, {
        headers: API_HEADERS,
        signal: AbortSignal.timeout(20000),
      });
      if (resp.status === 403) {
        return 'GitHub API rate limit exceeded (unauthenticated: 60 req/h on core API). Retry later, or use web_scrape on https://github.com/' + repo + '/blob/' + ref + '/' + filePath + ' instead.';
      }
      if (resp.status === 404) {
        for (const alt of README_FALLBACKS) {
          if (alt === filePath) continue;
          const r2 = await fetch(`${GH_API}/repos/${repo}/contents/${alt}${refParam}`, {
            headers: API_HEADERS,
            signal: AbortSignal.timeout(20000),
          });
          if (r2.ok) {
            const text = await readContentsJson(r2);
            if (text !== undefined) {
              return `File not found at "${filePath}" in ${repo}; fell back to ${alt}.\n\n${truncate(text)}`;
            }
          }
        }
        return `File not found: ${repo}/${filePath} (on ${ref}). Use github_search to find the right repo, or check the path.`;
      }
      if (resp.ok) {
        const text = await readContentsJson(resp);
        if (text !== undefined) return `--- ${repo}/${filePath} (${ref}) ---\n${truncate(text)}`;
        // file > 1 MB - fall through to raw
      }
    } catch {
      // contents API unreachable - fall back to raw
    }

    // Fallback: raw.githubusercontent.com
    try {
      const resp2 = await fetch(`${RAW}/${repo}/${ref}/${apiPath}`, {
        signal: AbortSignal.timeout(20000),
      });
      if (resp2.status === 404) {
        return `File not found: ${repo}/${filePath} (on ${ref}). Use github_search to find the right repo, or check the path.`;
      }
      if (!resp2.ok) return `github_fetch failed: HTTP ${resp2.status} for ${repo}/${filePath} on ${ref}.`;
      const text = await resp2.text();
      if (!text.trim()) return `File ${repo}/${filePath} is empty. Try another path.`;
      return `--- ${repo}/${filePath} (${ref}) ---\n${truncate(text)}`;
    } catch (err) {
      return `github_fetch error: ${err instanceof Error ? err.message : String(err)}. GitHub appears unreachable from this network - try web_scrape on https://github.com/${repo}/blob/${ref}/${filePath} instead.`;
    }
  },
};