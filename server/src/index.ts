import express from 'express';
import cors from 'cors';
import chatRouter from './routes/chat.js';
import healthRouter from './routes/health.js';
import modelsRouter from './routes/models.js';
import imagesRouter from './routes/images.js';

const app = express();
const PORT = parseInt(process.env.PORT ?? '3000', 10);

app.use(cors());
app.use(express.json({ limit: '5mb' }));

app.use('/api', chatRouter);
app.use('/api', healthRouter);
app.use('/api', modelsRouter);
app.use('/api', imagesRouter);

// Serve generated PPTX files (created by the make_pptx tool)
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PPTX_DIR = path.join(__dirname, 'data', 'pptx');

app.get('/pptx/:name', (req, res) => {
  const name = path.basename(String(req.params.name ?? ''));
  if (!/^[a-z0-9.-]+\.pptx$/i.test(name)) { res.status(400).send('invalid file name'); return; }
  const file = path.join(PPTX_DIR, name);
  if (!existsSync(file)) { res.status(404).send('not found'); return; }
  res.download(file, name);
});

app.get('/', (_req, res) => {
  res.json({ name: 'Agent Server', version: '1.0.1' });
});

app.listen(PORT, () => {
  console.log(`[Agent Server] Running on http://localhost:${PORT}`);
});
