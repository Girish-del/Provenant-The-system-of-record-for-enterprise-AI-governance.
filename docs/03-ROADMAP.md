# Roadmap & Build Plan — AI Governance Platform

> Companion to `01-PRD.md` and `02-ARCHITECTURE.md`. Two parts:
> **(A)** the phased delivery plan, **(B)** the DevFleet mission DAG you can
> dispatch once the MCP server is connected.

---

## A. Phased delivery plan

### Phase 0 — Validate & set foundations (Weeks 0–4)
**Goal: don't build the wrong thing; make the build fast.**
- Recruit **3–5 design partners** (EU-exposed companies feel the Aug 2026 deadline).
- Lock the **wedge** (EU AI Act readiness) and the MVP scope from `01-PRD.md §5`.
- Recruit a **compliance advisor** (AI/privacy lawyer or ex-regulator).
- Decide the **stack lane** (`02-ARCHITECTURE.md §1`).
- Wireframes + clickable prototype for the MVP flow; validate with partners.
- Stand up repo, CI, IaC skeleton, auth provider, base multi-tenant scaffolding.
  Build the spine (M1–M3) per `08-ENGINEERING-FOUNDATIONS.md §6` before fanning out.
- **Exit:** signed design partners, agreed MVP, working skeleton deploys to staging.

### Phase 1 — MVP: EU AI Act Readiness (Months 1–3)
- Auth, org/workspace, RBAC; multi-tenant data layer with RLS + isolation tests.
- AI Use-Case registry (manual + CSV) with lifecycle states.
- EU AI Act classification questionnaire → auto risk tier + rationale.
- EU AI Act + NIST control library + starter crosswalk (content-as-data).
- Control mapping, evidence upload, readiness dashboard + gap report.
- Single intake → review → approve workflow; audit trail.
- AI-assist v1 (Claude): draft risk summary + suggested controls from intake.
- Export "EU AI Act Readiness Report" (use case + portfolio).
- **Commercial plumbing live:** Stripe billing + plan tiers, transactional email
  (Resend), Sentry, PostHog (analytics + flags), AI cost controls (`07 §2–3`).
- **PLG assessment surface** shipped as the top-of-funnel (`06-DESIGN-SYSTEM §5`).
- **Exit:** a design partner replaces their spreadsheet with the product, and a paid
  pilot is signed.

### Phase 2 — Governance core (Months 4–6)
- Policy management + attestations.
- Configurable workflows/approvals (multiple paths, SLAs, reminders) — Temporal.
- Full evidence lifecycle + audit-package export.
- Reporting: exec/board dashboards, risk register, regulator-facing tech docs.
- AI-assist v2: draft FRIA/DPIA/technical documentation; gap analysis from uploads.
- **Exit:** 3 paying customers; repeatable onboarding.

### Phase 3 — Integrations & continuous assurance (Months 7–9)
- Discovery connectors (MLflow / SageMaker / Databricks / Azure ML / LLM usage)
  → live inventory + shadow-AI surfacing.
- Monitoring ingestion (drift/bias/perf) + incident register + post-market reports.
- ISO/IEC 42001 module + certification support; vendor/third-party AI risk.
- SCIM provisioning; deeper SSO.
- **Exit:** "live inventory" demo wins deals; ISO 42001 support cited by buyers.

### Phase 4 — Scale & enterprise hardening (Months 10–12)
- SOC 2 Type II achieved; EU data residency GA.
- ABAC/field-level permissions; white-label; control-template marketplace.
- Advanced analytics, benchmarking, regulatory-change alerts.
- Performance/scale work; schema-per-tenant option for large accounts.
- **Exit:** enterprise-ready; multiple 6-figure ACV deals in pipeline.

### Cross-cutting (every phase)
- Security/compliance program (SOC 2 controls live from Phase 1).
- Testing: 80%+ coverage, always-on tenant-isolation suite, E2E on the core flow.
- Dogfood: govern the platform itself with its own controls.

---

## B. DevFleet mission DAG (for parallel-agent build)

Connect first:
```
claude mcp add devfleet --transport http http://localhost:18801/mcp
# restart Claude Code, then re-run /devfleet
```

When connected, `plan_project` would generate roughly this DAG. Missions with no
`depends_on` start first; the rest auto-dispatch as dependencies complete.
**Default concurrency is 3**, so the fan-out waves below are sized accordingly.

```
M1  Foundation: monorepo + CI + IaC + base config         depends_on: []
M2  Auth + multi-tenancy (RLS) + RBAC                      depends_on: [M1]
M3  Data layer: Prisma schema + core entities + migrations depends_on: [M1]
        ── wave (after M2 & M3) ───────────────────────────────────────
M4  AI Use-Case Registry (CRUD, lifecycle, CSV import)     depends_on: [M2, M3]
M5  Framework/Control library + crosswalk (content-as-data)depends_on: [M3]
M6  Risk classification engine + EU AI Act questionnaire   depends_on: [M3]
        ── wave (after M4–M6) ─────────────────────────────────────────
M7  Control mapping + evidence upload (S3)                 depends_on: [M4, M5]
M8  Intake→review→approve workflow + audit trail           depends_on: [M4]
M9  Python AI service: classify + draft + suggest (Claude) depends_on: [M6]
        ── wave (after M7–M9) ─────────────────────────────────────────
M10 Readiness dashboard + gap report                       depends_on: [M5, M7]
M11 Report export (PDF/MD readiness doc)                   depends_on: [M7, M10]
M12 E2E tests (Playwright) for the full core flow          depends_on: [M8, M9, M11]
M13 Security pass: isolation tests, secret scan, SAST      depends_on: [M2, M7]
        ── production-scope missions (run alongside the core) ──────────
M14 Commercial: Stripe billing + plan tiers + usage meter  depends_on: [M2]
M15 Platform ops: Sentry + PostHog + OTel + Resend email   depends_on: [M1]
M16 AI cost controls: routing, caching, budgets, breaker   depends_on: [M9]
M17 PLG assessment surface (low-friction funnel)           depends_on: [M6, M9]
```

Critical path: **M1 → M3 → M6 → M9 → M12**. Keep M9 (AI service) unblocked early
since it gates the demo's "wow." M14–M17 add the production/commercial scope from the
hardening pass (`07-SCALING-AND-TOOLING.md`); M15 (ops) can start right after M1.

### How to drive it
1. `plan_project(prompt=<the MVP scope from 01-PRD §5 + stack lane>)`
2. Review the generated DAG against the one above; adjust.
3. `dispatch_mission(M1)`; the rest chain via `auto_dispatch`.
4. Poll `get_mission_status` / `get_dashboard`; read `get_report` per mission.
5. Resolve any merge conflicts on the mission's worktree branch.

> Note: a parallel-agent fleet is powerful but needs tight specs per mission, or
> agents drift. Each mission prompt should carry the relevant section of these
> docs as its brief. For Phase 0/1 you may get a cleaner result building the
> spine (M1–M3) yourself, then fanning out M4–M11 to the fleet.
