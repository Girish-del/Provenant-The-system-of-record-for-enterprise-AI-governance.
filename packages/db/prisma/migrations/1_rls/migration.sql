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

-- 4. Content library is read-only to the app role (managed by the platform, seeded by
--    the owner role). The app may SELECT shared reference content but never modify it.
REVOKE INSERT, UPDATE, DELETE ON frameworks, controls, control_crosswalks, questionnaires, questions FROM aegis_app;

-- 5. B2 hardening: `organizations` is the tenant root, so the login flow must
--    read and create org rows BEFORE any tenant context exists (find-by-slug,
--    signup). SELECT/INSERT therefore stay open to the app role, but UPDATE and
--    DELETE are restricted at the database to the org in context — a compromised
--    app-layer query can no longer mutate another tenant's organization (plan,
--    name, Stripe ids). System writers (e.g. the Stripe webhook) set the tenant
--    context to the org id carried in the signature-verified event before writing.
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS org_select ON organizations;
CREATE POLICY org_select ON organizations FOR SELECT USING (true);
DROP POLICY IF EXISTS org_insert ON organizations;
CREATE POLICY org_insert ON organizations FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS org_update_own ON organizations;
CREATE POLICY org_update_own ON organizations FOR UPDATE
  USING (id = nullif(current_setting('app.current_org', true), '')::uuid)
  WITH CHECK (id = nullif(current_setting('app.current_org', true), '')::uuid);
DROP POLICY IF EXISTS org_delete_own ON organizations;
CREATE POLICY org_delete_own ON organizations FOR DELETE
  USING (id = nullif(current_setting('app.current_org', true), '')::uuid);

-- NOTE: `users` is a global identity table (no org_id); app-layer guarded. The
-- content library (frameworks, controls, crosswalks, questionnaires, questions)
-- is global read-only reference data (REVOKEd above).
