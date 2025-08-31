// ensure-data-dir.js
// This script ensures that a 'data' directory exists in the project root.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, '../data');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
  console.log("Created 'data' directory.");
} else {
  console.log("'data' directory already exists.");
}
