-- Row-Level Security setup for Aegis tenant isolation.
-- Applied AFTER the schema is created (prisma migrate/db push), by scripts/apply-rls.mjs,
-- as the owning/superuser role (DIRECT_URL). The application connects as the
-- non-superuser role `aegis_app` so these policies are actually enforced.
--
-- Tenant context is set per request/transaction via:  SET LOCAL app.current_org = '<uuid>'
-- `nullif(current_setting('app.current_org', true), '')` is NULL when the setting is
-- unset OR when a pooled connection reverted a prior SET LOCAL to an empty string, so an
-- unscoped query matches no rows (fail closed) instead of erroring on ''::uuid.

-- 1. Non-superuser runtime role (no BYPASSRLS).
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'aegis_app') THEN
    CREATE ROLE aegis_app LOGIN PASSWORD 'aegis_app';
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO aegis_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO aegis_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO aegis_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO aegis_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO aegis_app;

-- 2. Tenant isolation policies on org-scoped tables.
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON memberships;
CREATE POLICY tenant_isolation ON memberships
  USING (org_id = nullif(current_setting('app.current_org', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.current_org', true), '')::uuid);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON audit_logs;
CREATE POLICY tenant_isolation ON audit_logs
  USING (org_id = nullif(current_setting('app.current_org', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.current_org', true), '')::uuid);

-- 3. Audit log is append-only: no UPDATE/DELETE for the app role.
REVOKE UPDATE, DELETE ON audit_logs FROM aegis_app;

-- NOTE: `organizations` and `users` are NOT org_id-scoped (org is the tenant root;
-- user is a global identity). Access to them is enforced at the application layer
-- via membership checks. A membership-based RLS policy on `organizations` is a
-- planned hardening follow-up (tracked in BUILD-LOG).
