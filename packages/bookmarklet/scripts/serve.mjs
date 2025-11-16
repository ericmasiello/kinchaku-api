#!/usr/bin/env node

import http from 'http';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = join(fileURLToPath(import.meta.url), '..');
const htmlFile = join(__dirname, '..', 'dist', 'bookmarklet.html');

const PORT = 3001;

const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/bookmarklet.html') {
    try {
      const html = readFileSync(htmlFile, 'utf-8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(
        'Error: bookmarklet.html not found. Run "npm run build && npm run generate" first.'
      );
    }
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log(
    `\n📌 Kinchaku Bookmarklet server running at http://localhost:${PORT}\n`
  );
  console.log('Steps:');
  console.log(`1. Open http://localhost:${PORT} in your browser`);
  console.log('2. Copy the bookmarklet code');
  console.log(
    '3. Create a new bookmark in your browser and paste the code into the URL field\n'
  );
});
