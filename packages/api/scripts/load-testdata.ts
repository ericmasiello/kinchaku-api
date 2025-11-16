#!/usr/bin/env node

import { createClient } from '@libsql/client';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { existsSync, unlinkSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = dirname(__dirname);

const sqlFile = join(__dirname, 'testdata.sql');
const dbFile = join(projectRoot, 'test.db');

async function loadTestData() {
  try {
    console.log(`Loading test data from ${sqlFile} into ${dbFile}...`);

    // Remove existing test.db if it exists
    if (existsSync(dbFile)) {
      console.log('Removing existing test.db...');
      unlinkSync(dbFile);
    }

    // Read the SQL file
    const sqlContent = readFileSync(sqlFile, 'utf8');

    // Create database client
    const client = createClient({
      url: `file:${dbFile}`,
    });

    // Split SQL content into individual statements
    // Remove empty lines and comments, but keep the SQL structure
    const statements = sqlContent
      .split(';')
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0 && !stmt.startsWith('--'));

    // Execute each statement
    for (const statement of statements) {
      if (statement.trim()) {
        await client.execute(statement + ';');
      }
    }

    console.log('✅ Test data loaded successfully into test.db');
    console.log(`Database file created at: ${dbFile}`);

    // Verify the data was loaded correctly
    const userCount = await client.execute(
      'SELECT COUNT(*) as count FROM users'
    );
    const articleCount = await client.execute(
      'SELECT COUNT(*) as count FROM articles'
    );

    console.log(
      `📊 Loaded ${userCount.rows[0].count} users and ${articleCount.rows[0].count} articles`
    );
  } catch (error) {
    console.error('❌ Failed to load test data:', error);
    process.exit(1);
  }
}

loadTestData();
