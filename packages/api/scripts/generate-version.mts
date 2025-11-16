#!/usr/bin/env node

import { execSync } from 'child_process';
import { writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface VersionInfo {
  commit: string;
  version: string;
  timestamp: string;
}

try {
  // Get git commit hash
  const commit = execSync('git rev-parse HEAD').toString().trim();

  // Get version from package.json
  const packageJsonPath = join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
  const version = packageJson.version as string;

  const versionInfo: VersionInfo = {
    commit,
    version,
    timestamp: new Date().toISOString(),
  };

  // Write to version.json in the source root
  const versionFilePath = join(__dirname, '..', 'version.json');
  writeFileSync(versionFilePath, JSON.stringify(versionInfo, null, 2));

  // eslint-disable-next-line no-console
  console.log(`✓ Version file created: ${versionInfo.commit} (${version})`);
} catch (error) {
  // eslint-disable-next-line no-console
  console.error('Error generating version file:', error);
  process.exit(1);
}
