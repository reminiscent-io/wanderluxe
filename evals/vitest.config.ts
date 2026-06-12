import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..');

// Eval-only config. LLM suites are slow, cost money, and share one seeded
// eval user — so: node env, generous timeouts, strictly serial, single fork
// (lets helpers memoize auth once per run). Never wired into CI.
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    root: repoRoot,
    include: ['evals/**/*.eval.ts'],
    setupFiles: ['./evals/setup.ts'],
    globalSetup: ['./evals/globalSetup.ts'],
    testTimeout: 120_000,
    hookTimeout: 60_000,
    fileParallelism: false,
    sequence: { concurrent: false },
    pool: 'forks',
    singleFork: true,
    passWithNoTests: true,
  },
  resolve: {
    alias: { '@': path.resolve(repoRoot, 'src') },
  },
});
