# Provenant — Windows Quick Setup

Step-by-step Windows (PowerShell) setup. Run every command from the repo root unless noted.

---

## 1. Install prerequisites

Open **PowerShell as Administrator** and run:

```powershell
winget install OpenJS.NodeJS.LTS
winget install Git.Git
winget install Docker.DockerDesktop
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

Close and reopen PowerShell (not admin), then enable pnpm:

```powershell
corepack enable pnpm
```

Start **Docker Desktop** and wait for the whale icon to settle.

Verify:

```powershell
node --version          # v22.x
pnpm --version          # 9.15.4
uv --version
docker --version
docker info             # must succeed
```

---

## 2. Clone and install

```powershell
cd "C:\Development\A AI Vibe coded Projects\Ai Governance"
pnpm install
uv sync --directory services/ai
Copy-Item .env.example .env
```

---

## 3. Start Docker infrastructure

```powershell
docker compose up -d --wait postgres
docker compose up -d redis localstack
```

This brings up Postgres (5432), Redis (6379), and LocalStack/S3 (4566).

---

## 4. Set up the database (dev path)

```powershell
$env:DATABASE_URL = 'postgresql://aegis:aegis@localhost:5432/aegis'
$env:DIRECT_URL   = 'postgresql://aegis:aegis@localhost:5432/aegis'
pnpm --filter @aegis/db exec prisma db push --skip-generate --accept-data-loss
pnpm --filter @aegis/db rls:apply
pnpm --filter @aegis/db db:seed
```

Expect the run to end with `RLS applied ...` and `Seed complete.`

Verify isolation as the app role:

```powershell
$env:DATABASE_URL = 'postgresql://aegis_app:aegis_app@localhost:5432/aegis'
pnpm --filter @aegis/db test    # 9 tests should pass
```

---

## 5. Build everything

```powershell
pnpm build
```

---

## 6. Boot the three services

Open **three separate PowerShell windows**. Each command keeps running — leave it open.

### Window 1 — Core API (port 3001)

```powershell
cd "C:\Development\A AI Vibe coded Projects\Ai Governance"
$env:DATABASE_URL         = 'postgresql://aegis_app:aegis_app@localhost:5432/aegis'
$env:DIRECT_URL           = 'postgresql://aegis:aegis@localhost:5432/aegis'
$env:REDIS_URL            = 'redis://localhost:6379'
$env:SESSION_SECRET       = 'dev-only-insecure-change-me-0123456789abcd'
$env:S3_ENDPOINT          = 'http://localhost:4566'
$env:S3_ACCESS_KEY_ID     = 'test'
$env:S3_SECRET_ACCESS_KEY = 'test'
$env:S3_REGION            = 'eu-central-1'
$env:S3_BUCKET            = 'aegis-evidence'
$env:INTERNAL_API_TOKEN   = 'dev-internal-token-please-rotate'
node apps/api/dist/main.js
```

Wait for: `Provenant API listening on :3001`.

### Window 2 — AI service (port 8000)

```powershell
cd "C:\Development\A AI Vibe coded Projects\Ai Governance"
$env:INTERNAL_API_TOKEN = 'dev-internal-token-please-rotate'
uv run --directory services/ai uvicorn app.main:app --port 8000
```

### Window 3 — Web console (port 3000)

```powershell
cd "C:\Development\A AI Vibe coded Projects\Ai Governance"
pnpm --filter @aegis/web dev
```

---

## 7. Verify it works

In a **fourth** PowerShell window:

```powershell
curl http://localhost:3001/health
curl http://localhost:8000/health
```

Then open the browser:

- App: **http://localhost:3000/login** — log in with any email (e.g. `you@local.dev`) or use `admin@acme.demo`
- Public funnel: **http://localhost:3000/assess**

---

## 8. (Optional) Run the test suites

```powershell
pnpm --filter @aegis/core test           # 45 tests
$env:DATABASE_URL = 'postgresql://aegis_app:aegis_app@localhost:5432/aegis'
$env:DIRECT_URL   = 'postgresql://aegis:aegis@localhost:5432/aegis'
pnpm --filter @aegis/db test             # 9 tests
pnpm --filter @aegis/api test            # 7 tests
uv run --directory services/ai pytest -q # 18 tests
pnpm --filter @aegis/e2e test            # 3 tests (Playwright)
```

---

## Stopping / restarting

Stop services: press **Ctrl+C** in each PowerShell window.

Stop Docker (keep data):

```powershell
docker compose down
```

Wipe Docker data (fresh start — you'll need to redo step 4):

```powershell
docker compose down -v
```

---

## Common Windows issues

**`prisma generate` fails with EPERM** — a stale API process is locking the engine DLL. Kill it:

```powershell
Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  Where-Object { $_.CommandLine -match 'main\.js' } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
```

**API exits with `Invalid environment variables`** — read the printed list. Usually `SESSION_SECRET` is shorter than 32 chars, or `REDIS_URL` is missing.

**Queries return zero rows** — RLS is failing closed because tenant context wasn't set. Don't point the app at the owner role; this is expected behavior outside of `forOrg(...)` transactions.

**429 on login** — in-memory throttler tripped (10/min on dev login). Wait 60s or restart the API.

For everything else, see [`docs/11-SETUP.md`](docs/11-SETUP.md).
