import { Router } from 'express';
import { z } from 'zod';
import db from '../db.ts';
import { requireAuth } from '../auth.ts';
import { type RequestWithData } from '../types.ts';
import { type InArgs } from '@libsql/client';
import {
  SecureUpdateSchema,
  updateArticle,
} from '../service/articleService.ts';

const router = Router();

router.use(requireAuth);

const CreateRequestSchema = z.object({
  body: z.object({
    url: z.string().url(),
    archived: z.boolean().optional().default(false),
    favorited: z.boolean().optional().default(false),
  }),
  userId: z.number(),
});

const DeleteRequestSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  userId: z.number(),
});

// List with optional filters
const ListSchema = z.object({
  query: z.object({
    archived: z.enum(['true', 'false']).optional(),
    favorited: z.enum(['true', 'false']).optional(),
    deleted: z.enum(['true', 'false']).optional(),
  }),
  userId: z.number(),
});

const GetSingleSchema = z.object({
  params: z.object({ id: z.string() }),
  userId: z.number(),
});

router.get('/', async (req: RequestWithData, res) => {
  const parsed = ListSchema.safeParse({
    query: req.query,
    userId: req.userId,
  });
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { archived, favorited, deleted } = parsed.data.query;

  const clauses: string[] = ['user_id = ?'];
  const params: InArgs = [parsed.data.userId];

  if (archived !== undefined) {
    clauses.push('archived = ?');
    params.push(archived === 'true' ? 1 : 0);
  }
  if (favorited !== undefined) {
    clauses.push('favorited = ?');
    params.push(favorited === 'true' ? 1 : 0);
  }

  // always filter out deleted items unless explicitly requested
  clauses.push('deleted = ?');
  params.push(deleted === 'true' ? 1 : 0);

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
  const parsed = CreateRequestSchema.safeParse({
    body: req.body,
    userId: req.userId,
  });

  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.flatten() });

  const { url, archived, favorited } = parsed.data.body;
  const userId = parsed.data.userId;

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
  const parsed = GetSingleSchema.safeParse({
    params: req.params,
    userId: req.userId,
  });

  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const results = await db.execute({
    sql: `SELECT id, url, archived, favorited, date_added, updated_at
     FROM articles WHERE id = ? AND user_id = ?`,
    args: [parsed.data.params.id, parsed.data.userId],
  });

  const result = results.rows.at(0);

  if (!result) {
    return res.status(404).json({ error: 'Not found' });
  }

  res.json(result);
});

const UpdateRequestSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: SecureUpdateSchema,
  userId: z.number(),
});

// Update (partial)
router.patch(
  '/:id',
  async (req: RequestWithData<Record<'id', string>>, res) => {
    const parsed = UpdateRequestSchema.safeParse({
      params: req.params,
      body: req.body,
      userId: req.userId,
    });

    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    try {
      const record = await updateArticle(
        parsed.data.params.id,
        parsed.data.userId,
        parsed.data.body
      );

      if (!record) {
        return res.status(404).json({ error: 'Not found' });
      }

      res.json(record);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === 'No valid fields to update'
      ) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }
      throw error;
    }
  }
);

// Delete
router.delete(
  '/:id',
  async (req: RequestWithData<Record<'id', string>>, res) => {
    const parsed = DeleteRequestSchema.safeParse({
      params: req.params,
      userId: req.userId,
    });

    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const results = await db.execute({
      sql: `UPDATE articles SET deleted = ?, updated_at = datetime('now')
     WHERE id = ? AND user_id = ?`,
      args: [1, parsed.data.params.id, parsed.data.userId],
    });

    if (results.rowsAffected === 0) {
      return res.status(404).json({ error: 'Not found' });
    }

    res.status(204).send();
  }
);

export default router;
