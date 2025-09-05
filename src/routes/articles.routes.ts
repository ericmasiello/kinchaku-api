import { Router } from 'express';
import { z } from 'zod';
import db from '../db.ts';
import { requireAuth } from '../auth.ts';
import { type RequestWithData } from '../types.ts';

const router = Router();

const createSchema = z.object({
  url: z.string().url(),
  archived: z.boolean().optional().default(false),
  favorited: z.boolean().optional().default(false),
});

const updateSchema = z
  .object({
    url: z.string().url().optional(),
    archived: z.boolean().optional(),
    favorited: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'No fields to update',
  });

router.use(requireAuth);

// List with optional filters
router.get('/', async (req: RequestWithData, res) => {
  const userId = req.userId!;
  const { archived, favorited } = req.query;

  const clauses: string[] = ['user_id = ?'];
  const params: unknown[] = [userId];

  if (archived !== undefined) {
    clauses.push('archived = ?');
    params.push(String(archived) === 'true' ? 1 : 0);
  }
  if (favorited !== undefined) {
    clauses.push('favorited = ?');
    params.push(String(favorited) === 'true' ? 1 : 0);
  }

  // @ts-ignore -- FIXME
  const results = await db.execute({
    sql: `SELECT id, url, archived, favorited, date_added, updated_at
     FROM articles
     WHERE ${clauses.join(' AND ')}
     ORDER BY date_added DESC`,
    args: params,
  });

  const rows = results.rows;

  res.json({ items: rows });
});

// Create
router.post('/', async (req: RequestWithData, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.flatten() });

  const { url, archived, favorited } = parsed.data;
  const userId = req.userId!;

  const info = await db.execute({
    sql: `INSERT INTO articles (user_id, url, archived, favorited)
     VALUES (?, ?, ?, ?)`,
    args: [userId, url, archived ? 1 : 0, favorited ? 1 : 0],
  });

  const results = await db.execute({
    sql: `SELECT id, url, archived, favorited, date_added, updated_at
     FROM articles WHERE id = ? AND user_id = ?`,
    args: [info.lastInsertRowid!, userId],
  });

  res.status(201).json(results.rows.at(0));
});

// Read one
router.get('/:id', async (req: RequestWithData<Record<'id', string>>, res) => {
  const results = await db.execute({
    sql: `SELECT id, url, archived, favorited, date_added, updated_at
     FROM articles WHERE id = ? AND user_id = ?`,
    args: [req.params.id, req.userId!],
  });

  const result = results.rows.at(0);

  if (!result) return res.status(404).json({ error: 'Not found' });
  res.json(result);
});

// Update (partial)
router.patch(
  '/:id',
  async (req: RequestWithData<Record<'id', string>>, res) => {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({ error: parsed.error.flatten() });
    const updates = parsed.data;

    // Build dynamic SQL
    const sets: string[] = [];
    const params: unknown[] = [];

    if (updates.url !== undefined) {
      sets.push('url = ?');
      params.push(updates.url);
    }
    if (updates.archived !== undefined) {
      sets.push('archived = ?');
      params.push(updates.archived ? 1 : 0);
    }
    if (updates.favorited !== undefined) {
      sets.push('favorited = ?');
      params.push(updates.favorited ? 1 : 0);
    }

    if (!sets.length)
      return res.status(400).json({ error: 'No updates provided' });

    params.push(req.params.id, req.userId!);

    // @ts-ignore -- FIXME
    const info = await db.execute({
      sql: `UPDATE articles SET ${sets.join(', ')}, updated_at = datetime('now')
     WHERE id = ? AND user_id = ?`,
      args: params,
    });

    if (info.rowsAffected === 0)
      return res.status(404).json({ error: 'Not found' });

    const row = await db.execute({
      sql: `SELECT id, url, archived, favorited, date_added, updated_at
     FROM articles WHERE id = ? AND user_id = ?`,
      args: [req.params.id, req.userId!],
    });

    res.json(row);
  }
);

// Delete
router.delete(
  '/:id',
  async (req: RequestWithData<Record<'id', string>>, res) => {
    const info = await db.execute({
      sql: `DELETE FROM articles WHERE id = ? AND user_id = ?`,
      args: [req.params.id, req.userId!],
    });

    if (info.rowsAffected === 0)
      return res.status(404).json({ error: 'Not found' });
    res.status(204).send();
  }
);

export default router;
