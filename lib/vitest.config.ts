/**
 * Vitest Configuration for AdOptimize
 *
 * Uses manual alias resolution matching tsconfig.json paths
 */

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': rootDir,
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    root: rootDir,
    include: [
      'lib/**/__tests__/**/*.test.ts',
      'lib/**/__tests__/**/*.test.tsx',
      'hooks/**/__tests__/**/*.test.ts',
      'hooks/**/__tests__/**/*.test.tsx',
      'components/**/__tests__/**/*.test.ts',
      'components/**/__tests__/**/*.test.tsx',
    ],
    exclude: ['node_modules', 'backend', '.next'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'lib/**/*.ts',
        'lib/**/*.tsx',
        'hooks/**/*.ts',
        'hooks/**/*.tsx',
        'components/**/*.tsx',
      ],
      exclude: [
        'node_modules',
        'backend',
        '.next',
        '**/*.d.ts',
        '**/__tests__/**',
        '**/index.ts',
        'specs/**',
        'lib/vitest.config.ts',
        'lib/vitest.config.ts.tmp',
        'lib/api/types.ts',
        '*.config.*',
      ],
    },
    setupFiles: [],
  },
});
