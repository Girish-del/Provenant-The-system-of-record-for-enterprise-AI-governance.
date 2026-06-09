# Architecture — AI Governance Platform

> Companion to `01-PRD.md`. Covers stack choice, system design, data model,
> multi-tenancy, security, and the AI-assist subsystem.

## 1. Stack decision — LOCKED: TypeScript monorepo + one Python service

This lane is decided (see `00-OVERVIEW.md` → Locked decisions). Every "or" from the
first draft is resolved below; `07-SCALING-AND-TOOLING.md §1` is the full toolchain
table with the scale path.

| Layer | Choice (locked) | Why |
|-------|--------|-----|
| Monorepo | Turborepo + pnpm | One repo, shared types end-to-end |
| Frontend | Next.js (App Router) + TypeScript + Tailwind + shadcn/ui | Fast, enterprise-grade UI; you already know Next.js |
| API | NestJS + **ts-rest** contracts | Resolves "REST vs tRPC": REST semantics (good for partners/public API + OpenAPI) **with** end-to-end TS types. Contracts live in `packages/contracts` |
| DB | PostgreSQL 16 + Prisma | Relational data (use cases ⇄ controls ⇄ evidence) fits Postgres; RLS for tenant isolation |
| Auth | **WorkOS** (SSO/SAML/OIDC + Directory Sync/SCIM) | Resolves "WorkOS vs Auth0": better enterprise SSO + SCIM story and pricing; don't hand-roll |
| Jobs/workflow | **BullMQ** (Redis) now → **Temporal** at Phase 2 | Resolves "Temporal or BullMQ": BullMQ ships the MVP; migrate long-running approvals to Temporal when durability/visibility matters |
| Vector store | **pgvector** (in Postgres) | Resolves "RAG store": one fewer system for RAG over framework texts; escalate to Turbopuffer/Pinecone only if recall/scale demands |
| Cache / rate limit | Redis (ElastiCache / Upstash) | Sessions, rate limits, hot config, computed rollups |
| Object storage | S3 (+ malware scan, Object Lock for high-assurance) | Evidence files, exports |
| AI service | **Python (FastAPI)** | AI/eval/integration ecosystem is Python-first; isolates AI from core API |
| LLM | **Anthropic Claude API** (Opus 4.x for drafting/reasoning, Haiku for cheap classification) | Best reasoning for compliance drafting; see model notes below + cost controls in `07 §3` |
| Search | Postgres FTS → OpenSearch later | Start simple |
| Infra | AWS, containers on ECS Fargate (→ EKS at scale), Terraform IaC | Standard, audit-friendly |
| CI/CD | GitHub Actions | Lint, test, typecheck, migrate, deploy |
| Observability | OpenTelemetry → Datadog/Grafana | Required for the reliability NFR |
| Commercial | Stripe (billing), Resend (email), Sentry (errors), PostHog (analytics + flags) | A commercial SaaS needs these from Phase 1 — see `07 §2` |

**Why not the Python-first lane:** Next.js + FastAPI + SQLModel keeps one backend
language but loses end-to-end TS types and NestJS's batteries-included
RBAC/module/guards structure. For an enterprise app with a heavy typed UI surface,
the TS lane's type safety across the web↔api boundary (via ts-rest) wins. The Python
service stays scoped to AI/eval/integration work, where Python's ecosystem is the
right tool.

## 2. System design (high level)

```
                         ┌─────────────────────────┐
        Browser ────────▶│  Next.js (App Router)    │  SSR/RSC + client islands
                         └───────────┬──────────────┘
                                     │  authenticated API calls (ts-rest, typed)
                         ┌───────────▼──────────────┐
                         │  NestJS Core API          │  RBAC, multi-tenancy (RLS),
                         │  - Registry  - Risk        │  workflows, evidence, reports
                         │  - Controls  - Workflow    │
                         └───┬───────────┬───────┬───┘
                             │           │       │
            ┌────────────────▼──┐   ┌────▼────┐  │ async jobs
            │ PostgreSQL (RLS)  │   │   S3     │  │
            │ tenant-scoped     │   │ evidence │  ▼
            └───────────────────┘   └─────────┘ ┌──────────────┐
                                                 │ Temporal/Bull│ reminders,
                                                 │  workers      │ report gen,
                                                 └──────┬───────┘ discovery sync
                                                        │
                                          ┌─────────────▼─────────────┐
                                          │ Python AI Service (FastAPI)│
                                          │  - classify risk           │
                                          │  - draft FRIA/DPIA/tech doc │
                                          │  - suggest control mappings │
                                          │  - RAG regulatory Q&A       │
                                          └─────────────┬─────────────┘
                                                        │
                                          ┌─────────────▼─────────────┐
                                          │   Anthropic Claude API     │
                                          └────────────────────────────┘

  Integrations (Phase 3+): MLflow / SageMaker / Databricks / Azure ML /
  LLM gateway logs / cloud billing → discovery → Registry
```

## 3. Multi-tenancy

- **Model:** shared database, shared schema, `tenant_id` on every row, enforced by
  **PostgreSQL Row-Level Security**. Set `app.tenant_id` per request; policies
  filter automatically. Cheapest to operate, strong isolation when RLS is correct.
- **Escalation path:** large/regulated tenants → schema-per-tenant or dedicated DB
  (for data residency / isolation guarantees). Design the data-access layer so this
  is a deployment concern, not a rewrite.
- **Residency:** region-pinned deployments (EU vs US) from the start — EU buyers
  will require it.

## 4. Core data model (entities)

```
Organization (tenant)
 ├─ User ─< Membership >─ Role (Admin/Contributor/Reviewer/Viewer)
 ├─ AISystem / UseCase   (lifecycle: proposed→review→approved→production→retired)
 │    ├─ Model           (name, version, provider, type: internal/foundation/vendor)
 │    ├─ Dataset         (source, PII flags, lineage)
 │    └─ RiskAssessment  (framework, answers, computed tier, rationale, reviewer)
 ├─ Framework            (EU AI Act, NIST AI RMF, ISO 42001 …) [versioned content]
 │    └─ Control         (id, text, category) ──< ControlCrosswalk >── Control
 ├─ ControlMapping       (UseCase ⇄ Control, status, owner, due date)
 │    └─ Evidence        (file/link, attested_by, timestamp) → S3
 ├─ Policy               (text, version, linked controls, attestations)
 ├─ Workflow / Task      (intake, review, approval; assignee, SLA, state)
 ├─ Approval             (decision, approver, timestamp, comment)
 ├─ Incident             (post-market monitoring; severity, status)   [Phase 3]
 ├─ Vendor               (third-party AI risk)                        [Phase 3]
 ├─ Report               (generated artifact: readiness, audit pack)
 └─ AuditLog             (actor, action, target, before/after, ts) [append-only]
```

**Content-as-data principle:** frameworks, controls, crosswalks, and questionnaire
definitions are *data*, versioned in the DB and updatable without a code deploy.
This is what lets you keep pace with regulation — a core moat.

## 5. AI-assist subsystem

- **Tasks:** (a) risk classification from intake answers, (b) draft impact
  assessments / technical documentation, (c) suggest control mappings, (d) RAG Q&A
  over framework texts.
- **Model routing:** Claude **Haiku** for cheap/high-volume classification &
  extraction; Claude **Opus** for reasoning-heavy drafting and gap analysis.
  (Confirm exact current model IDs/pricing via the `claude-api` reference before
  implementing — do not hardcode from memory.)
- **RAG:** embed framework texts + the org's policies; retrieve + cite. Every
  answer shows sources.
- **Guardrails (non-negotiable for a governance product):**
  - All AI output is **draft/assist**, clearly labeled, never auto-attested.
  - Log model, version, prompt, and sources for every generation (auditability).
  - Human-in-the-loop approval before any AI-drafted artifact becomes evidence.
  - Keep tenant data out of training; use enterprise API terms; PII handling per
    residency rules.
  - The product must be able to govern *itself* — dogfood your own controls.

## 6. Security & compliance posture (the product is trust)

> Full threat model (STRIDE), tenant-isolation verification, audit-log hash-chaining,
> AI/data security, and the SOC 2 program are in `05-SECURITY-AND-THREAT-MODEL.md`.
> Summary below.

- Encryption in transit (TLS 1.2+) and at rest (KMS).
- Tenant isolation via RLS, verified with automated tests on every PR.
- RBAC now; ABAC later for field-level control.
- Secrets in AWS Secrets Manager / Vault; **zero secrets in code** (CI secret scan).
- Append-only audit log; tamper-evident (hash-chained) for high-assurance tenants.
- SOC 2 Type II program from day one (Vanta/Drata); ISO 27001 + 42001 to follow.
- Dependency + container scanning, SAST/DAST in CI; least-privilege IAM.
- Data deletion / export for DSAR/GDPR; configurable retention.

## 7. Environments & delivery

- `dev` → `staging` → `prod`, IaC-managed, identical topology.
- DB migrations gated in CI; reversible; never destructive without a backup step.
- Feature flags for progressive rollout.
- Observability: traces/metrics/logs with tenant + request correlation.

## 8. Testing strategy (ties to org standards: 80%+ coverage)

- **Unit:** domain logic (risk scoring, crosswalk resolution, RBAC checks).
- **Integration:** API + DB with RLS assertions (a tenant can *never* read another's
  rows — this is a dedicated, always-on test suite).
- **E2E (Playwright):** the critical flow — intake → classify → map controls →
  upload evidence → approve → export readiness report.
- **AI evals:** golden-set tests for classification accuracy and drafting quality;
  regression-guard prompts.
