import type { ToolDefinition } from './index.js';
import { createLLMClient, getLLMConfig, getNetworkFetch } from '../llm.js';
import { mkdirSync, existsSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMG_DIR = path.join(__dirname, '..', 'data', 'images');
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

let seq = 0;

function safeContentType(r: any): string {
  try {
    if (r && r.headers && typeof r.headers.get === 'function') {
      return (r.headers.get('content-type') || '').split(';')[0].trim();
    }
  } catch {
    /* undici responses sometimes lack a headers accessor */
  }
  return '';
}

// Persist a base64 data-URI image to disk and return a short reference token
// ("img:<file>") that make_pptx can embed. Keeping a token in the tool result
// avoids flooding the LLM context with megabytes of base64.
function persistImage(dataUri: string): string {
  if (!existsSync(IMG_DIR)) mkdirSync(IMG_DIR, { recursive: true });
  seq = (seq + 1) % 10000;
  const isJpg = dataUri.startsWith('data:image/jpeg') || /\.jpe?g(\?|$)/i.test(dataUri);
  const ext = isJpg ? 'jpg' : 'png';
  const base = `gen-${Date.now()}-${seq}.${ext}`;
  const b64 = dataUri.includes(',') ? dataUri.split(',')[1] : dataUri;
  writeFileSync(path.join(IMG_DIR, base), Buffer.from(b64, 'base64'));
  return `img:${base}`;
}

export const generateImageTool: ToolDefinition = {
  name: 'generate_image',
  description:
    'Generate an image from a text prompt (text-to-image model agnes-image-2.5-flash) and save it locally. Returns a short token like "img:gen-...png". Embed that token into a PPT by passing it as a slide\'s "image" field (or the deck-level "coverImage") to make_pptx. Best for cover art, concept illustrations, mood/texture backgrounds and stylized visuals. Make prompts specific: subject + style (e.g. 中国水墨, flat vector, watercolor, 复古海报) + composition + palette. Use 1792x1024 for wide slide images, 1024x1792 for tall, 1024x1024 default.',
  parameters: {
    type: 'object',
    properties: {
      prompt: { type: 'string', description: 'Detailed image prompt (Chinese or English)' },
      size: { type: 'string', description: '1024x1024 (default), 1792x1024 (wide), 1024x1792 (tall)' },
    },
    required: ['prompt'],
  },
  execute: async (args) => {
    const prompt = String(args.prompt ?? '').trim();
    if (!prompt) return 'Error: "prompt" is required.';
    const config = getLLMConfig();
    if (!config.apiKey) return 'Error: LLM_API_KEY is not configured.';
    const size = String(args.size ?? '').trim();
    try {

      const netFetch = getNetworkFetch();
      const client = createLLMClient();
      const model = process.env.LLM_IMAGE_MODEL ?? 'agnes-image-2.5-flash';
      const resp: any = await client.images.generate({
        model,
        prompt,
        n: 1,
        response_format: 'b64_json',
        ...(size ? { size } : {}),
      } as any);
      const item = resp?.data?.[0];
      let dataUri = '';
      if (item?.b64_json) {
        dataUri = `data:image/png;base64,${item.b64_json}`;
      } else if (item?.url) {
        const r = await netFetch(item.url, {
          headers: { 'User-Agent': BROWSER_UA },
          signal: AbortSignal.timeout(30000),
        } as any);
        if (!r.ok) return `Error: image download failed (HTTP ${r.status}). Retry or try a different prompt.`;
        const buf = Buffer.from(await r.arrayBuffer());
        const ct = safeContentType(r) || 'image/png';
        dataUri = `data:${ct.startsWith('image/') ? ct : 'image/png'};base64,${buf.toString('base64')}`;
      }
      if (!dataUri) return 'Error: the image service returned no image data. Try again or use image_search for a real photo.';
      const token = persistImage(dataUri);
      return `Image generated: ${token} (model ${model}). To use it, call make_pptx with that slide's "image" set to "${token}" (optionally "imageLayout":"hero"|"side"|"top"), or the deck's "coverImage" for the title slide.`;
    } catch (err: any) {
      return `Image generation failed: ${err?.message ?? String(err)}. You can retry, or instead use image_search to find a real photo.`;
    }
  },
};

// Extract direct image URLs from a Bing image SERP. Results embed JSON in an
// HTML-escaped "m=" attribute; "murl" is the full-size URL and "mediaurl" the
// thumbnail. We prefer direct links in common PPT-compatible formats.
function parseBingImages(html: string): Array<{ url: string; thumb: string }> {
  const murls = [...html.matchAll(/murl&quot;:&quot;(https?:\/\/[^&]+?)&quot;/g)]
    .map((m) => decodeURIComponent(m[1]))
    .filter((u) => /\.(jpe?g|png|webp|bmp)(\?|$)/i.test(u));
  const thumbs = [...html.matchAll(/mediaurl&quot;:&quot;(https?:\/\/[^&]+?)&quot;/g)]
    .map((m) => decodeURIComponent(m[1]));
  const seen = new Set<string>();
  const out: Array<{ url: string; thumb: string }> = [];
  murls.forEach((url, i) => {
    if (seen.has(url)) return;
    seen.add(url);
    out.push({ url, thumb: thumbs[i] || url });
  });
  return out;
}

export const imageSearchTool: ToolDefinition = {
  name: 'image_search',
  description:
    'Search the web for real images (Bing image search) and return direct image URLs. Use when a slide needs an actual photo or reference (a historical figure, landmark, painting, map, object) rather than AI art. Returns numbered results; pass the chosen URL directly as a slide\'s "image" field to make_pptx, which downloads and embeds it server-side.',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Specific image query (subject + type, e.g. "杜甫 画像", "井冈山 风景", "清明上河图")' },
      max_results: { type: 'string', description: 'Maximum number of results (default 6)' },
    },
    required: ['query'],
  },
  execute: async (args) => {
    const query = String(args.query ?? '').trim();
    if (!query) return 'Error: "query" is required.';
    const max = Math.min(parseInt(String(args.max_results ?? '6'), 10) || 6, 12);
    const fetcher = getNetworkFetch();
    const endpoints = [
      `https://www.bing.com/images/async?q=${encodeURIComponent(query)}&first=0&count=${max}&qft=+filterimage:1`,
      `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&first=1&count=${max}&qft=+filterimage:1`,
    ];
    for (const url of endpoints) {
      try {
        const r = await fetcher(url, {
          headers: { 'User-Agent': BROWSER_UA, Accept: 'text/html', 'Accept-Language': 'zh-CN,zh;q=0.9' },
          signal: AbortSignal.timeout(20000),
        } as any);
        if (!r.ok) continue;
        const html = await r.text();
        const items = parseBingImages(html).slice(0, max);
        if (items.length > 0) {
          const lines = items.map((it, i) => `**[${i + 1}]** image: ${it.url}\nthumb: ${it.thumb || it.url}`);
          return `Found ${items.length} image(s) for "${query}". Pass the full "image:" URL to make_pptx as a slide's "image".\n\n${lines.join('\n\n')}`;
        }
      } catch {
        /* try next endpoint */
      }
    }
    return `Image search returned no direct URLs for "${query}" (site may be blocked or no matches). Try a different query, or use generate_image for an AI illustration instead.`;
  },
};