# Product Requirements — AI Governance Platform

> Scope: commercial, multi-tenant enterprise SaaS. This PRD defines the problem,
> users, capabilities, the MVP cut, and non-functional requirements. Architecture
> lives in `02-ARCHITECTURE.md`; sequencing in `03-ROADMAP.md`.

## 1. Problem statement

Organizations cannot answer three questions with confidence:
1. **What AI are we using?** (models, GenAI apps, embedded LLM features, vendor AI)
2. **Is each use case safe and legal?** (risk tier, bias/safety, required controls)
3. **Can we prove it?** (evidence, documentation, audit trail, regulator-ready)

The cost of getting this wrong is now concrete: EU AI Act fines, blocked
deployments, failed audits, reputational and board-level risk, and stalled AI
programs because legal/risk won't sign off.

## 2. Target users & buyers

**Economic buyer:** Chief AI Officer / Chief Risk Officer / CISO / Chief Privacy
Officer. **Champion:** Head of AI Governance, AI Risk Lead, or DPO.

| Persona | Goal | Pain today |
|---------|------|-----------|
| AI Risk / Governance Lead | Inventory + assess + report on all AI | Spreadsheets, no single source of truth |
| Legal / Privacy (DPO) | Ensure lawful, documented AI; DPIAs/FRIAs | Manual, can't keep up with use cases |
| CISO / Security | Visibility + control over AI risk surface | Shadow AI, no monitoring |
| ML / Data Science lead | Ship models without compliance bottleneck | Slow, opaque approval process |
| Compliance / Audit | Evidence + readiness for audits/certification | Evidence scattered; audits are fire drills |
| Executive / Board | Portfolio risk posture in one view | No reliable reporting |

## 3. Jobs-to-be-done

- "When a team wants to launch an AI use case, **intake and triage it** so risk is
  assessed before it ships."
- "Maintain a **live inventory** of every AI system, model, and dataset."
- "**Classify risk** per framework (EU AI Act tiers, NIST, internal policy)."
- "Map each use case to the **controls required** and track their implementation."
- "**Collect evidence** and generate **audit-/regulator-ready documentation**."
- "Run **multi-stakeholder review and approval** with a clear audit trail."
- "**Monitor** deployed AI for drift, bias, incidents (post-market monitoring)."
- "**Report** portfolio risk to executives, auditors, and regulators."

## 4. Capability map

### Core (defines the product)
1. **AI Inventory / Registry** — central catalog of AI systems, use cases, models,
   datasets, and vendor AI. Manual entry + connector-based discovery. Lifecycle
   state (proposed → in review → approved → in production → retired).
2. **Risk Assessment & Classification** — configurable questionnaires; auto-tiering
   against EU AI Act (prohibited / high-risk / limited / minimal), NIST AI RMF
   functions, and internal policy. Impact assessments: DPIA, FRIA (Fundamental
   Rights Impact Assessment), model risk.
3. **Framework & Control Library** — curated, versioned content for EU AI Act,
   NIST AI RMF (+ GenAI profile), ISO/IEC 42001, with **crosswalks** so one
   control/evidence satisfies multiple frameworks. Custom controls supported.
4. **Policy Management** — author org AI policies, link to controls, version,
   acknowledge/attest.
5. **Compliance & Evidence** — attach evidence to controls; readiness dashboards;
   gap analysis; export audit packages; ISO 42001 certification support.
6. **Workflows & Approvals** — configurable intake forms, review routing, approval
   gates tied to lifecycle stages, RACI, SLAs, reminders.
7. **Reporting & Dashboards** — exec/board summaries, risk register, framework
   readiness %, regulator-facing technical documentation export.
8. **Audit trail** — immutable, queryable log of every material change.

### Differentiators (build after core proves out)
9. **Discovery connectors** — MLflow, SageMaker, Databricks, Azure ML, OpenAI/
   Anthropic usage, LLM gateway logs, cloud billing → live inventory; "shadow AI"
   surfacing.
10. **Continuous monitoring hooks** — ingest drift/bias/performance signals from
    observability tools (Fiddler, Arize, Evidently) and model registries; incident
    register; post-market monitoring reports (EU AI Act requirement).
11. **Vendor / third-party AI risk** — assess external AI vendors and models
    (incl. foundation-model providers); track their conformity.
12. **AI assistant (Claude-powered)** — draft FRIAs/DPIAs/technical docs from
    use-case data; suggest control mappings; gap analysis from uploaded documents;
    RAG-based regulatory Q&A grounded in framework texts. **All AI output is
    drafting/assist only, human-reviewed — never auto-attested.**

## 5. MVP cut (what ships first)

The MVP **is** the wedge: _EU AI Act readiness_. Ruthlessly scoped.

**In:**
- Multi-tenant auth (email + SSO-ready), org/workspace, RBAC (Admin, Contributor,
  Reviewer, Viewer).
- AI Use-Case registry (manual entry, CSV import) with lifecycle states.
- EU AI Act risk-classification questionnaire → auto risk tier + rationale.
- EU AI Act + NIST AI RMF control library with a starter crosswalk.
- Control mapping per use case; evidence upload; readiness dashboard + gap report.
- Intake → review → approve workflow (single configurable path).
- Audit trail.
- AI-assist v1: draft a use-case risk summary + suggested controls from intake
  answers (Claude).
- Export: PDF/Markdown "EU AI Act Readiness Report" per use case + portfolio.
- **PLG assessment surface:** a low-friction "EU AI Act Readiness Assessment" that
  produces a real gap report (top of funnel; distinct UX — see `06-DESIGN-SYSTEM §5`).
- **Commercial plumbing (a commercial SaaS needs these, not optional):** billing +
  plan tiers metered on governed AI systems (Stripe); transactional email for
  invites/approvals/reminders/deadline alerts (Resend); error tracking (Sentry);
  product analytics + feature flags (PostHog). See `07-SCALING-AND-TOOLING §2`.
- **AI cost controls:** model routing, prompt caching, per-tenant token budgets,
  circuit breaker (see `07 §3`) — required so AI usage doesn't sink margins.

**Explicitly out of MVP (Phase 2+):** live discovery connectors, monitoring
ingestion, vendor risk, ISO 42001 full module, custom framework authoring,
marketplace, SCIM, fine-grained ABAC, white-label.

**MVP success = ** a design partner runs a real AI use case through intake →
classification → gap report → exported readiness doc, and says it replaced their
spreadsheet.

## 6. Non-functional requirements

- **Security:** encryption in transit + at rest; tenant isolation (RLS); audit
  logging; least-privilege RBAC; secrets in a managed vault; SOC 2 Type II path
  from day one (Vanta/Drata). This product *sells trust* — security is the product.
- **Privacy/data residency:** EU buyers will demand EU data residency; design for
  region pinning early (don't hard-block it later).
- **Reliability:** 99.9% target; backups + tested restore; RPO ≤ 1h, RTO ≤ 4h.
- **Auditability:** every material change attributable, timestamped, immutable.
- **Performance:** sub-300ms p95 for core reads; async for long jobs/reports.
- **Accessibility:** WCAG 2.2 AA (enterprise procurement checklists require it).
- **Extensibility:** framework/control content versioned and updatable without a
  code deploy (content as data).
- **Auditable AI:** any AI-generated content is labeled, sourced, and logged;
  model/version recorded; no AI output is treated as authoritative evidence.

## 7. Out of scope (product boundaries)

- Not a model-training or MLOps platform.
- Not a deep ML observability tool (we *integrate* with those, not replace them).
- Not a general enterprise GRC suite (we may integrate with ServiceNow/Archer).

## 8. Key open questions

**Resolved in the hardening pass:**
- ~~Stack lane~~ → TypeScript monorepo (`02-ARCHITECTURE §1`).
- ~~Wedge confirmation~~ → EU AI Act readiness first (revisit only to pivot vertical).

**Still open (validate with design partners / advisor):**
- Buyer's existing GRC tool — integrate or displace? (informs Phase 2 integrations)
- Build vs license the regulatory content library (partner for legal text vs author
  in-house)? Affects content moat economics — decide before Phase 2.
- EU data residency at launch vs fast-follow? (`07-SCALING-AND-TOOLING §5` has the
  region-pinned design; the question is timing for the first EU deal.)
- Pricing specifics — see `04-GTM-AND-RISKS §4` for the hardened model; validate the
  numbers with the first 3–5 partners.
