import type { ToolDefinition } from './index.js';
import PptxGenJS from 'pptxgenjs';
import { mkdirSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '..', 'data', 'pptx');

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

interface StatDef {
  value: string;
  label: string;
}

interface SlideDef {
  heading?: string;
  bullets?: unknown[];
  stats?: unknown[];
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

export const makePptxTool: ToolDefinition = {
  name: 'make_pptx',
  description:
    'Generate a downloadable PowerPoint (.pptx) with a professional 16:9 card-based template: navy title slide, stat callout cards (big numbers), rounded bullet cards, footers. Use when the user asks for a PPT / slide deck. Params: title (deck title), slides (JSON string, array of {"heading":"...","stats":[{"value":"34%","label":"比兴奋更担忧（中位数）"}],"bullets":["point"]}]. stats = up to 4 big-number callouts (prefer 3), bullets = up to 4 cards (up to 3 if stats present). Keep stat values short ("34%") and labels under ~12 chars. Returns a download URL (absolute when LIVE_HOST is set, otherwise a relative /pptx/<id>.pptx that the UI resolves against the API host). NOTE: the file is kept only until the next server redeploy.',
  parameters: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Title of the presentation (shown on the title slide)' },
      slides: {
        type: 'string',
        description:
          'JSON array of slides, e.g. [{"heading":"核心结论","stats":[{"value":"81%","label":"的人至少听说过AI"}],"bullets":["担忧是主基调","信任欧盟监管最高"]}]',
      },
    },
    required: ['title', 'slides'],
  },
  execute: async (args) => {
    const title = String(args.title ?? 'Presentation');
    let slideDefs: SlideDef[] = [];
    try {
      const parsed = JSON.parse(String(args.slides ?? '[]'));
      if (Array.isArray(parsed)) slideDefs = parsed.slice(0, 30);
      else return 'Error: "slides" must be a JSON array of slide objects.';
    } catch {
      return 'Error: "slides" must be valid JSON, e.g. [{"heading":"...","stats":[{"value":"1","label":"x"}],"bullets":["..."]}]';
    }

    try {
      if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
      const pptx = new PptxGenJS();
      pptx.layout = 'LAYOUT_WIDE';
      pptx.author = 'agens-app';
      pptx.title = title;
      const total = slideDefs.length;

      // ---------- Title slide ----------
      const s0 = pptx.addSlide();
      s0.background = { color: C.navy };
      s0.addShape('rect', { x: 11.4, y: 0.55, w: 1.3, h: 0.09, fill: { color: C.accent }, line: { type: 'none' } });
      s0.addShape('rect', { x: 12.35, y: 0.82, w: 0.35, h: 0.09, fill: { color: C.faint }, line: { type: 'none' } });
      s0.addText('深度研究报告', {
        x: 0.95, y: 2.3, w: 6, h: 0.4, fontSize: 14, color: C.accent, fontFace: FONT, charSpacing: 4,
      });
      s0.addText(title, {
        x: 0.95, y: 2.85, w: 11.4, h: 1.6, fontSize: 40, bold: true, color: C.white, fontFace: FONT,
      });
      s0.addShape('rect', { x: 0.98, y: 4.75, w: 2.4, h: 0.05, fill: { color: C.accent }, line: { type: 'none' } });
      s0.addText(`${new Date().toISOString().slice(0, 10)}   ·   agens-app 深度研究 agent 生成`, {
        x: 0.95, y: 4.95, w: 11, h: 0.4, fontSize: 13, color: C.faint, fontFace: FONT,
      });

      // ---------- Content slides ----------
      slideDefs.forEach((def, i) => {
        const s = pptx.addSlide();
        s.background = { color: C.white };

        const heading = String(def.heading ?? '');
        const bullets = (Array.isArray(def.bullets) ? def.bullets : []).map(String);
        const stats = Array.isArray(def.stats) ? parseStats(def.stats) : [];

        // header
        s.addText(heading || 'Untitled', {
          x: M, y: 0.38, w: W, h: 0.65, fontSize: 27, bold: true, color: C.navy, fontFace: FONT,
        });
        s.addShape('rect', { x: M + 0.02, y: 1.12, w: 1.5, h: 0.05, fill: { color: C.accent }, line: { type: 'none' } });

        // stat callout row
        let bulletTop = 1.5;
        if (stats.length > 0) {
          const n = stats.length;
          const gap = 0.3;
          const cw = (W - (n - 1) * gap) / n;
          const ch = 1.5;
          stats.forEach((st, k) => {
            const x = M + k * (cw + gap);
            s.addShape('roundRect', {
              x, y: bulletTop, w: cw, h: ch,
              fill: { color: C.cardBg }, line: { color: C.cardLine, width: 0.75 }, rectRadius: 0.07,
            });
            s.addText(st.value, {
              x, y: bulletTop + 0.12, w: cw, h: 0.68,
              fontSize: 30, bold: true, color: C.accent, fontFace: FONT, align: 'center',
            });
            s.addText(st.label, {
              x: x + 0.15, y: bulletTop + 0.88, w: cw - 0.3, h: 0.5,
              fontSize: 11.5, color: C.muted, fontFace: FONT, align: 'center',
            });
          });
          bulletTop = bulletTop + ch + 0.32;
        }

        // bullet cards
        const maxBullets = stats.length > 0 ? 3 : 4;
        const shown = bullets.slice(0, maxBullets);
        const bh = 0.78;
        const bgap = 0.16;
        shown.forEach((b, k) => {
          const y = bulletTop + k * (bh + bgap);
          s.addShape('roundRect', {
            x: M, y, w: W, h: bh,
            fill: { color: 'FBFBFE' }, line: { color: C.cardLine, width: 0.75 }, rectRadius: 0.05,
          });
          s.addShape('roundRect', {
            x: M + 0.2, y: y + 0.2, w: 0.09, h: 0.38,
            fill: { color: C.accent }, line: { type: 'none' }, rectRadius: 0.04,
          });
          s.addText(b, {
            x: M + 0.48, y, w: W - 0.7, h: bh,
            fontSize: 15, color: C.body, fontFace: FONT, valign: 'middle',
          });
        });
        if (bullets.length > shown.length) {
          s.addText(`（其余 ${bullets.length - shown.length} 条要点未列入本页）`, {
            x: M, y: bulletTop + shown.length * (bh + bgap) + 0.02, w: W, h: 0.35,
            fontSize: 10.5, color: C.gray, fontFace: FONT,
          });
        }

        // footer
        s.addShape('line', { x: M, y: 6.95, w: W, h: 0, line: { color: C.cardLine, width: 1 } });
        s.addText(title, { x: M, y: 7.03, w: 9, h: 0.3, fontSize: 9, color: C.gray, fontFace: FONT });
        s.addText(`${i + 1} / ${total}`, {
          x: 13.333 - M - 1.2, y: 7.03, w: 1.2, h: 0.3, fontSize: 9, color: C.gray, fontFace: FONT, align: 'right',
        });
      });

      const id = `deck-${Date.now()}`;
      const file = path.join(OUT_DIR, `${id}.pptx`);
      await pptx.writeFile({ fileName: file });
      // Absolute URL when LIVE_HOST is configured; otherwise a relative path that the
      // chat UI resolves against the API host (dev proxy locally, remote backend in prod).
      const host = process.env.LIVE_HOST ?? '';
      const dlUrl = host ? `${host}/pptx/${id}.pptx` : `/pptx/${id}.pptx`;
      return `PPT generated: ${title} (${total + 1} slides, 16:9 卡片版式). Download: ${dlUrl} — the chat UI shows a one-click 下载 button for it. The file is served by the backend and stays until the next redeploy.`;
    } catch (err) {
      return `PPT generation failed: ${err instanceof Error ? err.message : String(err)}`;
    }
  },
};