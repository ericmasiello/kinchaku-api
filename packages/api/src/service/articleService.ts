import { z } from 'zod';
import db from '../db.ts';

// Security: Zod-based secure update schema that defines allowed columns and their validation
// This approach combines validation, type safety, and SQL injection prevention
export const SecureUpdateSchema = z
  .object({
    url: z.string().url().optional(),
    archived: z.boolean().optional(),
    favorited: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'No fields to update',
  });

// Type-safe mapping of schema fields to database columns
const SCHEMA_TO_COLUMN_MAP = {
  url: 'url',
  archived: 'archived',
  favorited: 'favorited',
} as const satisfies Record<keyof z.infer<typeof SecureUpdateSchema>, string>;

/**
 * Zod-based secure query builder for UPDATE operations
 *
 * This function uses Zod for both validation and SQL generation:
 * 1. Validates input data against predefined schema (prevents injection)
 * 2. Only processes schema-defined fields (whitelist approach)
 * 3. Uses parameterized queries for all values (prevents value injection)
 * 4. Provides complete type safety from input to SQL
 *
 * Security: This function is inherently secure because:
 * - Input is validated by Zod schema before processing
 * - Only schema-defined fields can be included in SQL
 * - All values are parameterized
 * - TypeScript ensures compile-time safety
 *
 * @param updates - Raw object containing field updates from request body
 * @returns Object with SQL string and parameters array
 * @throws ZodError if validation fails
 */
function buildZodSecureUpdateQuery(updates: unknown): {
  sql: string;
  params: (string | number)[];
} {
  // Validate and parse input using Zod - this ensures only valid data is processed
  const validatedUpdates = SecureUpdateSchema.parse(updates);

  const sets: string[] = [];
  const params: (string | number)[] = [];

  // Process only the validated fields - no risk of injection since fields are schema-defined
  for (const [field, value] of Object.entries(validatedUpdates)) {
    if (value !== undefined) {
      const columnName =
        SCHEMA_TO_COLUMN_MAP[field as keyof typeof SCHEMA_TO_COLUMN_MAP];
      sets.push(`${columnName} = ?`);

      // Handle boolean values for SQLite (Zod ensures type safety)
      if (typeof value === 'boolean') {
        params.push(value ? 1 : 0);
      } else {
        params.push(value);
      }
    }
  }

  const sql = `UPDATE articles SET ${sets.join(
    ', '
  )}, updated_at = datetime('now') WHERE id = ? AND user_id = ?`;

  return { sql, params };
}

export async function updateArticle(
  articleId: string,
  userId: number,
  payload: z.infer<typeof SecureUpdateSchema>
) {
  // Security: Use Zod-based secure query builder to prevent SQL injection
  // This validates input with Zod schema and only processes whitelisted fields
  const { sql, params } = buildZodSecureUpdateQuery(payload);

  // Add ID and user ID to params for WHERE clause
  params.push(articleId, userId);

  const info = await db.execute({
    sql,
    args: params,
  });

  if (info.rowsAffected === 0) {
    throw new Error('No matching record found');
  }

  const results = await db.execute({
    sql: `SELECT id, url, archived, favorited, date_added, updated_at
       FROM articles WHERE id = ? AND user_id = ?`,
    args: [articleId, userId],
  });

  return results.rows.at(0);
}
