import 'dotenv/config';
import { z } from 'zod';

const EnvSchema = z.object({
  PORT: z.number().min(1).default(3000),
  JWT_SECRET: z.string().min(16),
  CORS_ORIGIN: z.string().default('*'),
  NODE_ENV: z.enum(['development', 'production']).default('development'),
  TURSO_DATABASE_URL: z.string().default('libsql://fixme'),
  TURSO_AUTH_TOKEN: z.string().default('fixme'),
});

const env = EnvSchema.parse(process.env);

export const PORT = env.PORT;
export const JWT_SECRET = env.JWT_SECRET;
export const CORS_ORIGIN = env.CORS_ORIGIN;
export const NODE_ENV = env.NODE_ENV;
export const TURSO_DATABASE_URL = env.TURSO_DATABASE_URL;
export const TURSO_AUTH_TOKEN = env.TURSO_AUTH_TOKEN;
