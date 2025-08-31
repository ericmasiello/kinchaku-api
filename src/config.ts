import 'dotenv/config';

export const PORT = Number(process.env.PORT ?? 3000);
export const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret';
export const CORS_ORIGIN = process.env.CORS_ORIGIN ?? '*';
export const DATABASE_PATH = process.env.DATABASE_PATH ?? './data/db.sqlite';
export const NODE_ENV = process.env.NODE_ENV ?? 'development';
