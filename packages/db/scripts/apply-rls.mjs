// Applies prisma/rls.sql as the owning/superuser role (DIRECT_URL).
// Run after `prisma db push` / `prisma migrate`:  pnpm --filter @aegis/db rls:apply
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pg from 'pg';

const here = dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(join(here, '..', 'prisma', 'rls.sql'), 'utf8');

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DIRECT_URL or DATABASE_URL must be set');
  process.exit(1);
}

const client = new pg.Client({ connectionString });
await client.connect();
try {
  await client.query(sql);
  console.log('RLS applied (roles, policies, FORCE, append-only audit).');
} catch (err) {
  console.error('Failed to apply RLS:', err);
  process.exitCode = 1;
} finally {
  await client.end();
}
