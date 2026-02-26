import express from 'express';
import healthRouter from './routes/health';

const app = express();

app.use(express.json());

app.get('/', (_req, res) => {
  res.status(200).json({ service: 'worker-node', status: 'up' });
});

app.use('/health', healthRouter);

export default app;
