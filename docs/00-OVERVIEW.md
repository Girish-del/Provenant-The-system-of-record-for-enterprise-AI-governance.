# AI Governance Platform — Plan Overview

> **Status:** Planning — build-ready. Stack lane locked (TypeScript monorepo);
> CEO/Eng/Security/Design hardening pass complete. Ready to scaffold M1.
> **Date:** 2026-06-07 (hardened 2026-06-08)
> **Type:** Commercial, enterprise multi-tenant SaaS
> **Working title:** _Provenant_ (placeholder — see naming note below)

This folder contains the comprehensive plan produced from a multi-lens planning
pass (Product / Architecture / Security & Compliance / Go-to-Market), then a
hardening pass (CEO + Eng + Security + Design lenses) that locked decisions and
added the build-ready engineering spec. Read in this order:

| Doc | What it covers |
|-----|----------------|
| `00-OVERVIEW.md` (this file) | Executive summary, the wedge, locked decisions |
| `01-PRD.md` | Problem, users, jobs-to-be-done, scope, MVP cut, requirements |
| `02-ARCHITECTURE.md` | Tech stack (locked), system design, data model, multi-tenancy |
| `03-ROADMAP.md` | Phased delivery plan + the DevFleet mission DAG to build it |
| `04-GTM-AND-RISKS.md` | Market, competition, pricing, GTM motion, risk register |
| `05-SECURITY-AND-THREAT-MODEL.md` | STRIDE, tenant isolation, audit integrity, AI/data security, SOC 2 program |
| `06-DESIGN-SYSTEM.md` | Aesthetic, IA, key screens, interaction patterns, WCAG 2.2 AA |
| `07-SCALING-AND-TOOLING.md` | Full tooling map, commercial plumbing, AI cost controls, scale path |
| `08-ENGINEERING-FOUNDATIONS.md` | Repo structure, conventions, build-ready M1–M3 spec, CI/CD, where to start |

---

## Executive summary

Enterprises are adopting AI faster than they can govern it. Three forces are
converging in 2026:

1. **Regulation is now enforceable, not theoretical.**
   - **EU AI Act** entered force Aug 2024. Prohibited practices applied Feb 2025;
     GPAI obligations Aug 2025; **the large high-risk wave applies 2 Aug 2026**
     (≈2 months from today). Penalties reach up to €35M / 7% of global turnover.
   - **ISO/IEC 42001:2023** (AI Management System) is becoming the certification
     buyers ask for — the "SOC 2 of AI."
   - **NIST AI RMF 1.0** + Generative AI Profile is the de-facto US baseline;
     **Colorado AI Act** and other US state laws land in 2026.
2. **Shadow AI is everywhere.** Business units adopt GenAI tools and embed LLM
   APIs with no inventory, no risk review, and no audit trail. Boards and CISOs
   can't answer "what AI are we running and is it safe/legal?"
3. **Existing tooling is fragmented.** GRC suites bolt on AI modules; ML
   observability tools watch models but ignore policy/compliance; spreadsheets
   do the rest.

**The product:** a single system of record for an organization's AI — discover
every AI/LLM use case, classify its risk, map it to the controls each framework
requires, collect evidence, run review/approval workflows, and produce
audit- and regulator-ready documentation. AI-assisted throughout (drafts
impact assessments, suggests control mappings, answers regulatory questions).

## The wedge (how a startup wins a crowded market)

Do **not** launch as a broad "AI GRC suite" — incumbents (Credo AI, Holistic AI,
IBM watsonx.governance, OneTrust, Microsoft Purview) already occupy that framing.
Enter through a sharp, time-boxed pain:

> **"EU AI Act readiness in 30 days."** A guided assessment that inventories AI
> use cases, classifies each against EU AI Act risk tiers, produces a gap report
> and the required technical documentation, and tracks remediation to the
> 2 Aug 2026 deadline.

This wedge is: (a) urgent (hard regulatory deadline), (b) self-serve as top of
funnel (PLG assessment) that expands into the full platform (sales-led), and
(c) a natural on-ramp to ISO 42001 certification support and continuous
assurance — the recurring-revenue core.

## What makes it defensible over time

- **Deep integration with the AI stack**, not just questionnaires: connectors to
  model registries (MLflow, SageMaker, Databricks, Azure ML), LLM-usage discovery
  (gateway/proxy logs, cloud billing), and CI/CD — so the inventory is *live*,
  not a stale spreadsheet.
- **A maintained control & framework library** (EU AI Act ⇄ NIST AI RMF ⇄ ISO
  42001 ⇄ sector rules) with crosswalks, so one piece of evidence satisfies many
  obligations. This is hard to build and a moat once trusted.
- **AI-native workflows** (Claude-powered drafting, mapping, and Q&A) that make a
  3-week compliance exercise a 3-day one.

## Locked decisions (this hardening pass)

1. **Stack lane: TypeScript monorepo** — Turborepo + pnpm, Next.js (App Router) +
   NestJS (+ **ts-rest** contracts) + Postgres/Prisma with RLS, plus a small Python
   FastAPI AI service. Auth = **WorkOS**; jobs = **BullMQ** now → **Temporal** at
   Phase 2; vectors = **pgvector**. Full rationale + the resolved forks in
   `02-ARCHITECTURE.md §1` and `07-SCALING-AND-TOOLING.md §1`.
2. **Wedge: EU AI Act readiness** (default) — the 2 Aug 2026 deadline is the wedge.
   Revisit only to pivot to a regulated vertical.
3. **Production scope expanded** — commercial plumbing (billing, email, error
   tracking, analytics, feature flags) and AI cost controls are now in scope from
   Phase 1, not deferred. See `07-SCALING-AND-TOOLING.md §2–3`.
4. **Build the spine yourself, then fan out** — engineer M1–M3 directly
   (`08-ENGINEERING-FOUNDATIONS.md §6`), then dispatch M4–M11 to the agent fleet.

## Still owned by you (not code-blocking, but real)

- **Brand name** — resolve the "Provenant" placeholder before public surfaces, domains,
  and trademark (the space is crowded; see naming note).
- **Design partners** — line up 3–5 EU-exposed companies to co-build. Nothing
  de-risks this faster.
- **Compliance advisor** — recruit a privacy/AI-risk lawyer or ex-regulator. Buyers
  will not trust a governance vendor that lacks one. This is a hire, not a feature.
- **Connect DevFleet** for the parallel build:
  `claude mcp add devfleet --transport http http://localhost:18801/mcp` then restart.
  The mission DAG is in `03-ROADMAP.md`.

## Naming note

"Provenant" is a placeholder. Before committing, check trademark + domain; the space
is crowded (Credo, Holistic, Saidot, Monitaur, Trustible, Fairly). Pick something
that signals *trust + system of record*, not just "AI."
