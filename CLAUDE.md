# CLAUDE.md — AI Governance Platform (Provenant)

Commercial, multi-tenant enterprise **AI governance SaaS**. A system of record for an
organization's AI: discover use cases, classify risk (EU AI Act / NIST / ISO 42001),
map controls, collect evidence, run approvals, export audit-ready docs. Claude-assisted.

## Resume / continuity (read first)
This is a long, multi-session build. On every session start:
1. Read **`BUILD-LOG.md`** — the build progress tracker and resume point.
2. Skim **`docs/00-OVERVIEW.md`** (index) and the doc the next component needs.
3. `git log --oneline -15` to see what shipped. Continue from BUILD-LOG "Next up".
Update `BUILD-LOG.md` at the end of every component (status + log entry). Build
**sequentially, one component at a time**; each component is its own commit.

## Source of truth
- **Plan:** `docs/00`–`08` (overview, PRD, architecture, roadmap, GTM, security, design, scaling, eng foundations).
- **Design system:** `DESIGN.md` — read before any UI work. Lapis `#255C99` primary,
  Sand `#CCAD8F` signature accent, Carmine `#B3001B` = Prohibited risk / destructive only.
  Fonts: Fraunces (display) + Geist (UI/data) + Geist Mono. Do not deviate without approval.

## Stack (locked)
Turborepo + pnpm · Next.js (App Router) + Tailwind + shadcn/ui (+ 21st.dev) · NestJS + ts-rest ·
Postgres 16 + Prisma + RLS · Python FastAPI AI service · WorkOS (auth/SSO/SCIM) ·
BullMQ → Temporal · pgvector · Stripe · Resend · Sentry · PostHog · AWS/ECS + Terraform.

## Engineering rules
- **Tenant isolation is sacred:** every tenant-scoped table has `org_id` + RLS; object-level
  authz (not just route guards); always-on isolation test suite is CI-blocking.
- **Security:** validate at every boundary; no secrets in code; audit-log material changes
  (append-only, hash-chained); AI output is advisory-only, labeled, sourced, never auto-applied.
- **Quality:** immutability (new objects, no mutation); small files (<800 lines); errors handled
  at every layer; 80%+ test coverage; conventional commits.

## Skill routing
When a request matches a gstack skill, invoke it. Bugs → /investigate · QA → /qa · review →
/review · ship → /ship · resume context → read BUILD-LOG.md · design changes → /design-review.
