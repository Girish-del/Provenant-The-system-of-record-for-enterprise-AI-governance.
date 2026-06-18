# 11 - Setup: from fresh machine to verified stack

Audience: a developer with a clean machine who needs the full Provenant stack running and
verified locally. Every command is copy-pasteable on Windows (PowerShell unless marked
Git Bash). macOS/Linux differences are called out inline. Nothing here requires a paid
account: with zero API keys the platform boots with mock providers and no-op
integrations, and every test suite passes.

The stack you are about to run:

| Piece | Tech | Port |
|---|---|---|
| `apps/web` | Next.js 15 governance console + public `/assess` funnel | 3000 |
| `apps/api` | NestJS core API (auth, registry, risk, controls, evidence, approvals, billing, reports) | 3001 |
| `services/ai` | Python FastAPI AI service (draft, suggest-controls; mock or Claude provider) | 8000 |
| Postgres 16 | data, with forced Row-Level Security on 14 tables | 5432 |
| Redis 7 | reserved for queues; optional AI budget backend | 6379 |
| LocalStack | fake S3 for evidence files | 4566 |

---

## 1. Prerequisites

Install these once. Versions matter; the repo pins them.

| Tool | Version | Why |
|---|---|---|
| Node.js | 22.x (`.node-version` says `22`, `engines` says `>=22`) | web + api + packages |
| pnpm | 9.15.4 (pinned in `package.json` `packageManager`) | workspace package manager |
| Python | 3.13 (pyproject floor is `>=3.11`) | AI service |
| uv | latest | Python env + dependency manager |
| Docker Desktop | current, with Compose v2 | Postgres, Redis, LocalStack |
| git | current | clone, hooks, CI parity |

Windows (PowerShell):

```powershell
winget install OpenJS.NodeJS.LTS          # or use nvm-windows / fnm for version pinning
winget install Git.Git
winget install Docker.DockerDesktop
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
corepack enable pnpm                       # activates the pinned pnpm 9.15.4 from package.json
```

macOS/Linux:

```bash
# Node via your version manager of choice (nvm, fnm, mise), then:
corepack enable pnpm
curl -LsSf https://astral.sh/uv/install.sh | sh
# Docker Desktop (macOS) or docker engine + compose plugin (Linux), plus git.
```

You do not need to install Python manually if you have uv: `uv sync` downloads a
compatible interpreter on demand (`uv python install 3.13` to do it explicitly).

Verify:

```powershell
node --version        # v22.x
pnpm --version        # 9.15.4
uv --version
docker --version
docker compose version
```

Start Docker Desktop before continuing. On Windows, wait for the whale icon to settle;
`docker info` should succeed.

---

## 2. Clone and install

```powershell
git clone <repo-url> aegis
cd aegis
pnpm install                               # installs the whole TS workspace (apps, packages, e2e)
uv sync --directory services/ai            # creates services/ai/.venv with runtime + dev deps
```

`pnpm install` covers `apps/web`, `apps/api`, `packages/*`, and `e2e` (see
`pnpm-workspace.yaml`). The Python service is independent: `uv sync` reads
`services/ai/pyproject.toml` and installs FastAPI, uvicorn, anthropic, redis, plus the
pytest dev group.

Copy the env template so you have a reference at hand (the services read real
environment variables, not a `.env` file; see section 5):

```powershell
Copy-Item .env.example .env                # macOS/Linux: cp .env.example .env
```

---

## 3. Start the infrastructure

```powershell
docker compose up -d --wait postgres
docker compose up -d redis localstack
```

`docker-compose.yml` starts:

- `postgres` (postgres:16-alpine) as user/password/db `aegis`/`aegis`/`aegis` on 5432
- `redis` (redis:7-alpine) on 6379
- `localstack` (localstack/localstack:3, S3 only) on 4566

`docker compose down` stops everything but keeps data; `docker compose down -v` wipes
the volumes for a truly fresh start.

---

## 4. Database setup

### The two roles, and why RLS needs both

The compose Postgres has one superuser: `aegis`. The RLS script
(`packages/db/prisma/rls.sql`) creates a second role, `aegis_app`
(password `aegis_app`), with plain table grants and no `BYPASSRLS`.

- **`aegis` (owner)** runs schema changes (`prisma db push` / `prisma migrate deploy`),
  applies the RLS policies, and runs the seed. The seed must run as the owner because
  the content library tables (frameworks, controls, crosswalks, questionnaires,
  questions) are deliberately read-only to the app role.
- **`aegis_app` (runtime)** is what the API and all DB tests connect as. This is the
  point of the whole design: Postgres superusers and table owners silently bypass RLS.
  If the app connected as `aegis`, every tenant-isolation policy would be decoration.
  All 13 org-scoped tables plus `organizations` carry `FORCE ROW LEVEL SECURITY` and a
  `tenant_isolation` policy keyed on `current_setting('app.current_org')`, which the
  API sets per transaction via `forOrg(orgId, ...)`. An unscoped query matches zero
  rows (fail closed).

That maps to the two URLs every service expects:

```
DATABASE_URL = postgresql://aegis_app:aegis_app@localhost:5432/aegis   # runtime, RLS enforced
DIRECT_URL   = postgresql://aegis:aegis@localhost:5432/aegis           # owner, migrations/RLS/seed
```

### Option A: dev setup (push + apply + seed)

Fast iteration path, what BUILD-LOG and CI use. All three steps run as the owner.

PowerShell:

```powershell
$env:DATABASE_URL = 'postgresql://aegis:aegis@localhost:5432/aegis'
$env:DIRECT_URL   = 'postgresql://aegis:aegis@localhost:5432/aegis'
pnpm --filter @aegis/db exec prisma db push --skip-generate --accept-data-loss
pnpm --filter @aegis/db rls:apply
pnpm --filter @aegis/db db:seed
```

Git Bash / macOS / Linux:

```bash
export DATABASE_URL=postgresql://aegis:aegis@localhost:5432/aegis
export DIRECT_URL=postgresql://aegis:aegis@localhost:5432/aegis
pnpm --filter @aegis/db exec prisma db push --skip-generate --accept-data-loss
pnpm --filter @aegis/db rls:apply
pnpm --filter @aegis/db db:seed
```

What each step does:

1. `prisma db push` creates the 18-model schema directly from `schema.prisma`.
2. `rls:apply` runs `prisma/rls.sql` via `scripts/apply-rls.mjs` (uses `DIRECT_URL`,
   falls back to `DATABASE_URL`): creates `aegis_app`, grants, enables + forces RLS on
   the 13 org-scoped tables, adds the scoped policies on `organizations`, revokes
   UPDATE/DELETE on `audit_logs` (append-only), and revokes writes on the content
   library.
3. `db:seed` is idempotent: loads 2 frameworks (EU AI Act, NIST AI RMF), 12 controls,
   4 crosswalks, the `EU_AI_ACT_RISK_V1` questionnaire (4 questions), and a demo
   tenant `demo-acme` with admin `admin@acme.demo` and 3 use cases.

Expected output ends with `RLS applied (roles, policies, FORCE, append-only audit).`
and `Seed complete.`

### Option B: prod-style setup (migrate deploy)

The repo ships real migrations (`packages/db/prisma/migrations/0_init` for the schema
and `1_rls` for the full RLS script), so a deploy-shaped database can be built without
`db push`:

```powershell
$env:DATABASE_URL = 'postgresql://aegis:aegis@localhost:5432/aegis'
$env:DIRECT_URL   = 'postgresql://aegis:aegis@localhost:5432/aegis'
pnpm --filter @aegis/db migrate:deploy
pnpm --filter @aegis/db db:seed              # content + demo tenant are not migrations
```

`migrate deploy` applies pending migrations in order and records them in
`_prisma_migrations`. Verified on a scratch DB: after deploy, 14 tables report
`rowsecurity = true` with `FORCE`. Prisma uses `directUrl` from the datasource block
for migration traffic, so the owner URL in `DIRECT_URL` is the one doing the DDL.

Either way, finish by confirming isolation works as the app role:

```powershell
$env:DATABASE_URL = 'postgresql://aegis_app:aegis_app@localhost:5432/aegis'
pnpm --filter @aegis/db test                  # 9 tests, must be green
```

---

## 5. Environment reference (every variable)

The TS services validate env at boot with a Zod schema
(`packages/config/src/env.ts`); a missing required variable fails fast with a listing
of every problem. The Python service reads `os.environ` directly. Neither loads a
`.env` file automatically, so set variables in the shell that launches each process
(the boot blocks in section 6 do exactly that). `.env` is your reference copy.

**Required at boot (API will not start without these):**

| Variable | What it does | Placeholder / format | When unset |
|---|---|---|---|
| `DATABASE_URL` | Runtime Postgres connection as `aegis_app`, so RLS is enforced | `postgresql://aegis_app:aegis_app@localhost:5432/aegis` | Boot fails (Zod) |
| `REDIS_URL` | Redis connection; reserved for queue work, also the fallback backend for AI budgets | `redis://localhost:6379` | Boot fails (Zod) |
| `SESSION_SECRET` | HS256 signing key for the session JWT cookie; minimum 32 chars | `dev-only-insecure-change-me-0123456789abcd` | Boot fails with `SESSION_SECRET must be at least 32 chars` |

**Core, optional with defaults:**

| Variable | What it does | Default | When unset |
|---|---|---|---|
| `NODE_ENV` | `development` / `test` / `production`. Production turns on secure cookies, 403s `POST /billing/dev/set-plan` | `development` | Dev behavior |
| `DIRECT_URL` | Owner-role connection for migrations, `rls:apply`, seed | none | Runtime fine; migration/seed commands need it |
| `WEB_URL` | CORS origin for the API + Stripe checkout success/cancel redirect base | `http://localhost:3000` | Default used |
| `API_URL` | The API listens on this URL's port; also the WorkOS callback fallback | `http://localhost:3001` | Default used (port 3001) |
| `AI_SERVICE_URL` | Where the API proxies `POST /use-cases/:id/ai/draft` and `/ai/suggest-controls` | `http://localhost:8000` | Default used; if nothing answers there, AI endpoints return 503 `AI service unreachable` |

**Object storage (evidence upload, M7):**

| Variable | What it does | Dev value | When unset |
|---|---|---|---|
| `S3_ENDPOINT` | Points the AWS SDK at LocalStack (`forcePathStyle` switches on with it) | `http://localhost:4566` | SDK targets real AWS; in dev without LocalStack, evidence upload errors at request time (the rest of the API works) |
| `S3_REGION` | Bucket region | `eu-central-1` (default) | Default used |
| `S3_BUCKET` | Evidence bucket; auto-created on first upload (`ensureBucket`) | `aegis-evidence` (default) | Default used |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | Static credentials; LocalStack accepts `test`/`test` | `test` / `test` | Default AWS credential chain |

**Auth (SSO, backlog B1):**

| Variable | What it does | Placeholder | When unset |
|---|---|---|---|
| `WORKOS_API_KEY` | WorkOS server key; with the client id it activates `/auth/sso/login` + `/auth/sso/callback` (Google OAuth and, same code path, enterprise SSO) | `sk_test_xxx` | Both SSO endpoints return 503 with the hint `SSO not configured: set WORKOS_API_KEY, WORKOS_CLIENT_ID, WORKOS_REDIRECT_URI`; dev email login keeps working |
| `WORKOS_CLIENT_ID` | WorkOS client id | `client_xxx` | Same as above |
| `WORKOS_REDIRECT_URI` | OAuth callback | `http://localhost:3001/auth/sso/callback` | Falls back to `{API_URL}/auth/sso/callback` |

**AI service (M9/M16):**

| Variable | What it does | Default | When unset |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | Switches the provider from `mock` to `claude` (Anthropic Messages API) | none | Deterministic MockProvider: templated drafts and suggestions, zero cost, used in dev/CI |
| `ANTHROPIC_MODEL_DRAFT` | Model for `/draft` (long-form) | `ANTHROPIC_MODEL` or `claude-sonnet-4-0` | Default used |
| `ANTHROPIC_MODEL_SUGGEST` | Model for `/suggest-controls` (structured, cheap tier) | `claude-haiku-4-5` | Default used |
| `AI_DAILY_TOKEN_BUDGET` | Per-org per-UTC-day token cap; exhausted requests get 429 + `Retry-After` | `0` (unlimited) | Unlimited |
| `AI_CACHE_TTL_SECONDS` | Response cache TTL (keyed org + endpoint + canonical request, `X-Cache: hit/miss` header); `0` disables | `3600` | 1h cache |
| `AI_BREAKER_THRESHOLD` | Consecutive provider failures before the circuit opens (fast 503) | `5` | Default used |
| `AI_BREAKER_COOLDOWN_SECONDS` | How long the circuit stays open before a half-open probe | `60` | Default used |
| `AI_BUDGET_REDIS_URL` | Dedicated Redis for budget counters (B10): survives restarts, correct across replicas. Falls back to `REDIS_URL`, then in-memory | none | Falls back; in-memory counters reset on restart |

**Internal service auth:**

| Variable | What it does | Format | When unset |
|---|---|---|---|
| `INTERNAL_API_TOKEN` | Shared secret between the core API and the AI service; the API sends it as `X-Internal-Token`, the AI service requires a match. Set the **same value in both processes** | any long random string | Dev: AI service accepts unauthenticated calls (local only). Production (`APP_ENV=production` on the AI service): fails closed, every call gets 503 `internal token not configured` |

Note: the AI service's production check reads `APP_ENV`, not `NODE_ENV`. Set
`APP_ENV=production` on the Python process in any deployed environment.

**Billing (M14/B8), Stripe test mode:**

| Variable | What it does | Placeholder | When unset |
|---|---|---|---|
| `STRIPE_SECRET_KEY` | Activates the real Stripe client for `POST /billing/checkout` | `sk_test_xxx` | Mock checkout (fake URL) + dev-only `POST /billing/dev/set-plan` path; boot log says `stripe=noop (mock checkout)` |
| `STRIPE_WEBHOOK_SECRET` | Signature verification for `POST /billing/webhook` (the **only** path that mutates plan state) | `whsec_xxx` | Webhook endpoint returns 503 |
| `STRIPE_PRICE_TEAM` / `STRIPE_PRICE_BUSINESS` | Price ids for the Team ($499, 25 systems) and Business ($1,499, 100 systems) subscriptions | `price_xxx` | Checkout for that tier returns 400 `no Stripe price configured` |

**Ops (M15/B9), all no-op without keys:**

| Variable | What it does | When unset |
|---|---|---|
| `SENTRY_DSN` | Error tracking; unexpected 500s get captured with request id | No-op; boot log `sentry=noop` |
| `POSTHOG_KEY` | Product analytics (`system_registered`, `approval_decided`, org-scoped, no PII) | No-op; `posthog=noop` |
| `POSTHOG_HOST` | PostHog endpoint override | Defaults to `https://eu.posthog.com` |
| `RESEND_API_KEY` | Transactional email | Emails are logged instead: `[email noop] to=... subject=...` |
| `EMAIL_FROM` | Sender override | Defaults to `Provenant <noreply@aegis.dev>` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OTLP HTTP collector (traces, auto-instrumented http/express/prisma), e.g. `http://localhost:4318` | No-op; boot prints `[otel] noop (set OTEL_EXPORTER_OTLP_ENDPOINT to enable)` |
| `REVIEW_SLA_DAYS` | Due-date window for review workflow steps (B6) | Defaults to `5` |

**Web console:**

| Variable | What it does | When unset |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Browser-side base URL for API calls (`credentials: 'include'` cookie auth) | Defaults to `http://localhost:3001`, correct for local dev |

---

## 6. Boot the three services

Build order matters once: internal packages compile to `dist/` and the API is plain
`node` against compiled output (no dev watcher script).

```powershell
pnpm build                                   # turbo builds packages + api + web
```

### 6.1 Core API (port 3001)

PowerShell (one shell per service; env vars live per process):

```powershell
$env:DATABASE_URL        = 'postgresql://aegis_app:aegis_app@localhost:5432/aegis'
$env:DIRECT_URL          = 'postgresql://aegis:aegis@localhost:5432/aegis'
$env:REDIS_URL           = 'redis://localhost:6379'
$env:SESSION_SECRET      = 'dev-only-insecure-change-me-0123456789abcd'
$env:S3_ENDPOINT         = 'http://localhost:4566'
$env:S3_ACCESS_KEY_ID    = 'test'
$env:S3_SECRET_ACCESS_KEY= 'test'
$env:S3_REGION           = 'eu-central-1'
$env:S3_BUCKET           = 'aegis-evidence'
$env:INTERNAL_API_TOKEN  = 'dev-internal-token-please-rotate'
node apps/api/dist/main.js
```

Git Bash / macOS / Linux:

```bash
DATABASE_URL=postgresql://aegis_app:aegis_app@localhost:5432/aegis \
DIRECT_URL=postgresql://aegis:aegis@localhost:5432/aegis \
REDIS_URL=redis://localhost:6379 \
SESSION_SECRET=dev-only-insecure-change-me-0123456789abcd \
S3_ENDPOINT=http://localhost:4566 S3_ACCESS_KEY_ID=test S3_SECRET_ACCESS_KEY=test \
S3_REGION=eu-central-1 S3_BUCKET=aegis-evidence \
INTERNAL_API_TOKEN=dev-internal-token-please-rotate \
node apps/api/dist/main.js
```

The S3 variables must be present **at boot** or evidence upload fails later with an
opaque SDK error. Expected boot log: `[otel] noop ...`, `stripe=noop (mock checkout)`,
`sentry=noop posthog=noop resend=noop`, then `Provenant API listening on :3001`.

Quick check: `curl http://localhost:3001/health` returns `{"status":"ok"}`-shaped
output and an `x-request-id` response header.

### 6.2 AI service (port 8000)

```powershell
$env:INTERNAL_API_TOKEN = 'dev-internal-token-please-rotate'   # SAME value as the API
uv run --directory services/ai uvicorn app.main:app --port 8000
```

Git Bash / macOS / Linux:

```bash
INTERNAL_API_TOKEN=dev-internal-token-please-rotate \
uv run --directory services/ai uvicorn app.main:app --port 8000
```

Check: `curl http://localhost:8000/health` returns
`{"status":"ok","provider":"mock","model":"mock-template-v1..."}` (provider flips to
`claude` once `ANTHROPIC_API_KEY` is set in this shell).

### 6.3 Web console (port 3000)

```powershell
pnpm --filter @aegis/web dev
```

No env needed locally: the console defaults to the API at `http://localhost:3001`.
Open `http://localhost:3000/login`, sign in with any email (dev auth provider creates
a user + personal org + ADMIN membership), or use the seeded `admin@acme.demo`.
The public funnel lives at `http://localhost:3000/assess` with no login.

---

## 7. Verify everything

### 7.1 Test suites and expected counts

Run with Postgres + LocalStack up and the dev DB set up (section 4, Option A).
PowerShell shown; for Git Bash use `export` instead of `$env:`.

```powershell
# 1. Core domain logic (pure, no infra): 45 tests
pnpm --filter @aegis/core test

# 2. DB tenant-isolation suite (as aegis_app, the whole point): 9 tests
$env:DATABASE_URL = 'postgresql://aegis_app:aegis_app@localhost:5432/aegis'
$env:DIRECT_URL   = 'postgresql://aegis:aegis@localhost:5432/aegis'
pnpm --filter @aegis/db test

# 3. API integration tests (NestJS via SWC + supertest, real Postgres): 7 tests
pnpm --filter @aegis/api test

# 4. AI service (mock provider, fakeredis; no keys, no docker needed): 18 tests
uv run --directory services/ai pytest -q

# 5. E2E golden path (Playwright API mode boots the API itself): 3 tests
pnpm --filter @aegis/api build
pnpm --filter @aegis/e2e test
```

| Suite | Command | Expected |
|---|---|---|
| Core unit | `pnpm --filter @aegis/core test` | 45 passed |
| DB isolation | `pnpm --filter @aegis/db test` | 9 passed |
| AI service | `uv run --directory services/ai pytest -q` | 18 passed |
| API integration | `pnpm --filter @aegis/api test` | 7 passed |
| E2E | `pnpm --filter @aegis/e2e test` | 3 passed |

Notes:

- `pnpm test` at the root runs the turbo `test` task across the workspace (core, db,
  api together), matching the CI `Test` step.
- The API integration tests ship sane defaults in `apps/api/test/setup-env.ts`
  (including Stripe placeholders for pure HMAC signature tests and a dead
  `AI_SERVICE_URL` port to assert the 503 mapping), so they only need Postgres up.
- The E2E config (`e2e/playwright.config.ts`) boots `node ../apps/api/dist/main.js`
  with the full dev env, hits `/health`, and reuses an already-running :3001 server
  outside CI. It needs the seeded questionnaire (`EU_AI_ACT_RISK_V1`) and LocalStack.
  The three tests: full governance golden path (register, classify HIGH, suggest 7
  controls, implement + clean evidence, readiness 14%, submit, approve, export,
  audit-chain verify), unauthenticated 401s, and cross-tenant isolation.

### 7.2 Manual smoke script (login, register, assess, report)

Git Bash / macOS / Linux (`curl` + cookie jar):

```bash
B=http://localhost:3001

# 1. Login (dev provider): mints a user + org + ADMIN membership, sets the session cookie
curl -s -c /tmp/aegis.jar -H 'content-type: application/json' \
  -d '{"email":"smoke@local.dev"}' $B/auth/dev/login

# 2. Register an AI system
ID=$(curl -s -b /tmp/aegis.jar -H 'content-type: application/json' \
  -d '{"name":"Smoke Hiring AI","purpose":"rank candidates"}' $B/use-cases | \
  python -c "import sys,json;print(json.load(sys.stdin)['id'])")

# 3. Risk assessment: Annex III high-risk answer -> tier HIGH
curl -s -b /tmp/aegis.jar -H 'content-type: application/json' \
  -d '{"questionnaireKey":"EU_AI_ACT_RISK_V1","answers":{"annex_iii":true}}' \
  $B/use-cases/$ID/assessments

# 4. Map the required controls for the tier (7 for HIGH) and check readiness
curl -s -b /tmp/aegis.jar -X POST $B/use-cases/$ID/controls/suggest
curl -s -b /tmp/aegis.jar $B/use-cases/$ID/readiness

# 5. Export the EU AI Act readiness report (Markdown)
curl -s -b /tmp/aegis.jar $B/use-cases/$ID/report.md
```

PowerShell equivalent:

```powershell
$B = 'http://localhost:3001'
$S = New-Object Microsoft.PowerShell.Commands.WebRequestSession
Invoke-RestMethod -WebSession $S -Method Post -ContentType 'application/json' `
  -Body '{"email":"smoke@local.dev"}' "$B/auth/dev/login"
$uc = Invoke-RestMethod -WebSession $S -Method Post -ContentType 'application/json' `
  -Body '{"name":"Smoke Hiring AI","purpose":"rank candidates"}' "$B/use-cases"
Invoke-RestMethod -WebSession $S -Method Post -ContentType 'application/json' `
  -Body '{"questionnaireKey":"EU_AI_ACT_RISK_V1","answers":{"annex_iii":true}}' `
  "$B/use-cases/$($uc.id)/assessments"
Invoke-RestMethod -WebSession $S -Method Post "$B/use-cases/$($uc.id)/controls/suggest"
Invoke-RestMethod -WebSession $S "$B/use-cases/$($uc.id)/readiness"
Invoke-RestMethod -WebSession $S "$B/use-cases/$($uc.id)/report.md"
```

Expected: the assessment returns `tier: HIGH`, suggest reports 7 controls added,
readiness shows 0% (nothing implemented yet), and the report is a Markdown
"EU AI Act Readiness Report". In the browser, repeat the same flow through
`http://localhost:3000` (dashboard, inventory, detail page) and try the public funnel
at `/assess`. With the AI service running, the use-case detail page also exposes the
AI draft panel (`POST /use-cases/:id/ai/draft`), whose output is labeled advisory with
provenance.

---

## 8. Enabling each real integration later

Everything below is optional. The platform is designed to boot keyless; each key
activates exactly one seam.

### Stripe (test mode)

1. Create a Stripe test account; copy the secret key (`sk_test_...`).
2. In the dashboard create two recurring prices: Team $499/month and Business
   $1,499/month. Copy both `price_...` ids.
3. Forward webhooks locally with the Stripe CLI and grab the signing secret it prints:

```powershell
stripe listen --forward-to localhost:3001/billing/webhook    # prints whsec_...
```

4. Boot the API with `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
   `STRIPE_PRICE_TEAM`, `STRIPE_PRICE_BUSINESS` set. Boot log flips to `stripe=on`.
5. `POST /billing/checkout` now returns a real Checkout URL. Pay with card
   `4242 4242 4242 4242`. Plan state changes **only** via the signature-verified
   webhook (`checkout.session.completed`, `customer.subscription.updated`,
   `customer.subscription.deleted`); checkout success alone never touches the DB. The
   webhook write runs inside the org's tenant context, so the B2 RLS policy on
   `organizations` admits exactly that org.
6. Verify metering: on FREE, registering a 4th system returns 402; after the webhook
   upgrades the plan to TEAM, it returns 201. `GET /billing` shows the meter.

Without keys, simulate the post-checkout webhook with the dev path (403 in
production): `POST /billing/dev/set-plan {"tier":"TEAM"}`.

### WorkOS (Google SSO)

1. Create a WorkOS account; copy `sk_test_...` and `client_...` from the dashboard.
2. Register the redirect URI `http://localhost:3001/auth/sso/callback`.
3. Boot the API with `WORKOS_API_KEY`, `WORKOS_CLIENT_ID`, `WORKOS_REDIRECT_URI`.
4. `GET /auth/sso/login` now redirects to Google via WorkOS AuthKit; the callback
   exchanges the code, provisions the workspace through the same find-or-create flow
   as dev login, sets the session cookie, and redirects to `WEB_URL`. The login page's
   SSO button stops returning 503.

### Anthropic (real Claude in the AI service)

Set `ANTHROPIC_API_KEY` in the AI service's shell and restart it. `/health` flips to
`provider: claude`. Model routing defaults: drafts on `claude-sonnet-4-0`, suggestions
on `claude-haiku-4-5`; override per task with `ANTHROPIC_MODEL_DRAFT` /
`ANTHROPIC_MODEL_SUGGEST`. Sensible cost-control starting point:

```powershell
$env:ANTHROPIC_API_KEY          = 'sk-ant-...'
$env:AI_DAILY_TOKEN_BUDGET      = '200000'    # per org per UTC day; 429 when exhausted
$env:AI_CACHE_TTL_SECONDS       = '3600'
$env:AI_BREAKER_THRESHOLD       = '5'
$env:AI_BREAKER_COOLDOWN_SECONDS= '60'
```

### Sentry, PostHog, Resend

Set `SENTRY_DSN`, `POSTHOG_KEY` (optionally `POSTHOG_HOST`), `RESEND_API_KEY`
(optionally `EMAIL_FROM`) on the API and restart. The boot line confirms each:
`sentry=on posthog=on resend=on`. No code changes; the `OpsService` facade activates
per key.

### OpenTelemetry

Run any OTLP HTTP collector (Jaeger all-in-one, Grafana Alloy, Honeycomb endpoint) and
set `OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318` on the API. Boot prints
`[otel] tracing on -> http://localhost:4318`; http, express, and Prisma spans flow as
service `aegis-api`.

### Redis-backed AI budgets

In-memory budget counters reset on restart and are per-process. To persist them, point
the AI service at Redis: set `AI_BUDGET_REDIS_URL` (or just have `REDIS_URL` in its
env; the compose Redis works). Counters become `ai_budget:{org}:{utc-date}` keys with
a 2-day TTL. If Redis is unreachable at startup the service degrades to in-memory
rather than crashing.

---

## 9. Troubleshooting (real gotchas from this build)

**`prisma generate` fails with EPERM on Windows (engine DLL locked).**
A still-running dev API holds `query_engine-windows.dll.node`. The netstat PID for
:3001 can point at a parent process and lie; find the real node process running
`main.js` and kill it:

```powershell
Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  Where-Object { $_.CommandLine -match 'main\.js' } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
pnpm --filter @aegis/db exec prisma generate
```

**Login or public endpoints suddenly return 429.**
The throttler is in-memory: 200/min/IP global, 10/min on `POST /auth/dev/login`,
30/20/3 per minute on the public assessment GET/classify/convert. The window persists
60 seconds, so a burst of E2E runs or manual logins from one IP can trip it. Wait a
minute or restart the API to reset the counters; keep scripted logins under 10/min.

**Evidence upload fails during E2E although LocalStack is up.**
Outside CI, Playwright reuses any server already listening on :3001
(`reuseExistingServer`). If that stray server was booted **without** the S3 env vars,
uploads fail inside the E2E run while everything else passes. Kill stray
`node apps/api/dist/main.js` processes first (command above) and let Playwright boot
its own API with the correct env.

**Testing the INFECTED scan path: Windows Defender eats the EICAR file.**
The malware-scan stub flags the standard EICAR string. Writing a literal EICAR file to
disk gets it quarantined instantly ("permission denied"). Pipe the bytes through stdin
instead, and in bash disable history expansion first because the EICAR string contains
`!`:

```bash
set +H
printf '%s' 'X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*' | \
  curl -s -b /tmp/aegis.jar -F 'file=@-;filename=malware-test.txt;type=text/plain' \
  $B/control-mappings/<mappingId>/evidence
```

Expected: `scanStatus: "INFECTED"`; the file is still stored (quarantined semantics),
the mapping does not count toward readiness.

**Queries return zero rows that definitely exist.**
That is RLS working as designed, failing closed. Tenant context was not set for the
connection (`SET LOCAL app.current_org` happens inside `forOrg` transactions). On
pooled connections a reverted `SET LOCAL` becomes the empty string rather than NULL;
the policies wrap the setting in `nullif(current_setting(...), '')` so empty maps to
NULL and matches no rows instead of throwing `22P02 invalid input syntax for type
uuid`. If a script needs cross-tenant or unscoped reads (seeding, ops), run it as the
owner role via `DIRECT_URL`; never point the app at the owner role to "fix" missing
rows.

**API exits at boot with `Invalid environment variables`.**
Read the list it prints. The usual ones: `REDIS_URL` missing (required even before
queue features land), or `SESSION_SECRET` shorter than 32 characters.

**Seed fails with permission denied on frameworks/controls.**
The seed ran as `aegis_app`. The content library is read-only to the app role by
design; run the seed with both URLs set to the owner (section 4).

**`uv run pytest` cannot find the app module.**
Run it from `services/ai` or use `uv run --directory services/ai pytest -q`;
`pythonpath = ["."]` in `pyproject.toml` only applies relative to that directory.

---

## 10. CI parity

`.github/workflows/ci.yml` runs the same sequence on every push/PR to `main`:
pnpm install (frozen), advisory `pnpm audit`, prisma generate, typecheck, lint,
schema + RLS against a Postgres service container, `pnpm test` as `aegis_app`, build,
Playwright E2E with a LocalStack service, a separate `uv run pytest` job for the AI
service, and a gitleaks secret scan. If something passes locally but fails in CI,
diff your env against the `env:` blocks in that file first.
