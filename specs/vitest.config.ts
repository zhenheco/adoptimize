/**
 * Vitest Configuration for AdOptimize
 *
 * INSTRUCTION: Copy this file to the project root
 * Run: cp specs/vitest.config.ts vitest.config.ts
 *
 * Then run: pnpm test
 */

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    include: [
      'lib/**/__tests__/**/*.test.ts',
      'lib/**/__tests__/**/*.test.tsx',
      'components/**/__tests__/**/*.test.ts',
      'components/**/__tests__/**/*.test.tsx',
      'hooks/**/__tests__/**/*.test.ts',
      'hooks/**/__tests__/**/*.test.tsx',
      'app/**/__tests__/**/*.test.ts',
      'app/**/__tests__/**/*.test.tsx',
    ],
    exclude: ['node_modules', 'backend', '.next'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules',
        'backend',
        '.next',
        '**/*.d.ts',
        '**/__tests__/**',
        'specs/**',
      ],
    },
    setupFiles: [],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
