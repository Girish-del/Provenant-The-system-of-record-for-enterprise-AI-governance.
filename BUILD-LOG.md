# BUILD-LOG — AI Governance Platform (Aegis)

> **This file is the resume point.** If a session expires, read this top-to-bottom,
> then `docs/` (plan) and `DESIGN.md` (visual system), and continue from "Next up".
> Build cadence: **sequential, one component at a time**, each = its own git commit.
> Update this file at the end of every component (status + log entry).

**Last updated:** 2026-06-10 (M15 platform ops + M16 AI cost controls complete; next: M17 PLG assessment)
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
- ☑ 2.3 Auth core in @aegis/core: RBAC + session JWT + DevAuthProvider, 10 tests green — commit 466a41c
- ☑ 2.4 NestJS API (apps/api): /health, dev-login, /me, AuthGuard, tenant-context (forOrg), RolesGuard
  — verified LIVE end-to-end vs Postgres+RLS — commits 50eca46 (build prereq), 277c5c4 (api)
- ☑ 2.5 Tenant-isolation suite: 3/3 LIVE green vs Postgres as `aegis_app` (scoped reads, fail-closed,
  WITH CHECK); CI-blocking (Postgres service + db push + rls:apply) — commits b48beb8, d76dfb9
- ☑ **M2 complete.**

### M3 — Data layer
- ☑ 3.1 Core Prisma schema (18 models) + RLS on all 13 org-scoped tables (loop) — commit 066c7f5
- ☑ 3.2 Seed (idempotent: demo tenant `demo-acme` + 3 use cases; tsx) — commit 86d4b88
  (NOTE: dev uses `prisma db push`; reversible migrations to be generated before first deploy — backlog B3)
- ☑ 3.3 Content-as-data (`@aegis/content`: EU AI Act + NIST frameworks/controls/crosswalks +
  EU AI Act questionnaire; read-only to app role) — commit 86d4b88
- ☑ **M3 complete.** Live-verified: counts 2 fw / 12 controls / 4 crosswalks / 4 questions / 3 use cases;
  content read-only enforced; isolation suite 4/4.

### M4–M9 — Core features (fan-out candidates)
- ☑ M4 AI Use-Case Registry (CRUD, lifecycle state machine, CSV import, RBAC, audit) — commit c8b76c2
- ☑ M5 Framework/Control library + crosswalk resolution (read API over content) — commit 65b3812
- ☑ M6 Risk classification engine (`classifyRisk`) + assessment submit → tier + rationale — commit f74dd76
- ☑ M7 Control mapping (suggest-by-tier) + evidence upload (S3/LocalStack + sha256 + EICAR scan) — commit 97dac13
- ☑ M8 Intake → review → approve workflow + **hash-chained tamper-evident audit** — commits d0960ce, 1b6d4fc
- ☑ M9 Python AI service (FastAPI): draft + suggest-controls + provenance; mock + Claude providers — commit 2589141

### M10–M13 — Readiness, reports, tests, security
- ☑ M10 Readiness dashboard + gap report (per-use-case + portfolio rollup) — commit 197faf2
- ☑ M11 Report export — Markdown "EU AI Act Readiness Report" + JSON (`GET /report.md`, `/report`) — commit 84c04be
- ☑ M12 E2E (Playwright API mode): register → classify → map → evidence → approve → export, in CI — commit 3fc2eda
- ☑ M13 Security pass: helmet headers, rate limiting, expanded isolation (audit append-only),
  AI fail-closed token, CI dependency audit — commits 4aeb7f8, c59308f

### M14–M17 — Production / commercial scope
- ☑ M14 Billing: plan tiers + usage metering (governed AI systems) + 402 cap enforcement; Stripe-ready
  (mock provider without keys) — commit 56b841a
- ☑ M15 Platform ops: Sentry + PostHog + Resend (all no-op keyless) + request-id propagation +
  global exception filter — commit bc2cf56. (Full OTel SDK deferred → backlog B9.)
- ☑ M16 AI cost controls: per-org token budgets (429), response cache (X-Cache), circuit breaker
  (fast 503), per-task model routing — commit 86a0732
- ☐ M17 PLG assessment surface (low-friction funnel)

### Backlog — low priority (after main functionality)
- ☐ B1 **Google OAuth login + register** (user-requested, LOW priority). Note: WorkOS
  AuthKit provides Google social login natively, so once 2.3's WorkOS adapter is wired
  this is mostly configuration. Do after core features work.
- ☐ B2 Membership-based RLS policy on `organizations` (currently app-layer guarded only).
- ☐ B3 Convert `rls.sql` into a versioned Prisma migration (currently applied via script).
- ☐ B4 Automated API integration tests (`apps/api`). Needs vitest + `unplugin-swc` (esbuild/tsx do not
  emit decorator metadata, which NestJS DI requires) + `@nestjs/testing` + `supertest`. Until then the
  API is covered by live smoke tests + the pure-logic unit tests in `@aegis/core`. Full E2E is M12.
- ☐ B5 Wire the core API → AI service: a NestJS endpoint (e.g. `POST /use-cases/:id/ai/draft`) that
  calls the Python service at `AI_SERVICE_URL` (with `X-Internal-Token`) and returns the draft +
  provenance to the UI. The AI service (M9) currently runs standalone; nothing in `apps/api` calls it yet.
- ☐ B6 Workflow/Task tables exist but M8 uses `Approval` directly. Richer routing (multi-step, RACI,
  SLAs, reminders) is reserved for a later workflow-engine pass (Temporal per the roadmap).
- ☐ B7 Remaining console screens (`apps/web`): risk-assessment questionnaire UI, controls + evidence
  management, reports list, policies, settings + **billing/plan page**, org/member admin. Login + dashboard
  + inventory + use-case detail shipped; these are the next UI slices.
- ☐ B8 Real Stripe integration: Checkout Session creation + signature-verified webhook
  (`checkout.session.completed` / `customer.subscription.updated` → sync `Organization.plan`). Needs Stripe
  test keys + price IDs. Today the plan-change path is the dev-only `POST /billing/dev/set-plan`.
- ☐ B9 Full OpenTelemetry SDK (api + ai traces/metrics to a collector). M15 shipped the practical seed
  (X-Request-Id minted/honored/echoed + Sentry tracesSampleRate); the OTel dep tree is heavy, add when
  there's a collector to ship to.
- ☐ B10 AI budget persistence: M16 budgets/breaker/cache are in-memory (reset on restart, per-process).
  Move counters to Redis when the service scales past one replica.

## Decisions log (append-only)
| Date | Decision | Why |
|------|----------|-----|
| 2026-06-08 | Sequential direct build, not DevFleet | User wants one-component-at-a-time; DevFleet is parallel + not connected |
| 2026-06-08 | Carmine reserved for Prohibited/critical only | Resolve brand-red vs risk-red; keep risk semantics clean (see DESIGN.md) |

## Detailed log (newest first)
<!-- Append one entry per completed component: what shipped, key files, decisions, gotchas -->
- 2026-06-10 — **M15 platform ops** (bc2cf56) + **M16 AI cost controls** (86a0732). M15: `OpsService`
  facade (Sentry captureError / PostHog track / Resend sendEmail), each active only when its env key is
  set — boots `sentry=noop posthog=noop resend=noop` keyless; global `AllExceptionsFilter` (4xx pass
  through, unexpected → Sentry + sanitized 500 w/ request id); `X-Request-Id` middleware (mint/honor/echo);
  product events `system_registered`, `approval_decided`. Verified keyless + E2E 3/3. Gotcha: E2E reuses a
  server already on :3001 — booting it without S3 env made evidence upload fail; kill stray servers first.
  M16 (`services/ai`): `costcontrol.py` — TokenBudget (per-org/UTC-day, 429+Retry-After; 0=unlimited),
  ResponseCache (TTL+LRU, org|endpoint|canonical-request key, X-Cache header), CircuitBreaker (N failures
  → fast 503, half-open probe); guarded flow breaker→cache→budget→provider on both endpoints; model
  routing draft=sonnet / suggest=haiku (env-overridable). 17 pytest; live smoke: miss→hit, no second
  provenance line on the hit (provider truly skipped).
- 2026-06-10 — **M14 billing** (56b841a). `@aegis/core`: PLANS (Free 3 / Team 25 / Business 100 /
  Enterprise unlimited), `meter()`, `canRegisterSystem()` — 6 unit tests. Schema: `Organization.plan`
  (PlanTier) + stripe customer/subscription ids + `subscriptionStatus`. `apps/api` billing: GET /billing
  (plan + usage meter), POST /billing/checkout (mock without keys; real Stripe behind STRIPE_SECRET_KEY),
  POST /billing/dev/set-plan (dev-only, simulates the post-checkout webhook; 403 in production). Registering
  a use case past the cap → 402. Live: FREE cap 3 → 4th=402; upgrade TEAM → 4th=201; meter + mock checkout.
  Gotcha (recurring): a still-running dev API holds the Prisma engine DLL → `prisma generate` EPERM on
  Windows; find the real PID (`Get-CimInstance Win32_Process ... main.js`) and kill it, netstat PID alone lied.
- 2026-06-10 — **Web console** (d3fb6f9). First real frontend (`apps/web` was a placeholder): Next.js 15
  App Router + Tailwind v4 styled to `DESIGN.md` (Lapis/Sand, Fraunces + Geist), cookie auth to the API.
  Screens: `/login` (two-column Fraunces hero), `/` dashboard (readiness stats + risk distribution +
  recent systems + deadline alert), `/inventory` (table + register modal), `/inventory/[id]` (overview,
  control matrix, gaps, audit-readiness, approval trail, report export). Verified: `next build` 7/7;
  seeded 7 systems via API; screenshotted all 4 screens (look polished, not AI-slop). Decisions: type-check
  via `next build` (no bare `tsc` — avoids the CI `next-env.d.ts` ordering issue); the web talks to the API
  directly from the browser with `credentials:'include'` (same-site cookie across ports works in dev).
- 2026-06-10 — **M13 security hardening** (4aeb7f8, c59308f). API: `helmet` (CSP off for a JSON/markdown
  API; nosniff/frame-deny/HSTS/COOP/CORP/no-referrer) + `@nestjs/throttler` (200/min/IP global, 10/min on
  dev-login). DB isolation suite +3: `audit_logs` is tenant-scoped and the app role cannot UPDATE/DELETE
  (append-only) → 7 tests. AI service: `require_internal` fails closed (503) in production without a token.
  CI: advisory `pnpm audit`. Verified live: headers present; 14 logins → 10×201 + 4×429; db 7/7; ai 9/9;
  E2E 3/3. Gotcha: the in-memory throttle persists 60s — a login burst can 429 a same-IP E2E within the
  window; restart the server to reset, or keep the login limit ≥ a few E2E runs (10/min has headroom).
- 2026-06-10 — **M11 report export** (84c04be) + **M12 E2E** (3fc2eda). M11: pure
  `renderReadinessReportMarkdown` in `@aegis/core` (4 tests, deterministic, pipe-escaped) — full EU AI
  Act Readiness Report; `GET /use-cases/:id/report` (JSON) + `/report.md` (text/markdown), RBAC
  report:export. M12: `e2e/` Playwright workspace in **API mode** (no UI yet, so `request` fixture, no
  browser binaries). golden-path spec drives register→classify→suggest→implement+evidence→readiness→
  submit→approve→export→audit-verify, plus 401 + cross-tenant-isolation. Playwright `webServer` boots
  the API (reuseExistingServer off in CI). CI gains a LocalStack service, the E2E step, and a Python
  `ai-service` pytest job. Verified live: 3/3 E2E green vs real Postgres(RLS)+LocalStack(S3).
- 2026-06-10 — **M10 readiness + gap report** (197faf2). Pure `computeReadiness` in `@aegis/core`
  (6 tests): a required control counts only when IMPLEMENTED **with clean evidence** (or NOT_APPLICABLE);
  returns readiness %, status breakdown, and typed gaps with reasons. `ReadinessController`:
  GET /use-cases/:id/readiness (per use case) + GET /readiness (portfolio: by tier/lifecycle, audit-ready
  count, avg %, high-risk-not-ready). Required controls = EU AI Act controls for the use case's risk tier
  (`requiredControlCategories`). Portfolio uses 3 queries + in-memory rollup (no N+1). Live: 0% → 14% as a
  control goes mapped → implemented → +clean evidence. Also re-verified M8/M9 live this session
  (tamper → {valid:false,brokenAt:0}; M9 8 pytest + live) and confirmed RLS forced on all 13 org-scoped tables.
- 2026-06-10 — **M8 workflow + hash-chain** (d0960ce, 1b6d4fc) + **M9 AI service** (2589141). M8:
  pure audit-hash in `@aegis/core` (stableStringify/canonicalize/computeEntryHash/verifyAuditChain,
  5 tests); `AuditLog.seq` (bigserial) for chain order; `audit()` advisory-locks per org + sha256-chains
  (prev_hash/entry_hash); GET /audit + /audit/chain/verify (admin). Approvals: submit-for-review →
  IN_REVIEW + PENDING; decide (review:decide) → APPROVED/REJECTED with lifecycle transition; queue;
  already-decided → 409. Live: tamper a row → verify {valid:false,brokenAt:1}; full approve/reject;
  chain valid after the workflow. M9: `services/ai` (FastAPI, uv); /draft + /suggest-controls with
  provenance (advisory/labeled/sourced/logged); MockProvider (no key) + ClaudeProvider
  (claude-sonnet-4-0, on ANTHROPIC_API_KEY); INTERNAL_API_TOKEN gate; 8 pytest + live uvicorn.
  Gotchas: pg_advisory_xact_lock returns void → wrap in a subquery for Prisma $queryRaw; adding a
  required Question.key to a non-empty table needs the rows cleared first.
- 2026-06-09 — **M6 risk engine** (f74dd76) + **M7 control mapping/evidence** (97dac13). M6: pure
  `classifyRisk` in `@aegis/core` (6 tests, most-severe tier wins) + `Question.key` schema + assessment
  submit (classify→persist→update `UseCase.riskTier`→audit) + questionnaire fetch. Live: annex_iii→HIGH,
  prohibited→PROHIBITED (precedence), none→MINIMAL. M7: `requiredControlCategories(tier)` (3 tests);
  ControlMappings (map/suggest/list/update — suggest auto-maps the EU AI Act high-risk controls,
  idempotent); Evidence upload (multipart → sha256 → EICAR scan → S3/LocalStack → Evidence row + audit).
  Live: suggest mapped 7 controls, evidence CLEAN + INFECTED both stored in S3. Gotchas: Windows Defender
  quarantines a literal EICAR file on disk ("permission denied") — pipe the bytes via `curl … -F file=@-`
  to test INFECTED; bash `!` history expansion mangles the EICAR string — use `set +H`.
- 2026-06-09 — **M4 Use-Case Registry** (c8b76c2) + **M5 Framework library** (65b3812). M4: `@aegis/core`
  lifecycle state machine (deny-by-default, 5 tests); `@aegis/contracts` NEW (Zod schemas/types);
  `apps/api` UseCasesController (CRUD/transition/CSV import), `forOrg`-scoped, RBAC-gated, audit-logged
  in-tx; ZodValidationPipe; quote-aware CSV parser. Live: CRUD, valid/invalid transitions (400), CSV
  quoted-comma, audit_logs 4 actions. M5: FrameworksController (list/detail/crosswalks) over global
  content; crosswalk resolution. Live: 2 fw (8/4 controls), Art9→NIST MANAGE, 404. `@aegis/db` now
  re-exports all 18 model types; added `zod` as a direct api dep (pnpm strict resolution). Note: audit
  hash-chain columns (prev_hash/entry_hash) exist but are populated in M8, not yet.
- 2026-06-09 — **M3 complete: data model + content + seed** (commits 066c7f5, 86d4b88). 18 Prisma
  models; RLS applied via a loop to all 13 org-scoped tables (verified 13 `rowsecurity=true`).
  `@aegis/content`: EU AI Act (8 controls) + NIST AI RMF (4) + 4 crosswalks + EU AI Act risk
  questionnaire (4 questions w/ tier-implication hints). Idempotent seed (tsx) loads content + demo
  tenant `demo-acme` + 3 use cases. Content library read-only to `aegis_app` (REVOKE; verified write
  denied / read allowed). Gotcha: `prisma generate` hit Windows EPERM (engine DLL locked by the
  running dev API server) — killed the PID, generate fine; no impact on CI (fresh Linux).
- 2026-06-09 — **2.4 NestJS API** (commit 277c5c4) + **2.5 live RLS** (commit d76dfb9). `apps/api`
  (NestJS, ESM, tsc): `/health`, `POST /auth/dev/login` (DevAuthProvider → upsert user + per-user dev
  org + ADMIN membership via `forOrg` → `createSession` → httpOnly cookie), `/auth/me`, AuthGuard
  (verifySession), RolesGuard + `@RequireAction` (core RBAC), `/memberships` (AuthGuard+RolesGuard+forOrg).
  Verified LIVE vs Postgres+RLS: login→me→memberships correct; no-cookie→401. 2.5 isolation suite 3/3
  green as `aegis_app`. Gotcha (d76dfb9): pooled connection reverts `SET LOCAL` to `''` (not NULL);
  wrapped policy in `nullif(...,'')` so empty→NULL→fail-closed instead of 22P02.
- 2026-06-08 — **2.4 prereq: internal package builds** (commit 50eca46). Added tsup builds to
  @aegis/core, @aegis/db, @aegis/config (ESM + .d.ts → dist, exports point to dist). Unblocks any
  app importing them at runtime (NestJS needs compiled JS + emitDecoratorMetadata). Verified:
  turbo build 3 ok, core 10 tests still green, typecheck 4 ok. dist is gitignored. Decision: keep
  libs ESM + jose (so the NestJS app will be ESM, compiled with tsc which emits decorator metadata).
- 2026-06-08 — **2.3 Auth core** (commit 466a41c). `@aegis/core`: deny-by-default RBAC
  (Role×Action matrix, `can`/`assertCan`/`ForbiddenError`), stateless HS256 session JWT via
  jose (`createSession`/`verifySession`, absolute expiry, audience/issuer pinned),
  `AuthProvider` interface + `DevAuthProvider` (email, no external account). 10 vitest tests
  green (rbac matrix; session round-trip/wrong-secret/tamper/expiry/secret-length). Decision:
  security-critical auth logic lives as pure tested functions in core; the NestJS HTTP layer
  (2.4) consumes it. WorkOS + Google (backlog B1) implement `AuthProvider` later.
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
**M17 — PLG assessment surface.** The free "EU AI Act Readiness Assessment" funnel (docs/04 GTM):
a public, low-friction flow — answer the risk questionnaire → instant tier + obligations + gap
preview → email capture → convert into a full workspace. Build as public routes in `apps/web`
(`/assess`) + an unauthenticated, rate-limited API path that reuses `classifyRisk` and the content
library (no DB writes until conversion; then create org + use case + assessment via existing flows).
Verify: assessment renders tier + rationale for each tier path; conversion creates the workspace;
throttled hard (it is a public endpoint).

After M17: backlog — B5 (api→ai wiring + console AI-draft UI), B7 (remaining console screens incl.
billing page), B8 (real Stripe), B1 (Google OAuth via WorkOS), B2/B3 (RLS hardening), B9 (OTel),
B10 (Redis-backed AI budgets).

**Stack now running:** Postgres + LocalStack (S3) via `docker compose`. Evidence upload needs the
S3 env vars at boot (S3_ENDPOINT/keys/bucket) — see the boot line below.

### How to run the stack locally (Postgres is up)
```
docker compose up -d --wait postgres
docker compose up -d localstack   # S3 for evidence (M7+)
# schema + RLS (owner role)
DATABASE_URL=postgresql://aegis:aegis@localhost:5432/aegis DIRECT_URL=postgresql://aegis:aegis@localhost:5432/aegis pnpm --filter @aegis/db exec prisma db push --skip-generate --accept-data-loss
DIRECT_URL=postgresql://aegis:aegis@localhost:5432/aegis pnpm --filter @aegis/db rls:apply
# seed content + demo tenant (owner role)
DATABASE_URL=postgresql://aegis:aegis@localhost:5432/aegis DIRECT_URL=postgresql://aegis:aegis@localhost:5432/aegis pnpm --filter @aegis/db db:seed
# isolation suite (app role)
DATABASE_URL=postgresql://aegis_app:aegis_app@localhost:5432/aegis pnpm --filter @aegis/db test
# API (app role) — build first (pnpm --filter @aegis/api build), then:
# DATABASE_URL=postgresql://aegis_app:aegis_app@localhost:5432/aegis DIRECT_URL=postgresql://aegis:aegis@localhost:5432/aegis \
# REDIS_URL=redis://localhost:6379 SESSION_SECRET=dev-only-insecure-change-me-0123456789abcd \
# S3_ENDPOINT=http://localhost:4566 S3_ACCESS_KEY_ID=test S3_SECRET_ACCESS_KEY=test S3_REGION=eu-central-1 S3_BUCKET=aegis-evidence \
# node apps/api/dist/main.js
```
Reminder: kill any lingering `node apps/api/dist/main.js` before `prisma generate` on Windows (DLL lock).

**Local runbook to verify RLS (when Docker is up):**
```
docker compose up -d postgres
export DIRECT_URL=postgresql://aegis:aegis@localhost:5432/aegis
DATABASE_URL=postgresql://aegis:aegis@localhost:5432/aegis pnpm --filter @aegis/db exec prisma db push --skip-generate
DIRECT_URL=$DIRECT_URL pnpm --filter @aegis/db rls:apply
DATABASE_URL=postgresql://aegis_app:aegis_app@localhost:5432/aegis pnpm --filter @aegis/db test
```
Design sign-off: APPROVED 2026-06-08 — UI work (M4+) is unblocked.
