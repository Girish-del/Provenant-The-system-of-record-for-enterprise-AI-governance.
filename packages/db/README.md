# @aegis/db

Prisma schema, migrations, seed data, and Row-Level Security policies. Every
tenant-scoped table carries `org_id` and an RLS policy; the app connects as a
non-superuser role with no BYPASSRLS. Tenant isolation is verified by an always-on
test suite (CI-blocking).

Built in components 2.2 (tenancy) and 3.x (core schema). See `BUILD-LOG.md`.
