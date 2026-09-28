import { defineConfig } from 'vitest/config';
import { testEnv } from './test/support/test-env.ts';

export default defineConfig({
  test: {
    globals: true,
    root: './',
    include: ['test/e2e/**/*.e2e-spec.ts'],
    env: testEnv,
    // Every e2e file builds its own app; run them one after the other.
    fileParallelism: false,
  },
});
