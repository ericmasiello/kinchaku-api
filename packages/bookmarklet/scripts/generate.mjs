#!/usr/bin/env node

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = join(fileURLToPath(import.meta.url), '..');

const distDir = join(__dirname, '..', 'dist');
const bookmarkletFile = join(distDir, 'bookmarklet.js');
const htmlOutputFile = join(distDir, 'bookmarklet.html');

mkdirSync(distDir, { recursive: true });

// Read the compiled bookmarklet
const bookmarkletCode = readFileSync(bookmarkletFile, 'utf-8');

// Create a minified bookmarklet that can be used as a bookmark
// Simple approach: just collapse whitespace and remove unnecessary spaces around punctuation
// Don't try to remove comments since they could be in strings
const minified = bookmarkletCode
  .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments ONLY
  .replace(/\s+/g, ' ') // Collapse all whitespace to single spaces
  .replace(/\s*([{}();,])\s*/g, '$1') // Remove spaces around these punctuation marks only
  .replace(/;\s*}/g, '}') // Remove semicolons before closing braces
  .trim();

// Create the bookmarklet URL (javascript: protocol)
const bookmarkletUrl = `javascript:(function(){${minified}})();`;

// Generate an HTML file with the bookmarklet code
const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kinchaku Bookmarklet Setup</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 800px;
      margin: 50px auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .container {
      background: white;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    h1 {
      color: #333;
      margin-bottom: 10px;
    }
    .description {
      color: #666;
      margin-bottom: 30px;
      line-height: 1.6;
    }
    .setup-instructions {
      background: #f0f7ff;
      border-left: 4px solid #0066cc;
      padding: 20px;
      border-radius: 4px;
      margin-bottom: 30px;
    }
    .setup-instructions h2 {
      margin-top: 0;
      color: #0066cc;
    }
    .setup-instructions ol {
      margin: 15px 0;
      padding-left: 20px;
    }
    .setup-instructions li {
      margin: 10px 0;
      line-height: 1.6;
    }
    .code-section {
      margin: 30px 0;
    }
    .code-label {
      font-size: 14px;
      color: #666;
      margin-bottom: 10px;
      font-weight: 600;
      text-transform: uppercase;
    }
    code {
      background: #f5f5f5;
      padding: 15px;
      border-radius: 4px;
      display: block;
      overflow-x: auto;
      font-size: 12px;
      line-height: 1.4;
      color: #333;
      border: 1px solid #ddd;
    }
    .copy-button {
      background: #0066cc;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      margin-top: 10px;
      transition: background 0.2s;
    }
    .copy-button:hover {
      background: #0052a3;
    }
    .warning {
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px;
      border-radius: 4px;
      margin: 20px 0;
      color: #856404;
    }
    .success {
      background: #d4edda;
      border-left: 4px solid #28a745;
      padding: 15px;
      border-radius: 4px;
      margin: 20px 0;
      color: #155724;
    }
    #apiUrlInput {
      width: 100%;
      max-width: 500px;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
      box-sizing: border-box;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📌 Kinchaku Bookmarklet</h1>
    <p class="description">
      This bookmarklet allows you to save the current webpage's URL directly to your Kinchaku collection
      with a single click. It handles authentication automatically.
    </p>

    <div class="code-section">
      <div class="code-label">API Configuration</div>
      <p>Enter your Kinchaku API URL (default: https://kinchaku.synology.me):</p>
      <input 
        type="text" 
        id="apiUrlInput" 
        value="https://kinchaku.synology.me"
        placeholder="https://kinchaku.synology.me"
      />
      <p style="font-size: 12px; color: #666; margin-top: 10px;">
        The bookmarklet code below will be updated when you generate it.
      </p>
    </div>

    <div class="setup-instructions">
      <h2>Installation Steps</h2>
      <ol>
        <li>Copy the bookmarklet code from the section below</li>
        <li>In your browser, create a new bookmark (or right-click to edit existing one)</li>
        <li>Name it something memorable like "Save to Kinchaku"</li>
        <li>Paste the code into the URL field</li>
        <li>Save the bookmark</li>
      </ol>
    </div>

    <div class="code-section">
      <div class="code-label">Bookmarklet Code</div>
      <code id="bookmarkletCode" style="cursor: pointer;">Loading...</code>
      <button class="copy-button" onclick="copyBookmarklet(this)">Copy to Clipboard</button>
    </div>

    <div class="warning">
      <strong>⚠️ Security Note:</strong> This bookmarklet stores your authentication token in the browser's localStorage.
      Only install this bookmarklet in browsers you trust, and consider limiting usage to private browsing.
    </div>

    <div class="success">
      <strong>✨ Usage:</strong> When you click the bookmarklet on any webpage, it will automatically save that
      page's URL to your Kinchaku collection. If you're not logged in, it will prompt you for credentials.
    </div>

    <div class="code-section">
      <div class="code-label">How It Works</div>
      <ul>
        <li>Checks if you have valid authentication tokens stored</li>
        <li>If not, prompts you to log in with email and password</li>
        <li>Automatically refreshes expired tokens</li>
        <li>Saves the current page URL to your Kinchaku API</li>
        <li>Shows confirmation when successful</li>
      </ul>
    </div>
  </div>

  <script>
    const apiUrlInput = document.getElementById('apiUrlInput');
    const bookmarkletCodeElement = document.getElementById('bookmarkletCode');
    const baseBookmarklet = ${JSON.stringify(bookmarkletUrl)};

    function updateBookmarkletCode() {
      const apiUrl = apiUrlInput.value.trim() || 'https://kinchaku.synology.me';
      // Replace the API_BASE_URL in the code
      let code = baseBookmarklet.replace(/'https:\\/\\/kinchaku\\.synology\\.me'/g, "'" + apiUrl + "'");
      bookmarkletCodeElement.textContent = code;
    }

    function copyBookmarklet(button) {
      const code = bookmarkletCodeElement.textContent;
      navigator.clipboard.writeText(code).then(() => {
        const originalText = button.textContent;
        button.textContent = '✓ Copied!';
        setTimeout(() => {
          button.textContent = originalText;
        }, 2000);
      }).catch(err => {
        alert('Failed to copy: ' + err.message);
      });
    }

    apiUrlInput.addEventListener('change', updateBookmarkletCode);
    apiUrlInput.addEventListener('input', updateBookmarkletCode);

    // Initial load
    updateBookmarkletCode();
  </script>
</body>
</html>
`;

writeFileSync(htmlOutputFile, htmlContent, 'utf-8');

console.log('✓ Bookmarklet generated successfully!');
console.log(`  HTML: ${htmlOutputFile}`);
console.log(`  URL length: ${bookmarkletUrl.length} characters`);

if (bookmarkletUrl.length > 2083) {
  console.warn(
    '⚠️  Warning: Bookmarklet URL exceeds 2083 characters (browser URL limit)'
  );
}
