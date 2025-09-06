import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { CORS_ORIGIN, NODE_ENV, PORT } from './config.ts';
import authRoutes from './routes/auth.routes.ts';
import articleRoutes from './routes/articles.routes.ts';

// Express
const app = express();

// Trust reverse proxies (Synology Reverse Proxy / Nginx)
app.set('trust proxy', 1);

// Security + essentials
app.use(helmet());
app.use(
  cors({ origin: CORS_ORIGIN === '*' ? true : CORS_ORIGIN, credentials: false })
);
app.use(express.json());
app.use(morgan(NODE_ENV === 'production' ? 'combined' : 'dev'));

// Rate limit just auth endpoints
const authLimiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: 100 });
app.use('/api/v1/auth', authLimiter);

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/articles', articleRoutes);

// Health
app.get('/health', (_req, res) => res.json({ ok: true }));
app.get('/status', (_req, res) => res.json({ ok: true }));

// 404
app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Kinchaku API listening on port ${PORT}`);
});
