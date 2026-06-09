# BUILD-LOG — AI Governance Platform (Aegis)

> **This file is the resume point.** If a session expires, read this top-to-bottom,
> then `docs/` (plan) and `DESIGN.md` (visual system), and continue from "Next up".
> Build cadence: **sequential, one component at a time**, each = its own git commit.
> Update this file at the end of every component (status + log entry).

**Last updated:** 2026-06-08 (M2 data layer + RLS done; next: 2.3/2.4 auth + API)
**Stack (locked):** TS monorepo — Turborepo+pnpm · Next.js (App Router) · NestJS+ts-rest ·
Postgres 16+Prisma+RLS · Python FastAPI AI svc · WorkOS · BullMQ→Temporal · pgvector ·
Stripe · Resend · Sentry · PostHog. Full rationale: `docs/02` + `docs/07`.
**Design:** `DESIGN.md` (Lapis primary, Sand accent, Carmine=critical only; Fraunces+Geist).
**Orchestration:** direct sequential build (DevFleet MCP not connected; it's for parallel
fan-out, not the sequential cadence requested). Connect later for parallel M4–M6 if desired.

## How to resume (paste-ready)
1. Read this file, then `docs/00-OVERVIEW.md`, `docs/08-ENGINEERING-FOUNDATIONS.md`, `DESIGN.md`.
2. `git log --oneline -15` to see what shipped.
3. Find the first ☐ under "Component checklist" → that's the next component.
4. Build it, test it, commit it (`feat:`/`chore:`), tick it here, add a log entry, continue.

## Status legend
☐ not started · ◐ in progress · ☑ done · ⊘ deferred

## Component checklist (sequential)

### M1 — Foundation
- ☑ 1.1 Monorepo scaffold (Turborepo + pnpm workspace, root config, shared `packages/config`) — commit 19c7d92
- ☑ 1.2 Local dev: Docker Compose (Postgres, Redis, LocalStack) + Zod env schema — commit 1599bdb
- ☑ 1.3 CI: GitHub Actions (typecheck, lint, test, build, secret scan) — commit 1d8505d
- ⊘ 1.4 Terraform skeleton (deferred until first cloud deploy)
- ☑ **M1 Foundation complete.** `pnpm dev` wiring lands when apps exist (M2).

### M2 — Auth + multi-tenancy + RBAC
- ☑ 2.1 Prisma init + DB connection (non-superuser `aegis_app` role) — commit b48beb8
- ☑ 2.2 Org / User / Membership / Role models + RLS policies (FORCE, append-only audit) — commit b48beb8
- ☐ 2.3 Auth provider interface + **dev provider** (email); WorkOS adapter deferred (credential wall)
- ☐ 2.4 NestJS app + tenant-context middleware (`app.current_org`) + deny-by-default authz guard
- ◐ 2.5 Tenant-isolation suite: test written + wired CI-blocking (Postgres service + db push + rls:apply).
  **Live-verify pending** one run with Postgres up (Docker daemon was down in-session).

### M3 — Data layer
- ☐ 3.1 Core Prisma schema (UseCase, Model, Dataset, RiskAssessment, Framework, Control,
  ControlCrosswalk, ControlMapping, Evidence, Policy, Workflow/Task, Approval, Report, AuditLog)
- ☐ 3.2 Migrations (reversible) + seed (demo tenant + EU AI Act/NIST starter content)
- ☐ 3.3 Content-as-data layer (frameworks/controls/crosswalks/questionnaires as versioned rows)

### M4–M9 — Core features (fan-out candidates)
- ☐ M4 AI Use-Case Registry (CRUD, lifecycle, CSV import)
- ☐ M5 Framework/Control library + crosswalk
- ☐ M6 Risk classification engine + EU AI Act questionnaire → tier + rationale
- ☐ M7 Control mapping + evidence upload (S3 + malware scan)
- ☐ M8 Intake → review → approve workflow + audit trail (hash-chained)
- ☐ M9 Python AI service: classify + draft + suggest (Claude) + provenance logging

### M10–M13 — Readiness, reports, tests, security
- ☐ M10 Readiness dashboard + gap report
- ☐ M11 Report export (PDF/MD readiness doc)
- ☐ M12 E2E (Playwright): intake → classify → map → evidence → approve → export
- ☐ M13 Security pass: isolation tests, secret scan, SAST, headers

### M14–M17 — Production / commercial scope
- ☐ M14 Stripe billing + plan tiers + usage metering (governed AI systems)
- ☐ M15 Platform ops: Sentry + PostHog (analytics + flags) + OTel + Resend email
- ☐ M16 AI cost controls: model routing, prompt caching, per-tenant budgets, circuit breaker
- ☐ M17 PLG assessment surface (low-friction funnel)

### Backlog — low priority (after main functionality)
- ☐ B1 **Google OAuth login + register** (user-requested, LOW priority). Note: WorkOS
  AuthKit provides Google social login natively, so once 2.3's WorkOS adapter is wired
  this is mostly configuration. Do after core features work.
- ☐ B2 Membership-based RLS policy on `organizations` (currently app-layer guarded only).
- ☐ B3 Convert `rls.sql` into a versioned Prisma migration (currently applied via script).

## Decisions log (append-only)
| Date | Decision | Why |
|------|----------|-----|
| 2026-06-08 | Sequential direct build, not DevFleet | User wants one-component-at-a-time; DevFleet is parallel + not connected |
| 2026-06-08 | Carmine reserved for Prohibited/critical only | Resolve brand-red vs risk-red; keep risk semantics clean (see DESIGN.md) |

## Detailed log (newest first)
<!-- Append one entry per completed component: what shipped, key files, decisions, gotchas -->
- 2026-06-08 — **2.1+2.2 Data layer + RLS** (commit b48beb8). `@aegis/db`: Prisma schema
  (Organization, User, Membership[org-scoped], AuditLog[org-scoped, append-only, hash-chain cols]).
  `prisma/rls.sql`: non-superuser `aegis_app` role, RLS + FORCE on memberships/audit_logs,
  fail-closed via `current_setting('app.current_org', true)`, REVOKE update/delete on audit_logs.
  `forOrg(orgId, fn)` tenant-scoped client (interactive tx + SET LOCAL). Isolation test (scoped
  reads / fail-closed / WITH CHECK). Two-role URLs (DATABASE_URL=aegis_app, DIRECT_URL=aegis).
  CI now provisions Postgres + db push + rls:apply + runs the isolation suite (CI-blocking).
  Verified statically: prisma validate, generate, typecheck, build, lint. Gotcha: Docker daemon
  did not boot in-session, so the live RLS run is deferred to CI / local `docker compose up`.
- 2026-06-08 — **1.3 CI** (commit 1d8505d). `.github/workflows/ci.yml`: build job (install
  frozen → typecheck → lint → test → build) + security job (gitleaks). Gate sequence verified
  locally; lint/test/build are no-ops until packages define them.
- 2026-06-08 — **1.2 Local dev env** (commit 1599bdb). `docker-compose.yml` (Postgres 16, Redis 7,
  LocalStack S3, healthchecks). `.env.example`. `@aegis/config` → Zod env schema (`parseEnv`,
  fail-fast) + `@types/node`. Docker 27 + Compose v2 present. Gotcha: needed `@types/node` for
  `process`/`NodeJS` types in the schema.
- 2026-06-08 — **1.1 Monorepo scaffold** (commit 19c7d92). Turborepo 2.9 + pnpm 9 workspace.
  Root: package.json, pnpm-workspace.yaml, turbo.json, tsconfig.json, .prettierrc.json, .node-version.
  `@aegis/config` (shared tsconfig.base). Workspace dirs apps/{web,api}, services/ai,
  packages/{contracts,db,core,ui,content} with README placeholders. `pnpm install` verified;
  turbo resolves the graph. Gotcha: Windows CRLF warnings on commit (harmless).
- 2026-06-08 — Planning + design complete. 9 planning docs hardened, DESIGN.md + design-preview.html
  created, BUILD-LOG + project CLAUDE.md + git initialized.

## Next up
**2.3 + 2.4 — Auth + NestJS API.** Scaffold `apps/api` (NestJS). Build an auth-provider
interface with a **dev provider** (email-only, no external account) so local login works now;
the WorkOS adapter (and Google login via WorkOS, backlog B1) drops in when keys arrive. Add
the tenant-context middleware that reads the session and wraps requests with `forOrg`, plus a
deny-by-default RBAC guard with object-level checks. Then close out 2.5 by running the
isolation suite live.

**Local runbook to verify RLS (when Docker is up):**
```
docker compose up -d postgres
export DIRECT_URL=postgresql://aegis:aegis@localhost:5432/aegis
DATABASE_URL=postgresql://aegis:aegis@localhost:5432/aegis pnpm --filter @aegis/db exec prisma db push --skip-generate
DIRECT_URL=$DIRECT_URL pnpm --filter @aegis/db rls:apply
DATABASE_URL=postgresql://aegis_app:aegis_app@localhost:5432/aegis pnpm --filter @aegis/db test
```
Design sign-off: APPROVED 2026-06-08 — UI work (M4+) is unblocked.
