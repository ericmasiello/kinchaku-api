PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;
CREATE TABLE IF NOT EXISTS users (
id INTEGER PRIMARY KEY AUTOINCREMENT,
email TEXT UNIQUE NOT NULL,
password_hash TEXT NOT NULL,
salt TEXT NOT NULL,
created_at TEXT DEFAULT (datetime('now'))
);
INSERT INTO users VALUES(1,'me@example.com','bbe5c90e3b3576e9426f57a4c549ea8d61003efa3cf412db5c75138b36f3b0ebadd15ded93d76053af764aa673069b4367bc7b9d9b92af980034f5e7bc5d979a','53a7c2e79fe46ea76fd198ca16b634c3','2025-08-31 23:02:30');
INSERT INTO users VALUES(2,'eric.j.masiello@gmail.com','c611e284ee1969e25983ee62649b5b1d205863c26e655299bf62a5bb9fab05dcfbc55e237c932337d5de9331572ded35738af0fc4d50957e5b949e4b9353e2ab','8cff2888ab776557b986ef67d6925ac6','2025-09-04 21:02:49');
CREATE TABLE IF NOT EXISTS articles (    id INTEGER PRIMARY KEY AUTOINCREMENT,    user_id INTEGER NOT NULL,    url TEXT NOT NULL,    archived INTEGER NOT NULL DEFAULT 0,    favorited INTEGER NOT NULL DEFAULT 0,    date_added TEXT NOT NULL DEFAULT (datetime('now')),    updated_at TEXT NOT NULL DEFAULT (datetime('now')), `deleted` integer DEFAULT '0' NOT NULL,    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE  );
INSERT INTO articles VALUES(1,1,'https://example.com/great-read',0,1,'2025-08-31 23:16:50','2025-08-31 23:16:50',0);
INSERT INTO articles VALUES(2,1,'https://synbydesign.com',0,0,'2025-08-31 23:18:51','2025-08-31 23:18:51',0);
INSERT INTO articles VALUES(3,1,'https://synbydesign.com',0,0,'2025-08-31 23:31:31','2025-08-31 23:31:31',0);
INSERT INTO articles VALUES(4,2,'https://krasimirtsonev.com/blog/article/vanilla-react-server-components-with-no-framework',0,0,'2025-09-04 21:05:15','2025-09-04 21:05:15',0);
INSERT INTO articles VALUES(5,2,'https://www.simeongriggs.dev/use-the-activity-boundary-to-hide-suspenseful-components',0,0,'2025-09-04 21:05:28','2025-09-04 21:05:28',0);
INSERT INTO articles VALUES(6,2,'https://devblogs.microsoft.com/typescript/announcing-typescript-5-9/',1,0,'2025-09-04 21:06:01','2025-09-12 23:37:25',0);
INSERT INTO articles VALUES(7,2,'https://github.blog/ai-and-ml/generative-ai/how-to-build-secure-and-scalable-remote-mcp-servers/',0,0,'2025-09-04 21:06:41','2025-09-04 21:06:41',0);
INSERT INTO articles VALUES(8,2,'https://laconicwit.com/vi-mock-is-a-footgun-why-vi-spyon-should-be-your-default/',0,0,'2025-09-04 21:06:53','2025-09-04 21:06:53',0);
INSERT INTO articles VALUES(9,2,'https://csswizardry.com/2025/07/the-extensibility-api/',1,0,'2025-09-04 21:07:10','2025-09-13 21:21:36',0);
INSERT INTO articles VALUES(10,2,'https://blog.trailofbits.com/2025/07/28/we-built-the-security-layer-mcp-always-needed/',0,0,'2025-09-04 21:07:33','2025-09-09 13:29:03',0);
INSERT INTO articles VALUES(13,2,'https://www.manning.com/write-for-us',1,0,'2025-09-05 01:24:55','2025-09-05 18:26:26',0);
INSERT INTO articles VALUES(17,2,'https://preactjs.com/blog/simplifying-islands-arch',1,0,'2025-09-08 18:46:41','2025-09-08 19:06:18',0);
INSERT INTO articles VALUES(18,2,'https://developer.apple.com/documentation/TechnologyOverviews/adopting-liquid-glass',0,0,'2025-09-14 10:13:21','2025-09-14 10:14:58',1);
INSERT INTO articles VALUES(19,2,'https://developer.apple.com/documentation/TechnologyOverviews/adopting-liquid-glass',0,0,'2025-09-14 10:28:44','2025-09-14 10:29:28',1);
INSERT INTO articles VALUES(20,2,'https://developer.apple.com/documentation/TechnologyOverviews/adopting-liquid-glass',1,0,'2025-09-14 11:02:57','2025-09-14 11:04:55',0);
DELETE FROM sqlite_sequence;
INSERT INTO sqlite_sequence VALUES('users',2);
INSERT INTO sqlite_sequence VALUES('articles',20);
CREATE INDEX idx_articles_user ON articles(user_id);
CREATE INDEX idx_articles_user_arch ON articles(user_id, archived);
CREATE INDEX idx_articles_user_fav ON articles(user_id, favorited);
COMMIT;
