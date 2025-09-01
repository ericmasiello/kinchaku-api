import 'dotenv/config';

export const PORT = Number(process.env.PORT ?? 3000);
export const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret';
export const CORS_ORIGIN = process.env.CORS_ORIGIN ?? '*';
export const NODE_ENV = process.env.NODE_ENV ?? 'development';
export const TURSO_DATABASE_URL = process.env.TURSO_DATABASE_URL ?? 'libsql://fixme';
export const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN ?? 'fixme';