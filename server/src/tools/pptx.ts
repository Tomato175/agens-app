import type { ToolDefinition } from './index.js';
import PptxGenJS from 'pptxgenjs';
import { mkdirSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '..', 'data', 'pptx');

export const makePptxTool: ToolDefinition = {
  name: 'make_pptx',
  description: 'Generate a downloadable PowerPoint (.pptx) presentation from structured content. Use it when the user asks for a PPT / slide deck. Params: title (deck title), slides (JSON string, array of {"heading":"...","bullets":["..."]} , up to 30 slides). Returns a download URL. NOTE: the download link is only valid until the next server redeploy.',
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
    let slideDefs: Array<{ heading?: string; bullets?: unknown[] }> = [];
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
      pptx.author = 'agens-app';
      pptx.title = title;

      const s0 = pptx.addSlide();
      s0.addText(title, { x: 0.5, y: 2.2, w: 9, h: 1.2, fontSize: 36, bold: true, color: '111827', align: 'center' });
      s0.addText(new Date().toISOString().slice(0, 10), { x: 0.5, y: 3.5, w: 9, h: 0.5, fontSize: 14, color: '6B7280', align: 'center' });

      for (const def of slideDefs) {
        const s = pptx.addSlide();
        const heading = String((def as { heading?: string }).heading ?? '');
        const bullets = Array.isArray((def as { bullets?: unknown[] }).bullets) ? (def as { bullets?: unknown[] }).bullets!.map(String) : [];
        s.addText(heading || 'Untitled', { x: 0.5, y: 0.3, w: 9, h: 0.8, fontSize: 28, bold: true, color: '111827' });
        if (bullets.length > 0) {
          s.addText(
            bullets.map((b) => ({ text: b, options: { bullet: { code: '2022' }, breakLine: true } })),
            { x: 0.6, y: 1.4, w: 8.8, h: 5.1, fontSize: 16, color: '374151', valign: 'top', paraSpaceAfter: 6 },
          );
        }
      }

      const id = `deck-${Date.now()}`;
      const file = path.join(OUT_DIR, `${id}.pptx`);
      await pptx.writeFile({ fileName: file });
      const host = process.env.LIVE_HOST ?? 'https://agens-app.onrender.com';
      return `PPT generated: ${title} (${slideDefs.length + 1} slides). Download: ${host}/pptx/${id}.pptx (link expires on next server redeploy).`;
    } catch (err) {
      return `PPT generation failed: ${err instanceof Error ? err.message : String(err)}`;
    }
  },
};