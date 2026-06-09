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

-- 2. Tenant isolation policy, applied uniformly to every org-scoped table.
DO $$
DECLARE
  t text;
  org_tables text[] := ARRAY[
    'memberships', 'audit_logs', 'use_cases', 'ai_models', 'datasets',
    'risk_assessments', 'control_mappings', 'evidence', 'policies',
    'workflows', 'tasks', 'approvals', 'reports'
  ];
BEGIN
  FOREACH t IN ARRAY org_tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I '
      'USING (org_id = nullif(current_setting(''app.current_org'', true), '''')::uuid) '
      'WITH CHECK (org_id = nullif(current_setting(''app.current_org'', true), '''')::uuid)',
      t
    );
  END LOOP;
END
$$;

-- 3. Audit log is append-only: no UPDATE/DELETE for the app role.
REVOKE UPDATE, DELETE ON audit_logs FROM aegis_app;

-- NOTE: `organizations` and `users` are NOT org_id-scoped (org is the tenant root;
-- user is a global identity), and the content library (frameworks, controls,
-- control_crosswalks, questionnaires, questions) is global read-only reference
-- data. Access to organizations/users is enforced at the application layer via
-- membership checks. A membership-based RLS policy on `organizations` is a planned
-- hardening follow-up (tracked in BUILD-LOG, backlog B2).
