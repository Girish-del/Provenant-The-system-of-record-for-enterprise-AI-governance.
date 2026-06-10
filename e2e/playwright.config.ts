import { defineConfig } from '@playwright/test';

// Env the API needs at boot. Matches docker-compose + .env.example dev defaults.
const apiEnv: Record<string, string> = {
  DATABASE_URL: 'postgresql://aegis_app:aegis_app@localhost:5432/aegis',
  DIRECT_URL: 'postgresql://aegis:aegis@localhost:5432/aegis',
  REDIS_URL: 'redis://localhost:6379',
  SESSION_SECRET: 'dev-only-insecure-change-me-0123456789abcd',
  NODE_ENV: 'development',
  API_URL: 'http://localhost:3001',
  WEB_URL: 'http://localhost:3000',
  S3_ENDPOINT: 'http://localhost:4566',
  S3_ACCESS_KEY_ID: 'test',
  S3_SECRET_ACCESS_KEY: 'test',
  S3_REGION: 'eu-central-1',
  S3_BUCKET: 'aegis-evidence',
};

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  fullyParallel: false,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:3001',
  },
  // Build the API first (pnpm --filter @aegis/api build), then Playwright boots it here.
  webServer: {
    command: 'node ../apps/api/dist/main.js',
    url: 'http://localhost:3001/health',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: apiEnv,
  },
});
