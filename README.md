# Provenant

**The system of record for enterprise AI governance.**

Discover AI use cases, classify risk (EU AI Act / NIST AI RMF / ISO 42001), map controls,
collect evidence, run review & approval workflows, and export audit-ready documentation —
Claude-assisted throughout, with every AI output labelled advisory and sourced.

---

## 🚀 Setup

New here? Start with the setup guide for your platform — it walks you from zero to a
running stack (`web` + `api` + `ai` + Postgres/Redis/S3) with the keyless dev defaults.

| Guide | Use it for |
|-------|-----------|
| **▶️ [Full setup guide](./docs/11-SETUP.md)** | End-to-end local/dev setup (prereqs, env, database, running the stack). **Start here.** |
| [Windows setup notes](./SETUP-WINDOWS.md) | Windows-specific gotchas (PowerShell, Docker Desktop, process management). |
| [Guided run-through](./docs/09-RUNTHROUGH.md) | A click-by-click tour of the product once it's running. |

**TL;DR (after reading the setup guide):**

```bash
docker compose up -d postgres redis localstack   # infra
pnpm install                                       # workspace deps (Node >= 22, pnpm 9)
pnpm --filter @aegis/db db:setup                   # schema + RLS
pnpm --filter @aegis/db db:seed                    # demo content
pnpm dev                                            # web :3000 · api :3001 · ai :8000
```

> Runs **keyless** in dev — every external integration (WorkOS, Anthropic, Stripe, Sentry,
> PostHog, OTel) degrades to a mock/no-op until you supply real keys. See `.env.example`.

---

## 📚 Documentation

The important documents, grouped by what you need:

### Understand the product
| Doc | What it covers |
|-----|----------------|
| [Plain-language explainer](./docs/12-EXPLAIN-SIMPLE.md) | The product and its main features, explained simply. |
| [Pitch](./docs/10-PITCH.md) | The problem, the wedge, and why now. |
| [Overview](./docs/00-OVERVIEW.md) | Index + product summary and naming. |
| [PRD](./docs/01-PRD.md) | Product requirements and scope. |

### Build & operate
| Doc | What it covers |
|-----|----------------|
| [Setup guide](./docs/11-SETUP.md) | Local/dev setup, env, database, running the stack. |
| [Run-through](./docs/09-RUNTHROUGH.md) | End-to-end product walkthrough. |
| [Build log](./BUILD-LOG.md) | Build progress + **resume point** (sequential component tracker). |

### Architecture & engineering
| Doc | What it covers |
|-----|----------------|
| [Architecture](./docs/02-ARCHITECTURE.md) | System design, services, data flow. |
| [Engineering foundations](./docs/08-ENGINEERING-FOUNDATIONS.md) | Repo structure, conventions, CI/CD. |
| [Scaling & tooling](./docs/07-SCALING-AND-TOOLING.md) | Tool map, commercial plumbing, AI cost controls. |
| [Roadmap](./docs/03-ROADMAP.md) | Milestones and sequencing. |

### Risk, security & go-to-market
| Doc | What it covers |
|-----|----------------|
| [Security & threat model](./docs/05-SECURITY-AND-THREAT-MODEL.md) | STRIDE, tenant isolation, audit hash-chain, SOC 2. |
| [GTM & risks](./docs/04-GTM-AND-RISKS.md) | Go-to-market motion and key risks. |

### Design
| Doc | What it covers |
|-----|----------------|
| [Design system](./DESIGN.md) | Brand, color, type, components (visual preview: `design-preview.html`). |
| [Design system spec](./docs/06-DESIGN-SYSTEM.md) | IA, key screens, accessibility. |

---

## 🧱 Stack

Turborepo + pnpm · Next.js (App Router) + Tailwind + shadcn/ui · NestJS + ts-rest ·
PostgreSQL 16 + Prisma (RLS) · Python FastAPI AI service · WorkOS · BullMQ → Temporal ·
pgvector · Stripe · Resend · Sentry · PostHog · AWS/ECS + Terraform.

## 🗂️ Monorepo layout

```
apps/
  web/        Next.js — platform UI + PLG assessment funnel
  api/        NestJS core API (ts-rest)
services/
  ai/         Python FastAPI AI service (classify, draft, suggest — advisory only)
packages/
  contracts/  ts-rest API contracts + Zod schemas (shared web <-> api)
  db/         Prisma schema, migrations, seed, RLS policies
  core/       domain logic: risk scoring, crosswalk resolution, RBAC, reports
  ui/         shared React components (shadcn-based) + design tokens
  config/     shared tsconfig / lint / format + validated env schema
  content/    framework + control library (content-as-data)
infra/        Terraform
```

> Internal package namespace is `@aegis/*` and the Postgres app role is `aegis_app` —
> these are stable identifiers and intentionally unchanged by the product rename.

## 🛠️ Common commands

```bash
pnpm dev             # run web + api + ai locally (Turbo)
pnpm typecheck       # type-check all packages
pnpm build           # build all packages
pnpm test            # unit + integration + tenant-isolation + e2e suites
```

Requires **Node >= 22** and **pnpm 9**. Full details in
[`docs/08-ENGINEERING-FOUNDATIONS.md`](./docs/08-ENGINEERING-FOUNDATIONS.md).
