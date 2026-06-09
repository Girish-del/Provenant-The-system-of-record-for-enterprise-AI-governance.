# Scaling & Tooling — AI Governance Platform

> Your explicit ask: "all the necessary features and tools required to scale the
> application, treated as a production-level startup app." This doc is the complete
> tooling and capability map: what to adopt, when, and why. It resolves the "or"
> forks left open in `02-ARCHITECTURE.md` into concrete picks for the TypeScript
> monorepo lane.

## 1. The locked toolchain (TS monorepo lane)

| Concern | Pick (MVP) | Scale path | Why |
|---------|-----------|-----------|-----|
| Monorepo | Turborepo + pnpm | same | Cached builds, shared types end-to-end |
| Frontend | Next.js (App Router) + TS + Tailwind + shadcn/ui | same | Enterprise UI fast; RSC for perf |
| API | NestJS + **ts-rest** contracts | same | REST semantics for partners + end-to-end types (resolves "REST vs tRPC") |
| DB | PostgreSQL 16 + Prisma | read replicas → Citus/partitioning at scale | Relational fit; RLS isolation |
| Tenant isolation | RLS (shared schema) | schema/DB-per-tenant for large/regulated | Cheap now, escape hatch later |
| Auth | **WorkOS** (SSO/SAML/OIDC + Directory Sync/SCIM) | same | Enterprise SSO is table stakes; resolves "WorkOS vs Auth0" |
| Jobs/queue | **BullMQ** (Redis) | **Temporal** for durable approval workflows (Phase 2) | Simple now; durable orchestration later |
| Cache / rate limit | Redis (ElastiCache) or Upstash | cluster mode | Sessions, rate limits, hot reads |
| Object storage | S3 + malware scan (ClamAV/lambda) | same + Object Lock | Evidence, exports |
| Vector store | **pgvector** (in Postgres) | Turbopuffer/Pinecone if recall/scale demands | One fewer system; resolves "RAG store" |
| Full-text search | Postgres FTS | OpenSearch | Start simple |
| LLM | Anthropic Claude (Opus 4.x drafting, Haiku 4.5 classify) | + Batch API, prompt caching | Best compliance reasoning; cost tiers |
| AI service | Python (FastAPI) | same, horizontally scaled | Python AI ecosystem; isolated |
| Infra | AWS, ECS Fargate, Terraform | EKS at scale | Audit-friendly, standard |
| CI/CD | GitHub Actions | same + deploy gates | Lint/test/typecheck/migrate/deploy |
| Observability | OpenTelemetry → Datadog (or Grafana Cloud) | same | Required for reliability NFR |

## 2. Commercial plumbing (missing from the original plan — required for a SaaS)

A "commercial multi-tenant SaaS" cannot ship without these. They were absent in the
first plan; they are MVP-or-near-MVP, not Phase 4.

| Capability | Tool | When | Notes |
|-----------|------|------|-------|
| **Billing & subscriptions** | **Stripe** (Billing + metered usage) | Phase 1–2 | Meter on **governed AI systems** (matches pricing model in GTM doc); annual contracts via invoicing for enterprise |
| **Transactional email** | **Resend** (+ React Email) or Postmark | Phase 1 | Invites, approvals, reminders, digests, deadline alerts |
| **Error tracking** | **Sentry** | Phase 1 | Frontend + backend + AI service; release health |
| **Product analytics** | **PostHog** | Phase 1 | Funnels (assessment → platform), activation, retention |
| **Feature flags** | **PostHog flags** (LaunchDarkly at enterprise scale) | Phase 1 | Progressive rollout, per-tenant gating |
| **Session replay / support** | PostHog replay; Pylon/Intercom | Phase 2 | Debug enterprise issues, support inbox |
| **Customer data / CRM** | HubSpot or Attio | Phase 1 (sales) | Pipeline for design partners + sales-led expansion |
| **Status page** | Instatus or Statuspage | Phase 2 | Enterprise buyers expect one |
| **Docs / help center** | Mintlify or Docusaurus | Phase 2 | Self-serve onboarding for the PLG funnel |

## 3. AI cost & reliability controls (how AI-SaaS margins survive)

The original plan had no AI cost controls. For a Claude-heavy product this is a
margin and reliability risk. Required:

- **Model routing:** Haiku for classification/extraction/high-volume; Opus only for
  reasoning-heavy drafting and gap analysis. Confirm current model IDs/pricing via
  the `claude-api` reference at implementation time; do not hardcode from memory.
- **Prompt caching:** cache the large, stable context (framework texts, control
  library, system prompts) to cut input cost dramatically.
- **Batch API:** for non-interactive bulk jobs (portfolio re-classification, bulk
  drafting), use batch processing for lower cost.
- **Per-tenant token budgets + quotas:** enforce monthly token ceilings per plan
  tier; surface usage; alert before overage; hard-stop or meter-and-bill on breach.
- **Caching of deterministic results:** identical intake → cached classification
  (content-hash keyed) to avoid recompute.
- **Circuit breaker + fallback:** on Anthropic timeout/error, degrade gracefully
  (queue + retry, show "draft pending"), never block the core workflow.
- **Cost observability:** track tokens and $ per tenant, per feature, per model;
  dashboard it; this informs pricing tiers.

## 4. Scaling the data & compute layers

- **Postgres:** start single primary; add **read replicas** for reporting/dashboards;
  use **connection pooling** (PgBouncer/RDS Proxy); partition large append-only
  tables (audit log, AI generations) by time; consider Citus/partitioning or
  schema-per-tenant for the largest accounts.
- **Background work:** BullMQ workers autoscale on queue depth; isolate queues
  (reports, AI, discovery sync, email) so a slow job class can't starve others;
  migrate long-running multi-step approvals to **Temporal** in Phase 2 for
  durability and visibility.
- **AI service:** stateless, horizontally scaled behind an internal load balancer;
  scale on request depth/latency; separate pools for interactive vs batch.
- **Files:** S3 with lifecycle policies; CloudFront for export/download delivery;
  Object Lock for evidence immutability on high-assurance tenants.
- **Caching:** Redis for sessions, rate limits, hot config (the content-as-data
  framework/control library), and computed readiness rollups.
- **Search/reporting at scale:** move heavy aggregations to read replicas or a small
  analytics store (the dashboards are read-heavy); OpenSearch when Postgres FTS
  stops being enough.

## 5. Multi-region & data residency (EU is a hard buyer requirement)

- **Region-pinned deployments** (EU and US) from the start: separate DB, S3, and
  inference routing per region. A tenant is created in a region and stays there.
- Keep the data-access layer region-aware so residency is a routing concern.
- Inference residency: route EU-tenant prompts to an EU-eligible inference path or
  carve it out contractually; make inference region a tenant config (see
  `05-SECURITY §6`).
- Global control-plane (marketing site, billing) can be central; the **data plane**
  is regional.

## 6. Reliability & operations

- **SLOs:** 99.9% availability; p95 < 300ms core reads; error budget tracked.
- **Observability:** OpenTelemetry traces/metrics/logs with `tenant_id + request_id`
  correlation; dashboards + alerts in Datadog/Grafana; synthetic checks on the core
  flow.
- **On-call & incidents:** PagerDuty/Opsgenie; runbooks; severity ladder; postmortems.
- **DR:** automated encrypted backups, tested restores, RPO ≤ 1h / RTO ≤ 4h, quarterly
  restore drills; multi-AZ; IaC enables region rebuild.
- **Performance:** async all heavy work (reports, AI, exports); paginate; cache
  rollups; load-test the dashboard and report-generation paths before enterprise GA.

## 7. Developer experience & quality at scale

- **CI gates:** typecheck, lint (ESLint + Prettier), unit + integration + isolation
  + E2E (Playwright), build, migration check, secret scan, SCA, container scan.
- **Preview environments:** per-PR ephemeral deploys for design/QA review.
- **Test data:** seed scripts + factories per tenant; never use prod data in dev.
- **Code health:** 80%+ coverage (org standard), always-on tenant-isolation suite,
  AI eval suite as a CI gate, dependency auto-updates (Renovate).
- **Migrations:** Prisma migrate, reviewed, reversible, backup-gated in CI.
- **Docs as code:** ADRs for architecture decisions; this `docs/` set is the source
  of truth; keep it updated post-ship (`/document-release`).

## 8. Adoption timeline (don't boil the ocean)

| Phase | Add these tools |
|-------|----------------|
| **Phase 0–1 (MVP)** | Turborepo, Next.js, NestJS+ts-rest, Postgres+Prisma+RLS+pgvector, WorkOS, BullMQ+Redis, S3+scan, Claude, Stripe, Resend, Sentry, PostHog, GitHub Actions, Terraform, ECS Fargate, OTel→Datadog, Vanta, gitleaks |
| **Phase 2** | Temporal, Instatus status page, help center, session replay, read replicas, CRM maturity, AI batch/caching hardening |
| **Phase 3** | Discovery connectors + egress proxy, monitoring ingestion, OpenSearch (if needed), EU region GA groundwork |
| **Phase 4** | EKS, schema-per-tenant option, multi-region GA, ABAC, white-label, marketplace, advanced analytics/warehouse |

## 9. Cost posture (early-stage reality)

- Biggest variable cost is **Claude usage**; control it with §3 (routing, caching,
  budgets). Model it per tenant tier so pricing covers it.
- Use managed services (RDS, ElastiCache, Fargate, WorkOS, Stripe) over self-hosting
  early; engineering time is the scarce resource. Revisit self-hosting only when a
  line item dominates.
- Vanta/observability/Sentry/PostHog have startup tiers; adopt early, they pay for
  themselves in deal-velocity and uptime.

## 10. The "must add before calling it production" checklist

- [ ] Billing (Stripe) wired to plan tiers + usage metering
- [ ] Transactional email (Resend) for the full notification set
- [ ] Error tracking (Sentry) across all services
- [ ] Product analytics + feature flags (PostHog)
- [ ] AI token budgets, prompt caching, model routing, circuit breaker
- [ ] Per-tenant cost observability dashboard
- [ ] Multi-AZ, backups + tested restore, status page
- [ ] WAF + rate limiting + secret scanning + dependency/container scanning in CI
- [ ] OpenTelemetry tracing with tenant/request correlation + alerting
- [ ] Vanta SOC 2 program live with control owners assigned
