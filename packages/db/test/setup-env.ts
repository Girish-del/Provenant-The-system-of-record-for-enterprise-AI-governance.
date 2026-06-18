// vitest setupFiles — runs before any test file imports `./client`, so DATABASE_URL
// is in place when the Prisma client is constructed at module-import time.
//
// Under `pnpm test` (turbo), CI step env vars are not reliably passed through to the
// task, and the dev `.env` loaded by dotenv-cli is empty in CI. These `??=` defaults
// match the CI Postgres service so the tenant-isolation suite connects as the
// non-superuser app role (`aegis_app`) and RLS is actually exercised. Locally, the
// real `.env` value (loaded first by dotenv-cli) wins, so `??=` is a no-op.
process.env.DATABASE_URL ??= 'postgresql://aegis_app:aegis_app@localhost:5432/aegis';
process.env.DIRECT_URL ??= 'postgresql://aegis:aegis@localhost:5432/aegis';
