import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

export default defineConfig({
  test: {
    include: ['test/**/*.spec.ts'],
    setupFiles: ['test/setup-env.ts'],
    // One Nest app + one Postgres: run serially.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
  plugins: [
    // esbuild (vitest's default) does not emit decorator metadata, which NestJS
    // DI requires — transform with SWC instead (backlog B4 unblock).
    swc.vite({
      jsc: {
        parser: { syntax: 'typescript', decorators: true },
        transform: { legacyDecorator: true, decoratorMetadata: true },
        target: 'es2022',
      },
      module: { type: 'es6' },
    }),
  ],
});
