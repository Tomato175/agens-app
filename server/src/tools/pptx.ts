import type { ToolDefinition } from './index.js';
import PptxGenJS from 'pptxgenjs';
import { mkdirSync, existsSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getNetworkFetch } from '../llm.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '..', 'data', 'pptx');
const IMG_DIR = path.join(__dirname, '..', 'data', 'images');
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// 16:9 (13.333 x 7.5 in) design system
const C = {
  navy: '1F2A44',
  accent: '4F46E5',
  ink: '111827',
  body: '3F4756',
  muted: '6B7280',
  faint: 'A7B0C4',
  gray: '9CA3AF',
  cardBg: 'F5F6FA',
  cardLine: 'E4E7EF',
  white: 'FFFFFF',
};
const FONT = 'Microsoft YaHei';
const M = 0.6; // side margin
const W = 13.333 - M * 2; // content width
const SW = 13.333;
const SH = 7.5;

interface StatDef {
  value: string;
  label: string;
}

interface SlideDef {
  heading?: string;
  bullets?: unknown[];
  stats?: unknown[];
  image?: string;
  imageLayout?: 'hero' | 'side' | 'top';
}

function parseStats(raw: unknown[]): StatDef[] {
  return raw
    .map((s) => {
      if (typeof s === 'string') {
        const [value, ...rest] = s.split('：');
        return { value: value ?? s, label: rest.join('：') };
      }
      if (s && typeof s === 'object') {
        const o = s as { value?: unknown; label?: unknown };
        return { value: String(o.value ?? ''), label: String(o.label ?? '') };
      }
      return null;
    })
    .filter((s): s is StatDef => !!s && s.value.length > 0)
    .slice(0, 4);
}

// Resolve an image source to a base64 data URI (or '' when unavailable).
// Accepts: a data: URI, a local "img:<file>" token, a local path, an http(s)
// URL (downloaded through the configured proxy), or raw base64.
async function resolveImageToDataUri(src: string): Promise<string> {
  const s = (src ?? '').trim();
  if (!s) return '';
  if (s.startsWith('data:')) return s.startsWith('data:image/') ? s : '';
  if (s.startsWith('img:')) {
    const base = path.basename(s.slice(4));
    const file = path.join(IMG_DIR, base);
    if (!existsSync(file)) return '';
    const buf = readFileSync(file);
    const mime = /\.jpe?g$/i.test(base) ? 'image/jpeg' : /\.webp$/i.test(base) ? 'image/webp' : 'image/png';
    return `data:${mime};base64,${buf.toString('base64')}`;
  }
  if (/^https?:\/\//i.test(s)) {
    try {
      const r = await getNetworkFetch()(s, {
        headers: { 'User-Agent': BROWSER_UA, 'Referer': 'https://www.bing.com/' },
        signal: AbortSignal.timeout(25000),
      } as any);
      if (!r.ok) return '';
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length === 0) return '';
      const ct = (r.headers.get('content-type') || '').split(';')[0].trim();
      let mime = ct;
      if (!mime.startsWith('image/')) {
        mime = /\.webp(\?|$)/i.test(s) ? 'image/webp' : /\.png(\?|$)/i.test(s) ? 'image/png' : 'image/jpeg';
      }
      return `data:${mime};base64,${buf.toString('base64')}`;
    } catch {
      return '';
    }
  }
  // Last resort: treat as raw base64.
  return `data:image/png;base64,${s}`;
}

function drawStatsRow(s: any, stats: StatDef[], x: number, y: number, width: number): number {
  const n = stats.length;
  const gap = 0.28;
  const cw = (width - (n - 1) * gap) / n;
  const ch = 1.45;
  stats.forEach((st, k) => {
    const sx = x + k * (cw + gap);
    s.addShape('roundRect', {
      x: sx, y, w: cw, h: ch,
      fill: { color: C.cardBg }, line: { color: C.cardLine, width: 0.75 }, rectRadius: 0.07,
    });
    s.addText(st.value, {
      x: sx, y: y + 0.1, w: cw, h: 0.62,
      fontSize: 28, bold: true, color: C.accent, fontFace: FONT, align: 'center',
    });
    s.addText(st.label, {
      x: sx + 0.12, y: y + 0.82, w: cw - 0.24, h: 0.5,
      fontSize: 11, color: C.muted, fontFace: FONT, align: 'center',
    });
  });
  return y + ch + 0.3;
}

function drawBullets(s: any, bullets: string[], x: number, y: number, width: number, count: number): void {
  const bh = 0.74;
  const bgap = 0.16;
  const shown = bullets.slice(0, count);
  shown.forEach((b, k) => {
    const by = y + k * (bh + bgap);
    s.addShape('roundRect', {
      x, y: by, w: width, h: bh,
      fill: { color: 'FBFBFE' }, line: { color: C.cardLine, width: 0.75 }, rectRadius: 0.05,
    });
    s.addShape('roundRect', {
      x: x + 0.18, y: by + 0.19, w: 0.09, h: 0.36,
      fill: { color: C.accent }, line: { type: 'none' }, rectRadius: 0.04,
    });
    s.addText(b, {
      x: x + 0.46, y: by, w: width - 0.7, h: bh,
      fontSize: 14.5, color: C.body, fontFace: FONT, valign: 'middle',
    });
  });
}

function addLightFooter(s: any, title: string, i: number, total: number): void {
  s.addShape('line', { x: M, y: 6.95, w: W, h: 0, line: { color: C.cardLine, width: 1 } });
  s.addText(title, { x: M, y: 7.03, w: 9, h: 0.3, fontSize: 9, color: C.gray, fontFace: FONT });
  s.addText(`${i + 1} / ${total}`, {
    x: SW - M - 1.2, y: 7.03, w: 1.2, h: 0.3, fontSize: 9, color: C.gray, fontFace: FONT, align: 'right',
  });
}

export const makePptxTool: ToolDefinition = {
  name: 'make_pptx',
  description:
    'Generate a downloadable PowerPoint (.pptx) with a professional 16:9 card-based template: navy/hero title slide, stat callout cards, rounded bullet cards, and embedded images. Params: title (deck title), coverImage (optional image for the title slide, see image sources), slides (JSON string array). Each slide object: {"heading":"...","stats":[{"value":"34%","label":"..."}],"bullets":["point"],"image":"<src>","imageLayout":"hero|side|top"}. "image" accepts a token from generate_image ("img:..."), a URL from image_search, or any http(s)/data URL; it is downloaded and baked in. "imageLayout": "hero" = full-bleed background with title+bullets overlaid, "side" (default) = text left / image right, "top" = image strip on top / bullets below. Keep stat values short and labels under ~12 chars. Use at most 1 image per slide; leave slides image-free when a visual adds no value. Returns a download URL (absolute when LIVE_HOST is set, otherwise a relative /pptx/<id>.pptx the UI resolves). NOTE: the file is kept only until the next server redeploy.',
  parameters: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Title of the presentation (shown on the title slide)' },
      coverImage: {
        type: 'string',
        description:
          'Optional background image for the title slide: a "img:..." token from generate_image, a URL from image_search, or any http(s)/data URL.',
      },
      slides: {
        type: 'string',
        description:
          'JSON array of slides, e.g. [{"heading":"文本赏析","bullets":["点1","点2"],"image":"img:gen-1.png","imageLayout":"side"},{"heading":"数据统计","stats":[{"value":"81%","label":"听说过AI"}]}]',
      },
    },
    required: ['title', 'slides'],
  },
  execute: async (args) => {
    const title = String(args.title ?? 'Presentation');
    const coverImage = String(args.coverImage ?? '').trim();
    let slideDefs: SlideDef[] = [];
    try {
      const parsed = JSON.parse(String(args.slides ?? '[]'));
      if (Array.isArray(parsed)) slideDefs = parsed.slice(0, 30);
      else return 'Error: "slides" must be a JSON array of slide objects.';
    } catch {
      return 'Error: "slides" must be valid JSON, e.g. [{"heading":"...","stats":[{"value":"1","label":"x"}],"bullets":["..."],"image":"https://..."}]';
    }

    try {
      if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
      const pptx = new PptxGenJS();
      pptx.layout = 'LAYOUT_WIDE';
      pptx.author = 'agens-app';
      pptx.title = title;
      const total = slideDefs.length;

      // ---------- Title slide (hero when coverImage present) ----------
      const s0 = pptx.addSlide();
      s0.background = { color: C.navy };
      const coverData = coverImage ? await resolveImageToDataUri(coverImage) : '';
      if (coverData) {
        s0.addImage({ data: coverData, x: 0, y: 0, w: SW, h: SH, sizing: { type: 'cover', w: SW, h: SH } } as any);
        s0.addShape('rect', { x: 0, y: 0, w: SW, h: SH, fill: { color: '0A1024', transparency: 58 }, line: { type: 'none' } });
      } else {
        s0.addShape('rect', { x: 11.4, y: 0.55, w: 1.3, h: 0.09, fill: { color: C.accent }, line: { type: 'none' } });
        s0.addShape('rect', { x: 12.35, y: 0.82, w: 0.35, h: 0.09, fill: { color: C.faint }, line: { type: 'none' } });
      }
      s0.addText('深度研究报告', {
        x: 0.95, y: 2.3, w: 6, h: 0.4, fontSize: 14, color: C.accent, fontFace: FONT, charSpacing: 4,
      });
      s0.addText(title, {
        x: 0.95, y: 2.85, w: 11.4, h: 1.6, fontSize: 40, bold: true, color: C.white, fontFace: FONT,
      });
      s0.addShape('rect', { x: 0.98, y: 4.75, w: 2.4, h: 0.05, fill: { color: C.accent }, line: { type: 'none' } });
      s0.addText(`${new Date().toISOString().slice(0, 10)}   ·   超级无敌大番茄 · 文科 PPT 助手 生成`, {
        x: 0.95, y: 4.95, w: 11, h: 0.4, fontSize: 13, color: C.faint, fontFace: FONT,
      });

      // ---------- Content slides ----------
      for (let i = 0; i < slideDefs.length; i++) {
        const def = slideDefs[i];
        const s = pptx.addSlide();
        s.background = { color: C.white };

        const heading = String(def.heading ?? '');
        const bullets = (Array.isArray(def.bullets) ? def.bullets : []).map(String);
        const stats = Array.isArray(def.stats) ? parseStats(def.stats) : [];
        const imageLayout: 'hero' | 'side' | 'top' = def.imageLayout === 'top' || def.imageLayout === 'hero' ? def.imageLayout : 'side';
        const imgSrc = String(def.image ?? '').trim();
        const imgData = imgSrc ? await resolveImageToDataUri(imgSrc) : '';

        // Hero layout: full-bleed image, dark overlay, white text on top.
        if (imgData && imageLayout === 'hero') {
          s.addImage({ data: imgData, x: 0, y: 0, w: SW, h: SH, sizing: { type: 'cover', w: SW, h: SH } } as any);
          s.addShape('rect', { x: 0, y: 0, w: SW, h: SH, fill: { color: '0A1024', transparency: 52 }, line: { type: 'none' } });
          s.addText(heading || '', { x: 0.95, y: 0.85, w: 11.4, h: 1.1, fontSize: 33, bold: true, color: C.white, fontFace: FONT });
          s.addShape('rect', { x: 0.98, y: 2.1, w: 2.2, h: 0.05, fill: { color: C.accent }, line: { type: 'none' } });
          const shown = bullets.slice(0, 4);
          shown.forEach((b, k) => {
            s.addText('•  ' + b, { x: 0.95, y: 2.45 + k * 0.72, w: 9.2, h: 0.6, fontSize: 18, color: 'EAF0FF', fontFace: FONT });
          });
          s.addText(`${i + 1} / ${total}`, { x: SW - M - 1.2, y: 7.03, w: 1.2, h: 0.3, fontSize: 9, color: 'B7C0E0', fontFace: FONT, align: 'right' });
          continue;
        }

        // Standard header for side / top / no-image slides.
        s.addText(heading || 'Untitled', {
          x: M, y: 0.38, w: W, h: 0.65, fontSize: 27, bold: true, color: C.navy, fontFace: FONT,
        });
        s.addShape('rect', { x: M + 0.02, y: 1.12, w: 1.5, h: 0.05, fill: { color: C.accent }, line: { type: 'none' } });

        if (imgData && imageLayout === 'top') {
          s.addImage({ data: imgData, x: M, y: 1.4, w: W, h: 3.15, sizing: { type: 'cover', w: W, h: 3.15 } } as any);
          const shown = bullets.slice(0, 3);
          const bh = 0.72;
          shown.forEach((b, k) => {
            const by = 4.75 + k * (bh + 0.14);
            s.addShape('roundRect', { x: M, y: by, w: W, h: bh, fill: { color: 'FBFBFE' }, line: { color: C.cardLine, width: 0.75 }, rectRadius: 0.05 });
            s.addShape('roundRect', { x: M + 0.18, y: by + 0.18, w: 0.09, h: 0.36, fill: { color: C.accent }, line: { type: 'none' }, rectRadius: 0.04 });
            s.addText(b, { x: M + 0.46, y: by, w: W - 0.7, h: bh, fontSize: 14.5, color: C.body, fontFace: FONT, valign: 'middle' });
          });
          addLightFooter(s, title, i, total);
          continue;
        }

        // side layout (default when an image is present): text column left, image right.
        if (imgData) {
          const TW = 6.3;
          const IW = W - TW - 0.35;
          const ix = M + TW + 0.35;
          s.addImage({ data: imgData, x: ix, y: 1.45, w: IW, h: 4.95, sizing: { type: 'contain', w: IW, h: 4.95 } } as any);
          let top = 1.5;
          if (stats.length > 0) top = drawStatsRow(s, stats.slice(0, 3), M, top, TW);
          drawBullets(s, bullets, M, top, TW, stats.length > 0 ? 3 : 4);
          addLightFooter(s, title, i, total);
          continue;
        }

        // No image: classic stat row + bullet cards across full width.
        let bulletTop = 1.5;
        if (stats.length > 0) bulletTop = drawStatsRow(s, stats, M, bulletTop, W);
        const maxBullets = stats.length > 0 ? 3 : 4;
        drawBullets(s, bullets, M, bulletTop, W, maxBullets);
        if (bullets.length > maxBullets) {
          s.addText(`（其余 ${bullets.length - maxBullets} 条要点未列入本页）`, {
            x: M, y: bulletTop + maxBullets * (0.74 + 0.16) + 0.02, w: W, h: 0.35,
            fontSize: 10.5, color: C.gray, fontFace: FONT,
          });
        }
        addLightFooter(s, title, i, total);
      }

      const id = `deck-${Date.now()}`;
      const file = path.join(OUT_DIR, `${id}.pptx`);
      await pptx.writeFile({ fileName: file });
      const host = process.env.LIVE_HOST ?? '';
      const dlUrl = host ? `${host}/pptx/${id}.pptx` : `/pptx/${id}.pptx`;
      return `PPT generated: ${title} (${total + 1} slides, 16:9 卡片版式, 支持图片). Download: ${dlUrl} — the chat UI shows a one-click 下载 button for it. The file is served by the backend and stays until the next redeploy.`;
    } catch (err) {
      return `PPT generation failed: ${err instanceof Error ? err.message : String(err)}`;
    }
  },
};