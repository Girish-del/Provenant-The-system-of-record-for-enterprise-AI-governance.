# BUILD-LOG — AI Governance Platform (Aegis)

> **This file is the resume point.** If a session expires, read this top-to-bottom,
> then `docs/` (plan) and `DESIGN.md` (visual system), and continue from "Next up".
> Build cadence: **sequential, one component at a time**, each = its own git commit.
> Update this file at the end of every component (status + log entry).

**Last updated:** 2026-06-08
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
- ☐ 1.1 Monorepo scaffold (Turborepo + pnpm workspace, root config, shared `packages/config`)
- ☐ 1.2 Local dev: Docker Compose (Postgres, Redis, LocalStack) + Zod env schema + `pnpm dev`
- ☐ 1.3 CI: GitHub Actions (typecheck, lint, test, build on PR)
- ⊘ 1.4 Terraform skeleton (defer until first cloud deploy)

### M2 — Auth + multi-tenancy + RBAC
- ☐ 2.1 Prisma init + DB connection (non-superuser app role)
- ☐ 2.2 Org / User / Membership / Role models + RLS policies
- ☐ 2.3 WorkOS auth (SSO/OIDC + email) + httpOnly session
- ☐ 2.4 Tenant-context middleware (`app.current_org`) + deny-by-default authz guard
- ☐ 2.5 Always-on tenant-isolation test suite (CI-blocking)

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

## Decisions log (append-only)
| Date | Decision | Why |
|------|----------|-----|
| 2026-06-08 | Sequential direct build, not DevFleet | User wants one-component-at-a-time; DevFleet is parallel + not connected |
| 2026-06-08 | Carmine reserved for Prohibited/critical only | Resolve brand-red vs risk-red; keep risk semantics clean (see DESIGN.md) |

## Detailed log (newest first)
<!-- Append one entry per completed component: what shipped, key files, decisions, gotchas -->
- 2026-06-08 — Planning + design complete. 9 planning docs hardened, DESIGN.md + design-preview.html
  created, BUILD-LOG + project CLAUDE.md + git initialized. Next: component 1.1 (monorepo scaffold).

## Next up
**1.1 — Monorepo scaffold.** Create Turborepo + pnpm workspace: `apps/web`, `apps/api`,
`services/ai`, `packages/{contracts,db,core,ui,config,content}`, root `package.json`,
`pnpm-workspace.yaml`, `turbo.json`, base `tsconfig`, ESLint/Prettier. No install required to
commit the scaffold. Then 1.2.
