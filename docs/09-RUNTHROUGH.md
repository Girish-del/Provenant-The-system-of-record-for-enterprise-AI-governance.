# The Complete Run-Through

> The founder's guide to Provenant: every flow, every screen, every moving part, and the
> reasoning behind each one. Read this until you can demo the product cold and answer
> "why does it work that way?" without looking anything up. All routes, endpoints, and
> file paths below are real and current as of the M1-M17 + B1-B10 build.

---

## 1. What Provenant is

Provenant is a multi-tenant SaaS that acts as the system of record for an organization's
AI: every AI system gets registered, classified against the EU AI Act risk tiers,
mapped to the controls its tier requires, backed with uploaded evidence, pushed through
a human review-and-approval workflow, and exported as an audit-ready readiness report.
The wedge is the EU AI Act high-risk deadline of 2 August 2026: companies must be able
to prove what AI they run, how risky it is, and that the required obligations are met,
and most of them today are doing this in spreadsheets. Provenant replaces the spreadsheet
with a governed workflow where every material change is captured in a tamper-evident
audit log, AI assistance drafts the paperwork but never signs it, and the output is a
document a regulator or auditor can actually read.

---

## 2. The golden path

This is the demo. One AI system travels from "someone in marketing built a chatbot"
to "here is the signed, evidence-backed readiness report." Seven steps. For each:
what happens, why it exists, and where it lives in the code.

### Step 1: Register the AI system

**What.** A user clicks "Register AI system" on the inventory screen, fills in name,
purpose, and description, and the system appears in the registry with lifecycle state
`PROPOSED` and risk tier `UNASSIGNED`. Bulk onboarding works through CSV import.

**Why.** You cannot govern what you cannot see. The EU AI Act's obligations attach to
specific AI systems, so the unit of governance has to be the individual use case, not
"the company's AI" in the abstract. The lifecycle state machine (deny-by-default: only
defined transitions are legal) exists because governance is about gating movement
between states. A system cannot jump from `PROPOSED` to `IN_PRODUCTION` without
passing review, and the state machine is what makes that a rule instead of a habit.
Registration is also the billing meter: plans cap how many governed systems an org can
have, and the cap is enforced right here (a 402 response when the plan is full),
because "governed AI systems" is the value axis the product prices on.

**Where.**

| Piece | Location |
|---|---|
| UI | `/inventory` (register modal), `apps/web/src/app/(console)/inventory/page.tsx` |
| API | `POST /use-cases`, `POST /use-cases/import` (CSV), `GET /use-cases`, `PATCH /use-cases/:id`, `POST /use-cases/:id/transition` |
| Controller | `apps/api/src/use-cases/use-cases.controller.ts` (+ `use-cases.service.ts`, `csv.ts`) |
| Domain logic | lifecycle state machine in `packages/core/src/lifecycle.ts` |
| Billing gate | `canRegisterSystem()` in `packages/core/src/billing.ts`, enforced in the use-cases service |

### Step 2: Assess the risk

**What.** On the system's detail page, "Assess risk" opens a four-question EU AI Act
questionnaire (prohibited practice? Annex III area? safety component? interacts with
people or generates synthetic content?). Submitting classifies the system into one of
four tiers: `PROHIBITED`, `HIGH`, `LIMITED`, or `MINIMAL`, persists the assessment
with a written rationale, and stamps the tier onto the use case.

**Why.** The EU AI Act is a tiered regulation: what you must do depends entirely on
which tier the system falls into. Prohibited practices (social scoring, manipulative
techniques) cannot be deployed at all; Annex III high-risk systems carry the heavy
Articles 9-15 obligations; limited-risk systems owe Article 50 transparency; minimal
risk owes essentially nothing. The classifier is deliberately a pure, deterministic
function: each question carries a tier implication, and the most severe fired tier
wins. Determinism matters because a risk classification is a legal position. You want
to be able to explain to an auditor exactly why a system was classified `HIGH`, and
"the model said so" is not an answer. That is also why the rationale string lists
exactly which answers fired.

**Where.**

| Piece | Location |
|---|---|
| UI | assessment modal on `/inventory/[id]`, `apps/web/src/app/(console)/inventory/[id]/assessment-modal.tsx` |
| API | `GET /questionnaires/EU_AI_ACT_RISK_V1`, `POST /use-cases/:useCaseId/assessments`, `GET /use-cases/:useCaseId/assessments` |
| Controllers | `apps/api/src/assessments/questionnaires.controller.ts`, `assessments.controller.ts` |
| Domain logic | `classifyRisk()` in `packages/core/src/risk.ts` (severity ranking, most-severe-wins) |
| Content | questionnaire + tier implications in `packages/content/src/questionnaire.ts` |

### Step 3: Map the required controls

**What.** "Suggest required controls" auto-maps the controls the system's tier
requires: for `HIGH` and `PROHIBITED` that is the EU AI Act Articles 9-15 set (risk
management, data governance, technical documentation, record-keeping, transparency,
human oversight, accuracy/robustness/cybersecurity); for `LIMITED` it is Article 50.
Each mapping starts at `NOT_STARTED` and can be moved through `IN_PROGRESS`,
`IMPLEMENTED`, or `NOT_APPLICABLE` from a dropdown on the control matrix. Controls
can also be mapped manually.

**Why.** A risk tier is a diagnosis; controls are the treatment plan. The framework
library is content-as-data (EU AI Act and NIST AI RMF frameworks, controls, and
crosswalks live in `packages/content` and are seeded into read-only database tables),
which means regulatory updates ship as content changes, not code deploys. The suggest
endpoint is idempotent and deterministic by design: which controls a high-risk system
needs is a matter of law, not model creativity, so the mapping comes from a fixed
tier-to-controls table. Crosswalks exist so that one control's evidence can satisfy
multiple frameworks later (EU AI Act Article 9 maps to NIST MANAGE, for example).

**Where.**

| Piece | Location |
|---|---|
| UI | controls table on `/inventory/[id]` |
| API | `GET/POST /use-cases/:useCaseId/controls`, `POST /use-cases/:useCaseId/controls/suggest`, `PATCH /use-cases/:useCaseId/controls/:mappingId` |
| Controller | `apps/api/src/controls/control-mappings.controller.ts` (+ service) |
| Domain logic | `requiredControlCategories()` in `packages/core/src/controls.ts` |
| Framework read API | `GET /frameworks`, `GET /frameworks/:key`, `GET /controls/:id/crosswalks` in `apps/api/src/frameworks/frameworks.controller.ts` |

### Step 4: Upload evidence

**What.** Each mapped control has an "attach" action. The file goes through a
multipart upload, gets sha256-hashed, runs through a malware scan (an EICAR-signature
stub standing in for a real scanner), lands in S3 (LocalStack in dev, bucket
`aegis-evidence`), and is recorded as an Evidence row with its hash and scan status.

**Why.** Compliance without evidence is a promise; with evidence it is a fact. The
sha256 digest exists so anyone can later verify that the file in storage is the file
that was reviewed (chain of custody). The malware scan exists because evidence upload
is the one place where arbitrary tenant files enter your infrastructure, and a
governance vendor that distributes malware to its auditors is finished. The scan is a
stub on purpose: it proves the full path (upload, scan verdict, status stored, dirty
files flagged) so swapping in ClamAV or a managed scanner later is a one-file change
rather than a redesign.

**Where.**

| Piece | Location |
|---|---|
| UI | paperclip action per control row on `/inventory/[id]` |
| API | `POST /control-mappings/:mappingId/evidence` (multipart), `GET /control-mappings/:mappingId/evidence` |
| Controller | `apps/api/src/evidence/evidence.controller.ts` (+ `evidence.service.ts`) |
| Scan + storage | `apps/api/src/evidence/scan.ts` (EICAR stub), `apps/api/src/common/s3.ts` |

### Step 5: Submit for review and approve

**What.** "Submit for review" moves the system to `IN_REVIEW`, creates a `PENDING`
approval, and opens a review workflow with SLA-tracked steps (due dates default to 5
days, configurable via `REVIEW_SLA_DAYS`). A reviewer, from the detail page or the
Approvals queue, approves or rejects. Approval transitions the lifecycle forward;
rejection sends it back. Deciding an already-decided approval returns 409.

**Why.** This is the human-accountability core of the product. Everything before this
step could in principle be automated; this step must not be. A named person, with the
`review:decide` permission, makes a recorded decision at a recorded time, and that
record is what an organization points to when a regulator asks "who approved this?"
The separation of duties is enforced by RBAC (a Contributor can build the case file
but cannot approve it; a Reviewer can approve but cannot edit). The SLA steps exist
because reviews that can sit forever become a bottleneck that teams route around,
which recreates shadow AI inside the governance tool.

**Where.**

| Piece | Location |
|---|---|
| UI | Submit/Approve/Reject buttons on `/inventory/[id]`; queue at `/approvals` |
| API | `POST /use-cases/:useCaseId/submit-for-review`, `POST /approvals/:approvalId/decide`, `GET /approvals` (queue), `GET /use-cases/:useCaseId/approvals`, `GET /use-cases/:useCaseId/workflow` |
| Controller | `apps/api/src/approvals/approvals.controller.ts` (+ `approvals.service.ts`, which creates the workflow + SLA steps and closes them on decision) |

### Step 6: Read the readiness score and gaps

**What.** The detail page shows a readiness percentage and a "Gaps to close" list;
the dashboard rolls the same computation up across the portfolio (readiness by tier
and lifecycle, audit-ready count, high-risk-not-ready count).

**Why.** The readiness rule is the most opinionated line in the codebase: a required
control only counts as ready when it is `IMPLEMENTED` **and** has at least one piece
of clean (scan-passed) evidence, or is explicitly `NOT_APPLICABLE`. Marking a control
"done" without proof does not move the number. This is deliberate honesty: the
product's promise is "audit-ready," and an auditor will not accept a checkbox, so
neither does the score. Each gap comes with a typed reason (not mapped, not
implemented, no evidence, evidence not clean) so the number is always actionable.
The portfolio rollup is computed with three queries and in-memory aggregation, no
N+1, because the dashboard is the screen executives will refresh.

**Where.**

| Piece | Location |
|---|---|
| UI | readiness card + gaps on `/inventory/[id]`; portfolio stats on `/` |
| API | `GET /use-cases/:useCaseId/readiness`, `GET /readiness` (portfolio) |
| Controller | `apps/api/src/readiness/readiness.controller.ts` (+ service) |
| Domain logic | `computeReadiness()` in `packages/core/src/readiness.ts` |

### Step 7: Export the readiness report

**What.** The "Report" button downloads the EU AI Act Readiness Report for the
system: identity, risk tier and rationale, the full control matrix with evidence and
hashes, gaps, and the approval trail, as Markdown (with a JSON twin for machines).

**Why.** The report is the artifact the whole pipeline exists to produce. It is what
the head of AI governance hands to an auditor, attaches to a board memo, or files with
a conformity assessment. The renderer is a pure function over the same data the
readiness engine reads, deterministic (stable ordering, pipe-escaped tables) so the
same state always produces byte-identical output. That makes reports diffable: two
exports a week apart show exactly what changed. Export requires the `report:export`
permission, since the report aggregates everything sensitive about a system.

**Where.**

| Piece | Location |
|---|---|
| UI | Report button on `/inventory/[id]`; per-system list at `/reports` |
| API | `GET /use-cases/:useCaseId/report` (JSON), `GET /use-cases/:useCaseId/report.md` (text/markdown) |
| Controller | `apps/api/src/reports/reports.controller.ts` (+ service) |
| Domain logic | `renderReadinessReportMarkdown()` in `packages/core/src/report.ts` |

---

## 3. The console, screen by screen

The web console is `apps/web`: Next.js 15 App Router, Tailwind v4, styled to
`DESIGN.md` (Lapis `#255C99` primary, Sand `#CCAD8F` accent, Carmine `#B3001B`
reserved for Prohibited risk and destructive actions, Fraunces for display type,
Geist for UI). All console routes live under `apps/web/src/app/(console)/` behind a
shared shell (sidebar + topbar) that loads the session from `GET /auth/me` and the
nav: Dashboard, AI Inventory, Approvals, Reports, Policies, Settings.

| Route | Screen | What is on it | Actions |
|---|---|---|---|
| `/login` | Sign in | Two-column Fraunces hero with the 2 Aug 2026 pitch; email field; Google button | Dev email login (any email opens or creates a workspace); "Continue with Google" via WorkOS SSO (activates once keys are set) |
| `/` | Dashboard | Four stat cards (governed systems, high-risk count, audit-ready %, days to 2 Aug 2026), risk distribution bar by tier, recently registered list, deadline alert | Navigate to inventory; everything else is read-only posture |
| `/inventory` | AI Inventory | Table of every system: name + purpose, lifecycle badge, risk badge, registration date; empty state nudges first registration | Register AI system (modal); click a row to open the detail page |
| `/inventory/[id]` | System detail | Header with risk + lifecycle badges; Overview card; AI draft panel (Sand-tinted); control matrix with status dropdowns and evidence counts; "Gaps to close"; readiness card; approval trail and review workflow steps | Assess / re-assess risk (questionnaire modal); Suggest required controls; change control status; attach evidence; Submit for review; Approve / Reject pending approval; download Report; generate AI draft (risk summary / FRIA / DPIA) with copy + download |
| `/approvals` | Approvals | Pending queue (system, submitted date, comment) and the last ten decided items | Approve or Reject inline; click through to the system |
| `/reports` | Reports | One row per system: risk, lifecycle, readiness %, report download | Download the Markdown readiness report per system |
| `/policies` | Policies | Organizational AI policies with status (DRAFT / PUBLISHED / ARCHIVED) | Create a policy draft (title + markdown body); publish or archive |
| `/settings` | Settings | Plan + usage card (current plan, governed-systems meter bar, the three paid tiers with prices), members list | Upgrade plan (mock checkout in dev, Stripe when keys exist; Enterprise is contact-sales); invite a member by email with a role; change roles / remove members |

Two details worth knowing for demos. First, the AI draft panel is intentionally
visually different (Sand border and wash) from everything else on the page: AI
content is advisory, labeled with provenance, and leaves the system only by copy or
download. Nothing the model writes is ever inserted into a governance record
automatically. Second, the settings upgrade flow is honest about its environment:
without Stripe keys the checkout endpoint returns a mock and the UI applies the plan
through the dev-only set-plan path, with a note saying real Stripe checkout takes over
once keys are configured.

---

## 4. The public /assess funnel

`/assess` (in `apps/web/src/app/assess/page.tsx`) is the product-led growth surface:
the EU AI Act readiness check, free, no account required. The flow is four Yes/No
question cards with a progress bar, then a result screen showing the risk tier badge,
the written rationale, the obligations grid for that tier, and next steps. Below the
result sits a Sand conversion box: enter a work email and a system name, and the
funnel converts on the spot. The convert endpoint creates a workspace, logs the user
in (session cookie), registers the assessed system with its tier already attached,
and the browser redirects straight into `/inventory/[id]` in the console.

Why it exists: the GTM plan (docs/04) is PLG on top, sales-led expansion underneath.
The assessment gives a stranger real value in ninety seconds (a defensible tier with
rationale and obligations), and the conversion is seamless because the work they just
did becomes their first governed system rather than being thrown away at a signup
wall.

The API side is `apps/api/src/public/public-assessment.controller.ts`, three
endpoints under `/public/assessment`, all unauthenticated and hard-throttled because
they face the open internet: `GET /public/assessment` (questionnaire, 30/min),
`POST /public/assessment/classify` (read-only classification, 20/min), and
`POST /public/assessment/convert` (workspace creation, 3/min, since it writes and
mints sessions). Classification reuses the exact same `classifyRisk()` and content
library as the console, so the free check and the paid product can never disagree.

---

## 5. Under the hood

### Tenant isolation: RLS as the floor, not the ceiling

Every tenant-scoped table carries an `org_id`, and Postgres Row-Level Security is
enabled **and forced** on all 14 of them (13 org-scoped tables plus the
`organizations` root). The policy lives in `packages/db/prisma/rls.sql` and is
applied by `rls:apply`. The application connects as the non-superuser role
`aegis_app` (no BYPASSRLS), so the policies actually bind. Tenant context is set per
transaction: `forOrg(orgId, fn)` in `packages/db` opens an interactive transaction and
issues `SET LOCAL app.current_org = '<uuid>'`; the policy matches
`org_id = nullif(current_setting('app.current_org', true), '')::uuid`.

The `nullif(..., '')` wrapper is a hard-won detail: pooled connections can revert a
prior `SET LOCAL` to an empty string rather than NULL, and without the wrapper that
becomes a cast error; with it, an unscoped query simply matches zero rows. That is
the fail-closed posture: if the app forgets to set tenant context, the answer is
"nothing," never "everything." The `organizations` table gets a tailored policy
(SELECT/INSERT open because login and signup must touch it before any tenant context
exists; UPDATE/DELETE restricted to the org in context) so even a compromised
app-layer query cannot rewrite another tenant's plan or Stripe ids. Defense in depth
sits above this: route guards, RBAC, and object-level checks all run too, but RLS
means a bug in any of them is contained by the database.

### The hash-chained audit log

`audit_logs` is append-only at the database (UPDATE and DELETE are revoked from
`aegis_app`) and tamper-evident at the application. Every entry's hash covers the
previous entry's hash plus a canonical serialization of the entry itself
(`stableStringify` sorts keys recursively so jsonb round-trips do not break hashes).
The pure functions live in `packages/core/src/audit-hash.ts`; the API's `audit()`
helper (`apps/api/src/common/audit.ts`) takes a per-org advisory lock so concurrent
writes cannot fork the chain, and writes `prev_hash` + `entry_hash` with each row.
`GET /audit` lists entries; `GET /audit/chain/verify` (admin) recomputes the whole
chain and reports `{valid: false, brokenAt: N}` on the first broken link.

Why a chain instead of just a log table: a governance product's audit trail is the
thing auditors trust everything else on. "Append-only" enforced by grants stops the
app from rewriting history; the hash chain makes even a DBA-level edit detectable,
because altering any historical row invalidates every hash after it. In a demo,
tampering with one row and watching verify pinpoint it is the single most convincing
thirty seconds in the product.

### RBAC: four roles, deny by default

Roles and grants are a pure matrix in `packages/core/src/rbac.ts`, mirrored by the
DB enum and enforced in the API by `RolesGuard` + `@RequireAction(...)` on each
endpoint. Anything not granted is denied.

| Action | ADMIN | CONTRIBUTOR | REVIEWER | VIEWER |
|---|---|---|---|---|
| org:manage | yes | – | – | – |
| member:manage | yes | – | – | – |
| usecase:create | yes | yes | – | – |
| usecase:edit | yes | yes | – | – |
| usecase:view | yes | yes | yes | yes |
| risk:assess | yes | yes | – | – |
| control:map | yes | yes | – | – |
| evidence:upload | yes | yes | – | – |
| review:decide | yes | – | yes | – |
| report:export | yes | yes | yes | – |

The shape encodes separation of duties: Contributors build the case file and cannot
approve it; Reviewers approve and cannot edit it; Viewers exist because governance has
many read-only stakeholders (board members, auditors) who should never hold a write
permission they do not need.

### Billing: metered on governed systems, capped with a 402

Plans are data in `packages/core/src/billing.ts`: Free (3 systems, $0), Team (25,
$499/mo), Business (100, $1499/mo), Enterprise (unlimited, custom). The meter counts
governed AI systems because that is the axis on which the customer gets value (and on
which their AI estate grows); per-seat pricing was rejected because governance has
many occasional read-only users. `meter()` and `canRegisterSystem()` are pure
functions; the use-case registration path enforces the cap and returns HTTP 402 when
the plan is full, which the UI surfaces next to the upgrade path. The API surface is
`GET /billing` (plan + meter), `POST /billing/checkout` (real Stripe Checkout when
`STRIPE_SECRET_KEY` is set, an explicit mock otherwise), `POST /billing/dev/set-plan`
(dev-only, 403 in production, simulating the post-checkout webhook), and
`POST /billing/webhook`, the Stripe receiver in
`apps/api/src/billing/stripe-webhook.controller.ts`. The webhook is deliberately
unauthenticated (Stripe cannot log in); authenticity comes entirely from the
signature check against `STRIPE_WEBHOOK_SECRET`, and the handler writes plan changes
through `forOrg` using the org id carried in the verified event, so even billing
writes obey tenant scoping. Keys in `.env.example` are placeholders; without them the
whole upgrade flow still demos end to end in mock mode.

### The AI service: providers, provenance, cost controls

`services/ai` is a separate Python FastAPI service (it is internal-only; the browser
never reaches it). Two endpoints: `POST /draft` (risk summary, FRIA, or DPIA from
use-case data) and `POST /suggest-controls`. Two providers behind one interface in
`app/providers.py`: `MockProvider`, deterministic and keyless (dev and CI), and
`ClaudeProvider`, active when `ANTHROPIC_API_KEY` is set, calling the Anthropic
Messages API with model routing per task: drafting uses claude-sonnet-4-0, suggestion
uses claude-haiku-4-5, both env-overridable. Control suggestion is deterministic in
**both** providers (a fixed tier-to-articles table): which controls the law requires
is not a creative task, so it is kept auditable; free-form drafting is where the model
earns its keep.

Every response carries provenance (`app/provenance.py`): provider, model, generation
timestamp, `advisory: true`, the label "AI-generated draft — advisory only, must be
reviewed by a qualified person," and the sources consulted. Provenance is also logged
server-side, so there is a record of every AI generation independent of what the
client did with it.

Cost controls (`app/costcontrol.py`) wrap every provider call in the order
breaker, cache, budget, provider:

- **Circuit breaker:** after N upstream failures, fail fast with 503 + Retry-After
  instead of queueing doomed, billable retries; a half-open probe restores service.
- **Response cache:** TTL + LRU keyed by (org, endpoint, canonical request); a cache
  hit costs zero tokens and is visible as `X-Cache: hit`.
- **Token budget:** per-org, per-UTC-day; exhaustion returns 429 + Retry-After.
  Budgets default to in-memory and can move to Redis (`AI_BUDGET_REDIS_URL`) for
  multi-replica deployments.

The core API proxies to this service through `apps/api/src/ai/ai.service.ts` and
`ai.controller.ts` (`POST /use-cases/:id/ai/draft`, `POST /use-cases/:id/ai/suggest-controls`,
both RBAC-gated and throttled at 10/min). The proxy signs requests with
`X-Internal-Token`, forwards `X-Org-Id` for per-tenant budgeting, and audit-logs
every AI interaction. The AI service itself fails closed in production: with no
internal token configured, it refuses all calls (503) rather than running open.

### Platform ops: everything keyless is a no-op

`apps/api/src/ops/ops.service.ts` is a facade over Sentry (error capture), PostHog
(product events such as `system_registered` and `approval_decided`), and Resend
(transactional email). Each integration activates only when its env key is set; the
server boots cleanly with `sentry=noop posthog=noop resend=noop`, so dev, CI, and
demos need zero external accounts. A global exception filter
(`ops/all-exceptions.filter.ts`) lets expected 4xx responses pass through and turns
anything unexpected into a Sentry capture plus a sanitized 500 carrying the request
id. Every request gets an `X-Request-Id` (minted or honored, always echoed), which is
the correlation thread across logs, Sentry, and support tickets. OpenTelemetry
(`apps/api/src/otel.ts`) follows the same pattern, gated behind
`OTEL_EXPORTER_OTLP_ENDPOINT`: traces only ship when there is a collector to ship to.

The reasoning: a product this early needs its ops plumbing in place (retrofitting
error tracking after launch is miserable) without making every contributor provision
five SaaS accounts to run `pnpm dev`. Keyless no-op is the compromise that costs
nothing now and lights up by setting env vars later.

### SSO

`apps/api/src/auth/sso.controller.ts` implements `GET /auth/sso/login` (redirect to
the provider via WorkOS AuthKit, Google OAuth by default) and `GET /auth/sso/callback`
(exchange the code, mint the same httpOnly session cookie as dev login, redirect to
the console). The same WorkOS code path covers Microsoft, SAML, and OIDC enterprise
SSO later, which is why WorkOS was chosen over hand-rolling Google OAuth. Without
`WORKOS_API_KEY` + `WORKOS_CLIENT_ID`, both endpoints return 503 with a hint, and the
dev email login (`POST /auth/dev/login`, throttled 10/min) remains the dev path.
Sessions are stateless HS256 JWTs (jose) with pinned issuer and audience and absolute
expiry, set as httpOnly cookies; `GET /auth/me` returns the session,
`POST /auth/logout` clears it.

---

## 6. The test and verification story

The suites are layered so that each class of failure has a test that catches it
cheaply, and the expensive suites only cover what the cheap ones cannot.

| Suite | Count | What it proves | Where |
|---|---|---|---|
| Core unit tests (vitest) | 45 | The pure domain logic: RBAC matrix, session JWTs, lifecycle transitions, risk classification, required controls, audit hashing, readiness math, report rendering, billing meter | `packages/core/src/*.test.ts` |
| DB tenant-isolation suite | 9 | RLS actually binds when connected as `aegis_app`: scoped reads, fail-closed on missing context, WITH CHECK on writes, audit append-only, org-table UPDATE/DELETE scoping | `packages/db/src/tenant-isolation.test.ts` (CI-blocking, runs against real Postgres) |
| AI service pytest | 18 | Providers, provenance, the internal-token gate, and the full cost-control behavior (budget 429s, cache hits, breaker trips) | `services/ai/tests/` |
| API integration tests | 7 | The NestJS HTTP layer wired together (supertest through real DI; built with SWC because esbuild does not emit the decorator metadata Nest needs) | `apps/api/test/api.spec.ts` |
| Playwright E2E | golden path + auth + isolation specs | The whole story against a real stack (Postgres with RLS, LocalStack S3): register, classify, suggest, implement + evidence, readiness, submit, approve, export, audit-verify; plus 401 without a cookie and a cross-tenant isolation probe | `e2e/tests/golden-path.spec.ts` |

CI (GitHub Actions, `.github/workflows/ci.yml`) runs typecheck, lint, unit tests,
build, a gitleaks secret scan, a dependency audit, the DB isolation suite against a
provisioned Postgres, the AI pytest job, and the E2E job with Postgres + LocalStack
services. The two rules that matter most: the tenant-isolation suite is CI-blocking
(a tenancy regression cannot merge), and the E2E suite runs in API mode against the
real database with RLS applied, so "it passed E2E" means the security posture was on
while it passed.

What is intentionally not automated: visual checks of the console were verified by
screenshot at build time, and live smoke tests (documented per component in
`BUILD-LOG.md`) backstop the pieces that depend on external moving parts.

---

## 7. Glossary: the 15 terms to know cold

| Term | Meaning in Provenant |
|---|---|
| **Governed AI system / use case** | The unit of governance and of billing: one registered AI system with a lifecycle, a risk tier, controls, evidence, and approvals. The `UseCase` model. |
| **Risk tier** | The EU AI Act classification of a system: `PROHIBITED`, `HIGH`, `LIMITED`, or `MINIMAL` (plus `UNASSIGNED` before assessment). Determines which controls are required. |
| **Annex III** | The EU AI Act's list of high-risk application areas (employment, credit, law enforcement, and so on). Answering yes to the Annex III question classifies a system `HIGH`. |
| **Lifecycle** | The state machine a system moves through: `PROPOSED` → `IN_REVIEW` → `APPROVED` → `IN_PRODUCTION` → `RETIRED`, with only defined transitions allowed. |
| **Control** | A required obligation from a framework (for example EU AI Act Article 14, Human oversight). Lives in the read-only content library. |
| **Control mapping** | The link between one system and one control, with a status: `NOT_STARTED`, `IN_PROGRESS`, `IMPLEMENTED`, `NOT_APPLICABLE`. |
| **Crosswalk** | A maintained equivalence between controls in different frameworks (EU AI Act Article 9 ↔ NIST MANAGE), so one piece of evidence can satisfy several regimes. |
| **Evidence** | An uploaded file attached to a control mapping, sha256-hashed and malware-scanned. Only clean evidence counts toward readiness. |
| **Readiness** | The percentage of a system's required controls that are `IMPLEMENTED` with clean evidence (or `NOT_APPLICABLE`). 100% = audit-ready. |
| **Gap** | A required control that is not yet ready, with a typed reason: not mapped, not implemented, missing evidence, or dirty evidence. |
| **Approval** | A recorded human decision (`PENDING` → `APPROVED`/`REJECTED`) on a system submitted for review, tied to the reviewer and timestamp, backed by SLA-tracked workflow steps. |
| **Audit chain** | The append-only, hash-chained log of every material change. Each entry hashes the previous entry's hash plus its own canonical content; verification finds the first broken link. |
| **RLS / forOrg** | Postgres Row-Level Security forced on all 14 tenant tables; `forOrg(orgId, fn)` sets the tenant context per transaction. No context means no rows (fail closed). |
| **Provenance** | The metadata attached to every AI output: provider, model, timestamp, advisory label, sources. The mechanism behind "AI drafts, humans decide." |
| **Meter / cap** | The count of governed systems against the plan limit (Free 3, Team 25, Business 100, Enterprise unlimited). Registration past the cap returns HTTP 402 and an upgrade prompt. |

---

*Companion docs: `00-OVERVIEW.md` (the why), `01-PRD.md` (the what), `02-ARCHITECTURE.md`
(the how), `05-SECURITY-AND-THREAT-MODEL.md` (the threat model this build implements),
`BUILD-LOG.md` (what shipped, when, with which commit).*
