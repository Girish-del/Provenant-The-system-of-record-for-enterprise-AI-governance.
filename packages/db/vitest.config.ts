import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    // Sets DATABASE_URL/DIRECT_URL defaults before ./client constructs Prisma.
    setupFiles: ['./test/setup-env.ts'],
    // DB-backed tests share one Postgres; run serially to avoid cross-test races.
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
