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

app.get('/', (_req, res) => {
  res.json({ name: 'Agent Server', version: '1.0.1' });
});

app.listen(PORT, () => {
  console.log(`[Agent Server] Running on http://localhost:${PORT}`);
});
