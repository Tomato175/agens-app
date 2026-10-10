import type { ToolDefinition } from './index.js';
import PptxGenJS from 'pptxgenjs';
import { mkdirSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '..', 'data', 'pptx');

// 16:9 widescreen design system
const C = {
  navy: '1F2A44',
  accent: '4F46E5',
  accentSoft: 'EEF2FF',
  ink: '111827',
  body: '3F4756',
  gray: '9CA3AF',
  line: 'E5E7EB',
  white: 'FFFFFF',
};
const FONT = 'Microsoft YaHei';

interface SlideDef {
  heading?: string;
  bullets?: unknown[];
}

export const makePptxTool: ToolDefinition = {
  name: 'make_pptx',
  description: 'Generate a downloadable PowerPoint (.pptx) presentation with a clean, professional 16:9 template (navy title slide, accented content slides, page numbers). Use it when the user asks for a PPT / slide deck. Params: title (deck title), slides (JSON string, array of {"heading":"...","bullets":["..."]}, up to 30 slides, 3-5 short bullets per slide works best). Returns a download URL. NOTE: the download link is only valid until the next server redeploy.',
  parameters: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Title of the presentation (shown on the title slide)' },
      slides: { type: 'string', description: 'JSON array of slides, e.g. [{"heading":"Background","bullets":["point 1","point 2"]}, ...]' },
    },
    required: ['title', 'slides'],
  },
  execute: async (args) => {
    const title = String(args.title ?? 'Presentation');
    let slideDefs: SlideDef[] = [];
    try {
      const parsed = JSON.parse(String(args.slides ?? '[]'));
      if (Array.isArray(parsed)) slideDefs = parsed.slice(0, 30);
      else return 'Error: "slides" must be a JSON array of {"heading","bullets"} objects.';
    } catch {
      return 'Error: "slides" must be valid JSON, e.g. [{"heading":"...","bullets":["..."]}]';
    }

    try {
      if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
      const pptx = new PptxGenJS();
      pptx.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5 in
      pptx.author = 'agens-app';
      pptx.title = title;

      const total = slideDefs.length;

      // --- Title slide ---
      const s0 = pptx.addSlide();
      s0.background = { color: C.navy };
      s0.addShape('rect', { x: 0.9, y: 2.35, w: 0.14, h: 1.9, fill: { color: C.accent } });
      s0.addText(title, { x: 1.3, y: 2.3, w: 11, h: 1.1, fontSize: 40, bold: true, color: C.white, fontFace: FONT });
      s0.addText(
        [
          { text: new Date().toISOString().slice(0, 10), options: { color: 'A7B0C4' } },
          { text: '    ·    深度研究报告', options: { color: C.accent } },
        ],
        { x: 1.3, y: 3.55, w: 11, h: 0.5, fontSize: 15, fontFace: FONT },
      );

      // --- Content slides ---
      slideDefs.forEach((def, i) => {
        const s = pptx.addSlide();
        s.background = { color: C.white };
        const heading = String(def.heading ?? '');
        const bullets = Array.isArray(def.bullets) ? def.bullets!.map(String) : [];

        s.addText(heading || 'Untitled', { x: 0.6, y: 0.35, w: 12.1, h: 0.7, fontSize: 28, bold: true, color: C.navy, fontFace: FONT });
        s.addShape('rect', { x: 0.62, y: 1.08, w: 1.6, h: 0.05, fill: { color: C.accent } });

        if (bullets.length > 0) {
          s.addText(
            bullets.map((b) => ({ text: b, options: { bullet: { code: '2022' }, breakLine: true } })),
            {
              x: 0.6,
              y: 1.45,
              w: 12.1,
              h: 5.2,
              fontSize: 17,
              color: C.body,
              fontFace: FONT,
              valign: 'top',
              paraSpaceAfter: 10,
            },
          );
        } else {
          s.addText('（本页暂无要点）', { x: 0.6, y: 2.2, w: 12.1, h: 0.6, fontSize: 16, color: C.gray, fontFace: FONT });
        }

        // footer
        s.addShape('line', { x: 0.6, y: 6.95, w: 12.1, h: 0, line: { color: C.line, width: 1 } });
        s.addText(title, { x: 0.6, y: 7.05, w: 9, h: 0.3, fontSize: 9, color: C.gray, fontFace: FONT });
        s.addText(`${i + 1} / ${total}`, { x: 11.5, y: 7.05, w: 1.2, h: 0.3, fontSize: 9, color: C.gray, fontFace: FONT, align: 'right' });
      });

      const id = `deck-${Date.now()}`;
      const file = path.join(OUT_DIR, `${id}.pptx`);
      await pptx.writeFile({ fileName: file });
      const host = process.env.LIVE_HOST ?? 'https://agens-app.onrender.com';
      return `PPT generated: ${title} (${total + 1} slides, 16:9 设计版式). Download: ${host}/pptx/${id}.pptx (link expires on next server redeploy).`;
    } catch (err) {
      return `PPT generation failed: ${err instanceof Error ? err.message : String(err)}`;
    }
  },
};