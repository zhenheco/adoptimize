/**
 * Vitest Configuration for AdOptimize (Root Level)
 *
 * Copy this file to the project root as vitest.config.ts
 * Run: cp specs/vitest.root.config.ts vitest.config.ts
 */

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
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
        'lib/api/types.ts',
        '*.config.*',
      ],
    },
    setupFiles: [],
  },
});
