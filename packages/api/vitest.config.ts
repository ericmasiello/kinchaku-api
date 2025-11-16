/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['src/__tests__/setup.ts'],
    // SQLite locks on concurrent writes. Running tests sequentially prevents
    // "database is locked" errors in CI environments with parallel test execution.
    minWorkers: 1,
    maxWorkers: 1,
  },
});
