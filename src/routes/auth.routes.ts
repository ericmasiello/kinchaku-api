import { Router } from 'express';
import { z } from 'zod';
import db from '../db.ts';
import {
  hashPassword,
  signAccessToken,
  signRefreshToken,
  verifyPassword,
  verifyRefreshToken,
  requireAuth,
} from '../auth.ts';
import type { RequestWithData } from '../types.ts';

const router = Router();

const CredsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters')
      .max(128, 'New password must be at most 128 characters'),
    confirmPassword: z.string().min(1, 'Password confirmation is required'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New password and confirmation password don't match",
    path: ['confirmPassword'],
  });

router.post('/signup', async (req, res) => {
  const parsed = CredsSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.flatten() });

  const { email, password } = parsed.data;
  // Check if exists
  const exists = await db.execute({
    sql: 'SELECT id FROM users WHERE email = ?',
    args: [email],
  });

  if (exists.rows.length)
    return res.status(400).json({ error: 'Signup failed' });

  const { salt, hash } = await hashPassword(password);
  const info = await db.execute({
    sql: 'INSERT INTO users (email, password_hash, salt) VALUES (?, ?, ?)',
    args: [email.toLowerCase(), hash, salt],
  });

  const payload = {
    sub: Number(info.lastInsertRowid),
    email: email.toLowerCase(),
  };
  const token = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);
  return res.status(201).json({ token, refreshToken });
});

const UserResultSchema = z.object({
  id: z
    .union([z.string(), z.number()])
    .transform((v) => (typeof v === 'string' ? Number(v) : v)),
  email: z.string().email(),
  salt: z.string(),
  password_hash: z.string(),
});

router.post('/login', async (req, res) => {
  const parsed = CredsSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.flatten() });

  const { email, password } = parsed.data;
  const results = await db.execute({
    sql: 'SELECT * FROM users WHERE email = ?',
    args: [email.toLowerCase()],
  });
  if (results.rows.length === 0)
    return res.status(401).json({ error: 'Login failed' });

  const unparsedUser = results.rows.at(0);

  const user = UserResultSchema.parse(unparsedUser);

  const ok = await verifyPassword(password, user.salt, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Login failed' });

  const payload = { sub: user.id, email: user.email };
  const token = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);
  return res.json({ token, refreshToken });
});

// Refresh access token endpoint
router.post('/refresh', async (req, res) => {
  // TODO: add zod validation
  const { refreshToken } = req.body;
  if (!refreshToken)
    return res.status(400).json({ error: 'Missing refresh token' });
  try {
    const decodedRaw = verifyRefreshToken(refreshToken);
    // TODO: use zod to validate result is a JwtPayload (not a string)
    const decoded = decodedRaw as unknown as import('../types.ts').JwtPayload;
    if (
      !decoded ||
      typeof decoded.sub !== 'number' ||
      typeof decoded.email !== 'string'
    ) {
      throw new Error('Malformed token');
    }
    const payload = { sub: decoded.sub, email: decoded.email };
    const token = signAccessToken(payload);
    return res.json({ token });
  } catch {
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

// Change password endpoint
router.post(
  '/change-password',
  requireAuth,
  async (req: RequestWithData, res) => {
    const parsed = ChangePasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const { currentPassword, newPassword } = parsed.data;
    const userId = req.userId!;

    try {
      // Get current user's password data
      const results = await db.execute({
        sql: 'SELECT password_hash, salt FROM users WHERE id = ?',
        args: [userId],
      });

      if (results.rows.length === 0) {
        return res.status(404).json({ error: 'Invalid request' });
      }

      const result = results.rows.at(0);

      if (!result) {
        return res.status(404).json({ error: 'Invalid request' });
      }

      const userData = result as unknown as {
        password_hash: string;
        salt: string;
      };

      // Verify current password
      const isCurrentPasswordValid = await verifyPassword(
        currentPassword,
        userData.salt,
        userData.password_hash
      );

      if (!isCurrentPasswordValid) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }

      // Hash new password
      const { salt: newSalt, hash: newHash } = await hashPassword(newPassword);

      // Update password in database
      await db.execute({
        sql: 'UPDATE users SET password_hash = ?, salt = ? WHERE id = ?',
        args: [newHash, newSalt, userId],
      });

      return res.status(200).json({ message: 'Password changed successfully' });
    } catch (error) {
      console.error('Error changing password:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
