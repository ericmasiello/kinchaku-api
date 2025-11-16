import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface VersionInfo {
  commit: string;
  version: string;
  timestamp?: string;
}

function getVersionInfo(): VersionInfo {
  const versionFile = join(__dirname, '..', 'version.json');

  try {
    const data = readFileSync(versionFile, 'utf-8');
    return JSON.parse(data);
  } catch {
    // Fallback if version.json doesn't exist (e.g., during development)
    return {
      commit: 'development',
      version: '1.0.0-dev',
    };
  }
}

export const VERSION_INFO = getVersionInfo();
