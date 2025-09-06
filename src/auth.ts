import { randomBytes, scrypt as _scrypt, timingSafeEqual } from 'crypto';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from './config.ts';

// Refresh token config
export const REFRESH_TOKEN_SECRET = JWT_SECRET + '_refresh';
export const REFRESH_TOKEN_EXPIRY = '7d';
import type { Response, NextFunction } from 'express';
import type { JwtPayload, RequestWithData } from './types.ts';
import { z } from 'zod';

const scrypt = (password: string, salt: string) =>
  new Promise<Buffer>((resolve, reject) =>
    _scrypt(password, salt, 64, (err, derivedKey) => err ? reject(err) : resolve(derivedKey as Buffer))
  );

export async function hashPassword(password: string, salt?: string) {
  const s = salt ?? randomBytes(16).toString('hex');
  const derived = await scrypt(password, s);
  return { salt: s, hash: derived.toString('hex') };
}

export async function verifyPassword(password: string, salt: string, hash: string) {
  const derived = await scrypt(password, salt);
  const a = Buffer.from(hash, 'hex');
  const b = derived;
  return a.length === b.length && timingSafeEqual(a, b);
}

export function signAccessToken(payload: JwtPayload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

export function signRefreshToken(payload: JwtPayload) {
  return jwt.sign(payload, REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, REFRESH_TOKEN_SECRET);
}

const TokenSchema = z.object({
  sub: z.union([z.string(), z.number()]).transform(v => typeof v === 'string' ? Number(v) : v),
  email: z.string().email(),  
}).passthrough();

export function requireAuth(req: RequestWithData, res: Response, next: NextFunction) {
  const hdr = req.headers.authorization;
  if (!hdr?.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing bearer token' });
  const token = hdr.slice('Bearer '.length);
  try {
    const decoded = TokenSchema.parse(jwt.verify(token, JWT_SECRET));
  
    req.userId = decoded.sub;
    req.userEmail = decoded.email;    

    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
