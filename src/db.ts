import { DatabaseSync } from "node:sqlite";
import { DATABASE_PATH } from './config.js';

const db = new DatabaseSync(DATABASE_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    url TEXT NOT NULL,
    archived INTEGER NOT NULL DEFAULT 0,
    favorited INTEGER NOT NULL DEFAULT 0,
    date_added TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_articles_user ON articles(user_id);
  CREATE INDEX IF NOT EXISTS idx_articles_user_arch ON articles(user_id, archived);
  CREATE INDEX IF NOT EXISTS idx_articles_user_fav ON articles(user_id, favorited);
`);

export default db;
