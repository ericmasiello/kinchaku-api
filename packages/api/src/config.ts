import 'dotenv/config';
import { z } from 'zod';

const EnvSchema = z.object({
  PORT: z.coerce.number().min(1).default(3000),
  JWT_SECRET: z.string().min(32),
  CORS_ORIGIN: z.string().default('*'),
  NODE_ENV: z.enum(['development', 'production']).default('development'),
  TURSO_DATABASE_URL: z.string().default('libsql://fixme'),
  TURSO_AUTH_TOKEN: z.string().default('fixme'),
  JWT_TOKEN_EXPIRY: z.string().default('1h'),
  REFRESH_TOKEN_EXPIRY: z.string().default('7d'),
});

const env = EnvSchema.parse(process.env);

if (env.JWT_SECRET === 'dev-secret') {
  throw new Error(
    'JWT_SECRET must not be "dev-secret". Set a strong, random value (min 32 chars).'
  );
}

if (env.NODE_ENV === 'production' && env.CORS_ORIGIN === '*') {
  // eslint-disable-next-line no-console
  console.warn(
    'INFO: CORS_ORIGIN is "*" (bookmarklet mode enabled). ' +
      'Security measures in place: ' +
      '(1) All state-changing requests require valid JWT authentication, ' +
      '(2) Rate limiting on auth and article endpoints, ' +
      '(3) Short-lived access tokens (default 1h), ' +
      '(4) Refresh token rotation. ' +
      'Bookmarklets can only work from authenticated user sessions.'
  );
}

export const PORT = env.PORT;
export const JWT_SECRET = env.JWT_SECRET;
export const CORS_ORIGIN = env.CORS_ORIGIN;
export const NODE_ENV = env.NODE_ENV;
export const TURSO_DATABASE_URL = env.TURSO_DATABASE_URL;
export const TURSO_AUTH_TOKEN = env.TURSO_AUTH_TOKEN;
export const JWT_TOKEN_EXPIRY = env.JWT_TOKEN_EXPIRY;
export const REFRESH_TOKEN_EXPIRY = env.REFRESH_TOKEN_EXPIRY;
