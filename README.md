# Aegis — Enterprise AI Governance Platform

System of record for an organization's AI: discover use cases, classify risk (EU AI
Act / NIST AI RMF / ISO 42001), map controls, collect evidence, run review/approval
workflows, and export audit-ready documentation. Claude-assisted throughout.

> Working title "Aegis" is a placeholder (see `docs/00-OVERVIEW.md`).

## Status

Early build. Planning + design complete; foundation in progress.
**Build progress and resume point: [`BUILD-LOG.md`](./BUILD-LOG.md).**

## Documentation

- **Plan:** [`docs/`](./docs) — overview, PRD, architecture, roadmap, GTM, security, design, scaling, engineering foundations.
- **Design system:** [`DESIGN.md`](./DESIGN.md) (+ visual preview: `design-preview.html`).
- **Build tracker:** [`BUILD-LOG.md`](./BUILD-LOG.md).

## Stack

Turborepo + pnpm · Next.js (App Router) + Tailwind + shadcn/ui · NestJS + ts-rest ·
PostgreSQL 16 + Prisma (RLS) · Python FastAPI AI service · WorkOS · BullMQ → Temporal ·
pgvector · Stripe · Resend · Sentry · PostHog · AWS/ECS + Terraform.

## Monorepo layout

```
apps/
  web/        Next.js — platform UI + PLG assessment
  api/        NestJS core API
services/
  ai/         Python FastAPI AI service (classify, draft, RAG)
packages/
  contracts/  ts-rest API contracts + Zod schemas (shared web <-> api)
  db/         Prisma schema, migrations, seed, RLS policies
  core/        domain logic: risk scoring, crosswalk resolution, RBAC
  ui/          shared React components (shadcn-based) + design tokens
  config/      shared tsconfig / lint / format
  content/     framework + control library content-as-data
infra/         Terraform
```

## Develop (once dependencies land in later components)

```bash
pnpm install         # install workspace deps
pnpm dev             # run web + api + ai locally (Turbo)
pnpm typecheck       # type-check all packages
pnpm test            # unit + integration + tenant-isolation suites
```

Requires Node >= 22 and pnpm 9. See [`docs/08-ENGINEERING-FOUNDATIONS.md`](./docs/08-ENGINEERING-FOUNDATIONS.md).
