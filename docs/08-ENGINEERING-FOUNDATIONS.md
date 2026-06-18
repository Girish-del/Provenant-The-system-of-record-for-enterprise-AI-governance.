# Engineering Foundations — AI Governance Platform

> The "start writing code" doc. Concrete repo structure, conventions, environment
> setup, and the build-ready spec for the spine (M1–M3) so an engineer (or an agent
> fleet) can begin immediately on the locked **TypeScript monorepo** lane. Companion
> to `02-ARCHITECTURE.md` (system design) and `03-ROADMAP.md` (sequencing).

## 1. Repo structure (Turborepo + pnpm)

```
ai-governance/
├─ apps/
│  ├─ web/                 # Next.js (App Router) — platform UI + PLG assessment
│  └─ api/                 # NestJS core API
├─ services/
│  └─ ai/                  # Python FastAPI AI service (classify, draft, RAG)
├─ packages/
│  ├─ contracts/           # ts-rest API contracts + Zod schemas (shared web↔api)
│  ├─ db/                  # Prisma schema, migrations, seed, RLS policies
│  ├─ core/                # domain logic: risk scoring, crosswalk resolution, RBAC
│  ├─ ui/                  # shared React components (shadcn-based) + tokens
│  ├─ config/              # eslint, tsconfig, tailwind preset, env schema
│  └─ content/             # framework/control library content-as-data (seed source)
├─ infra/                  # Terraform (vpc, rds, ecs, s3, redis, waf, secrets)
├─ docs/                   # this planning set (source of truth)
├─ .github/workflows/      # CI/CD
├─ turbo.json
├─ pnpm-workspace.yaml
└─ package.json
```

**Boundary rules:** domain logic lives in `packages/core` (pure, unit-tested), not in
controllers or React. The API contract in `packages/contracts` is the single source
of truth shared by `web` and `api` (type-safe end to end). The AI service talks only
to the API/workers, never to the browser.

## 2. Environment & config

- **Env schema validated at boot** (Zod) in `packages/config`; the app refuses to
  start if a required secret is missing (fail fast).
- **Local dev:** Docker Compose for Postgres + Redis + LocalStack (S3); `.env.local`
  (gitignored); `pnpm dev` runs web + api + ai with Turbo.
- **Secrets:** Doppler or `.env.local` in dev; AWS Secrets Manager in cloud. Never
  commit secrets; gitleaks runs pre-commit and in CI.
- **Per-env config:** `dev`, `staging`, `prod` identical topology via Terraform.

## 3. Conventions (aligns with org coding standards)

- **Immutability:** return new objects; never mutate inputs (org rule).
- **Small files:** 200–400 lines typical, 800 max; organize by feature/domain.
- **Errors:** handled at every layer; user-friendly at the UI, detailed structured
  logs server-side; never swallowed.
- **Validation at every boundary:** Zod/class-validator; never trust client, file
  contents, or external API responses.
- **No hardcoded secrets/values:** config or constants.
- **Naming:** explicit and domain-accurate (`UseCase`, `RiskAssessment`,
  `ControlMapping`, `Evidence`, `AuditLog`).
- **Commits:** conventional commits (`feat:`, `fix:`, ...). Branch off main; PRs with
  the test plan.

## 4. Definition of Ready (before a ticket starts)

- The relevant doc section is linked and read.
- Tenant-scoping is specified (is this org-scoped data? then RLS + isolation tests).
- AuthZ is specified (which roles can do this?).
- Audit events are specified (what material changes get logged?).
- AI involvement is specified (advisory only? provenance logged?).
- Acceptance criteria + test cases written.

## 5. Definition of Done (before merge)

- [ ] Unit + integration tests; 80%+ coverage on touched code
- [ ] Tenant-isolation tests for any new tenant-scoped table/endpoint
- [ ] Object-level authz enforced and tested (not just route guards)
- [ ] Input validated at the boundary; errors fail closed
- [ ] Audit-log entries for material changes
- [ ] AI features: output labeled, sources + provenance logged, no privileged writes
- [ ] No secrets in code; secret scan + SCA clean; no critical CVEs
- [ ] Migration reviewed, reversible, backup-gated
- [ ] Docs/ADR updated if a decision changed
- [ ] Passes lint, typecheck, build, E2E on the core flow

## 6. Build-ready spec — the spine (build yourself before fanning out)

> `03-ROADMAP.md §B` has the full mission DAG. The roadmap note is right: build the
> spine (M1–M3) yourself for a clean foundation, then fan M4–M11 to the fleet.

### M1 — Foundation
- Turborepo + pnpm workspace; `apps/web`, `apps/api`, `services/ai`, packages.
- Shared config: tsconfig, ESLint, Prettier, Tailwind preset, Zod env schema.
- Docker Compose (Postgres, Redis, LocalStack). `pnpm dev` runs everything.
- GitHub Actions: typecheck, lint, test, build on PR.
- Terraform skeleton: VPC, RDS Postgres, Redis, S3, ECS Fargate, Secrets Manager (can
  be stubbed/staging-only initially).
- **Exit:** `pnpm dev` boots web+api+ai locally; CI green on an empty PR; staging
  deploy works.

### M2 — Auth + multi-tenancy + RBAC
- WorkOS integration (SSO/OIDC + email); session management (httpOnly cookies).
- `Organization`, `User`, `Membership`, `Role` (Admin/Contributor/Reviewer/Viewer).
- Request middleware sets tenant context (`app.current_org`) from the session.
- RLS enabled on tenant-scoped tables; app connects as non-superuser, no BYPASSRLS.
- Deny-by-default authz guard with object-level checks.
- **Always-on tenant-isolation test suite** scaffolded here and required by CI.
- **Exit:** two orgs cannot see each other's data (proven by tests); roles gate
  actions; isolation suite blocks merge on failure.

### M3 — Data layer
- Prisma schema for core entities (see `02-ARCHITECTURE §4`): `UseCase`, `Model`,
  `Dataset`, `RiskAssessment`, `Framework`, `Control`, `ControlCrosswalk`,
  `ControlMapping`, `Evidence`, `Policy`, `Workflow/Task`, `Approval`, `Report`,
  `AuditLog`.
- `org_id` + RLS policy on every tenant-scoped table; `AuditLog` append-only +
  hash-chain columns.
- Migrations reversible + backup-gated; seed script with a demo tenant + the starter
  EU AI Act / NIST content from `packages/content`.
- Content-as-data: frameworks/controls/crosswalks/questionnaires are versioned rows,
  updatable without a deploy.
- **Exit:** schema migrates clean, seeds a working tenant, isolation tests pass on
  real tables.

After M1–M3, fan out M4 (Registry), M5 (Control library), M6 (Risk engine), then
M7–M11 per the DAG. M9 (Python AI service) gates the demo "wow," so keep it unblocked
early.

## 7. Testing strategy (concrete)

- **Unit (Vitest/Jest):** `packages/core` domain logic — risk scoring, crosswalk
  resolution, RBAC decisions. Pure functions, fast, high coverage.
- **Integration (api + db):** real Postgres (Testcontainers), RLS assertions, the
  always-on isolation suite.
- **E2E (Playwright):** the core flow — intake → classify → map controls → upload
  evidence → approve → export readiness report. Runs on PR against a preview env.
- **AI evals:** golden-set for classification accuracy + drafting quality; a CI gate
  that blocks prompt/model changes that regress.
- **Security:** gitleaks, Semgrep/CodeQL, `pnpm audit`/SCA, Trivy image scan, tfsec.

## 8. CI/CD pipeline (GitHub Actions)

```
PR:    install → typecheck → lint → unit → integration(+isolation) → build
       → secret scan → SCA → container scan → E2E (preview env)
merge: migrate (gated, reversible, backup step) → deploy staging → smoke
       → manual gate → deploy prod (canary) → post-deploy checks
```

- OIDC-based cloud auth (no long-lived CI secrets).
- Required reviews + protected `main`.
- Feature flags (PostHog) for progressive rollout.

## 9. First-week checklist (literally where to start)

1. `pnpm dlx create-turbo` baseline; set up workspace + shared config (M1).
2. Stand up Docker Compose (Postgres/Redis/LocalStack); `pnpm dev` green.
3. CI: typecheck/lint/test/build on PR.
4. WorkOS app + auth flow + sessions (M2).
5. Org/User/Membership/Role + tenant context middleware + RLS + **isolation suite**.
6. Prisma core schema + migrations + seed with starter EU AI Act content (M3).
7. First vertical slice: create a UseCase → run EU AI Act questionnaire → see tier +
   rationale (proves the spine end to end), then fan out.

## 10. Decisions still owned by you (small, but real)

- Brand name (resolve "Provenant" before public surfaces / domains / trademarks).
- Test runner: Vitest (faster, modern) vs Jest (default for NestJS) — recommend
  Vitest for packages, keep Jest for Nest if friction is high.
- Hosting specifics: ECS Fargate now vs Vercel for `web` + Fargate for `api`/`ai`
  (Vercel speeds the Next.js DX; keep data plane in your AWS/region for residency).
