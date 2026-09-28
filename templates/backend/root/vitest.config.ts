import { defineConfig } from 'vitest/config';
import { testEnv } from './test/support/test-env.ts';

export default defineConfig({
  test: {
    globals: true,
    root: './',
    include: ['test/unit/**/*.spec.ts'],
    env: testEnv,
  },
});
