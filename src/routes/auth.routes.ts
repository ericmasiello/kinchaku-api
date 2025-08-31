import { Router } from 'express';
import { z } from 'zod';
import db from '../db.js';
import { hashPassword, signAccessToken, verifyPassword } from '../auth.js';

const router = Router();

const CredsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128)
});

router.post('/signup', async (req, res) => {
  const parsed = CredsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { email, password } = parsed.data;
  // Check if exists
  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (exists) return res.status(409).json({ error: 'Email already registered' });

  const { salt, hash } = await hashPassword(password);
  const info = db.prepare(
    'INSERT INTO users (email, password_hash, salt) VALUES (?, ?, ?)'
  ).run(email.toLowerCase(), hash, salt);

  const token = signAccessToken({ sub: Number(info.lastInsertRowid), email: email.toLowerCase() });
  return res.status(201).json({ token });
});

const UserResultSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(v => typeof v === 'string' ? Number(v) : v),
  email: z.string().email(),
  salt: z.string(),
  password_hash: z.string()
});

router.post('/login', async (req, res) => {
  const parsed = CredsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { email, password } = parsed.data;
  const unparsedUser = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!unparsedUser) return res.status(401).json({ error: 'Invalid credentials' });

  const user = UserResultSchema.parse(unparsedUser);

  const ok = await verifyPassword(password, user.salt, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

  const token = signAccessToken({ sub: user.id, email: user.email });
  return res.json({ token });
});

export default router;
