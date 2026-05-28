import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['plugin/**/*.test.ts'],
  },
});
 