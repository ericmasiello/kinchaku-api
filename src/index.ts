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

// CORS configuration for web and native applications
const corsOptions = {
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void
  ) => {
    // Allow requests with no origin (native apps, mobile apps, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }

    // If CORS_ORIGIN is '*', allow all origins
    if (CORS_ORIGIN === '*') {
      return callback(null, true);
    }

    // Check if the origin matches the configured CORS_ORIGIN
    if (origin === CORS_ORIGIN) {
      return callback(null, true);
    }

    // If CORS_ORIGIN contains multiple origins (comma-separated)
    const allowedOrigins = CORS_ORIGIN.split(',').map((o) => o.trim());
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Reject the request
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true, // Allow credentials (for auth headers)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(morgan(NODE_ENV === 'production' ? 'combined' : 'dev'));

// Rate limit auth endpoints
const authLimiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: 100 });
app.use('/api/v1/auth', authLimiter);

// Rate limit article creation
const articleCreateLimiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: 50 });
app.use('/api/v1/articles', (req, res, next) => {
  if (req.method === 'POST') {
    return articleCreateLimiter(req, res, next);
  }
  next();
});

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
