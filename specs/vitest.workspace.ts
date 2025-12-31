/**
 * Vitest Workspace Configuration for AdOptimize
 *
 * INSTRUCTION: Copy this file to the project root
 * Run: cp specs/vitest.workspace.ts vitest.workspace.ts
 */

import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  {
    test: {
      name: 'unit',
      root: '.',
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
      environment: 'jsdom',
      globals: true,
    },
    resolve: {
      alias: {
        '@': '.',
      },
    },
  },
]);
