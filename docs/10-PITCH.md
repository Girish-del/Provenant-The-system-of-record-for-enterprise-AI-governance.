# Provenant: Investor Pitch

> **Status:** Pre-seed pitch document. Audience: investors and sponsors reading cold.
> "Provenant" is a working title; naming is an open item (see Asks).
> Companion docs: `01-PRD.md` (product), `04-GTM-AND-RISKS.md` (market), `BUILD-LOG.md` (what is built).

## The hook

Every enterprise will soon be asked to prove its AI is legal. Provenant is where the proof lives.

## The problem

On 2 August 2026, the high-risk obligations of the EU AI Act apply. That is weeks away. Penalties reach EUR 35M or 7% of global turnover, whichever is higher. This is not a future-regulation story; prohibited-practice rules have applied since February 2025, general-purpose AI rules since August 2025, and the big wave lands this summer.

Against that deadline, most enterprises cannot answer three questions:

1. **What AI are we running?** Business units adopt GenAI tools and embed LLM APIs with no inventory. Boards and CISOs literally do not have the list.
2. **Is each use case legal?** Risk tiering under the EU AI Act is mandatory for systems sold into or used in Europe, and almost nobody has done it systematically.
3. **Can we prove it?** Regulators and auditors want documentation, evidence, and a trail of who approved what and when. Today that lives in spreadsheets and email threads, when it exists at all.

The cost of getting this wrong is concrete: fines, blocked deployments, failed audits, and AI programs stalled because legal will not sign off. Governance is now the bottleneck on enterprise AI adoption, and the tooling for it is spreadsheets, generic GRC suites with an AI module bolted on, or six-month enterprise deployments.

## The solution

Provenant is a system of record for an organization's AI. One place that holds the inventory, the risk classification, the controls, the evidence, the approvals, and the export a regulator or auditor can read.

The golden path, in plain words:

1. **Register** an AI use case (a hiring screener, a support chatbot, a fraud model). Manual entry or CSV import.
2. **Classify** it with a guided EU AI Act questionnaire. The engine returns the risk tier (Prohibited, High, Limited, Minimal) with the rationale written down, not just a label.
3. **Map controls.** The platform suggests the controls that tier requires, drawn from a curated EU AI Act and NIST AI RMF library with crosswalks between them, so one piece of evidence can satisfy multiple frameworks.
4. **Attach evidence.** Files are hashed, malware-scanned, and stored. A readiness percentage and a gap report update live: this control is implemented with clean evidence, these four are missing.
5. **Review and approve.** Submit for review, a reviewer approves or rejects, the lifecycle state advances, and every step lands in an append-only, hash-chained audit log. Tamper with a row and verification fails and says exactly where.
6. **Export** an EU AI Act Readiness Report in Markdown or JSON, per use case or across the portfolio.

Claude assists throughout: drafting risk summaries and impact assessments, suggesting control mappings. Every AI output is labeled, sourced, and logged as advisory. A human approves; the machine never attests.

## Why now

Three forces converge in 2026 and none of them reverse:

- **The deadline is real.** 2 August 2026 is written into law. ISO/IEC 42001 is becoming the certification buyers ask vendors for, the SOC 2 of AI. NIST AI RMF is the US baseline and state laws (Colorado first) land this year. Boards now treat AI risk as a named risk category.
- **Shadow AI is everywhere.** The gap between AI adopted and AI governed has never been wider, and it widens every quarter.
- **The category is crowded but unconsolidated.** No default winner exists. The vendor who becomes the system of record first gets the stickiest seat in enterprise software, because nobody migrates their audit trail.

A regulatory deadline is the rare forcing function that compresses enterprise sales cycles. We built the product to catch it.

## Product proof: what exists today

We are honest about exactly where we are. This is working software, pre-revenue, with zero customers. Here is what is verifiably built and running:

- **The full golden path works end to end.** A Playwright E2E suite drives register, classify, map, upload evidence, approve, and export against a real Postgres database and S3-compatible storage on every CI run. This is not a demo script; it is the test gate.
- **Multi-tenant security is built in, not promised.** Postgres Row-Level Security is forced on all 14 tenant-scoped tables, the app connects as a non-superuser role, and a dedicated cross-tenant isolation suite (9 tests) blocks CI if isolation ever regresses. The audit log is append-only and hash-chained; the database role cannot update or delete audit rows even if the application is compromised.
- **The stack is production-shaped.** Turborepo monorepo: Next.js 15 web console styled to a real design system, NestJS API with RBAC (Admin, Contributor, Reviewer, Viewer), rate limiting and security headers, and a Python FastAPI AI service with both a mock provider and a live Claude provider. 45 core unit tests, 18 AI service tests, 7 API integration tests, all green in GitHub Actions.
- **The commercial plumbing is wired.** Plan tiers metered on governed AI systems, with hard cap enforcement (the 4th system on a free plan returns HTTP 402), Stripe checkout and webhook handling behind test-key placeholders, Google SSO via WorkOS behind key placeholders, and Sentry, PostHog, and Resend integrations that no-op until keys are set.
- **AI unit economics are engineered already.** Per-org daily token budgets, response caching, a circuit breaker, and per-task model routing (Sonnet for drafting, Haiku for suggestions), so AI assist does not sink margins at scale.
- **The PLG funnel exists.** A public, rate-limited `/assess` page runs the EU AI Act questionnaire for anyone, shows their risk tier and obligations, and converts via email capture straight into a workspace with the assessment already saved.

What is not done, equally plainly: no cloud deployment yet (it runs on Docker Compose locally; Terraform is the next milestone), third-party integrations run on mock or test-key mode pending real credentials, the framework content library is a curated starter set rather than full regulatory text coverage, and the name is a placeholder. There are no users beyond us. The distance between here and a first paying customer is deployment, content depth, and design partners, not core engineering.

## Market and competition

The spend behind this is the convergence of GRC software, privacy tech, and AI/ML operations budgets, pulled forward by a statutory deadline. Every company with AI exposure in the EU market is in scope, and "AI exposure" now describes most of the enterprise.

| Competitor | Their angle | Where we differ |
|---|---|---|
| **Credo AI** | Pure-play AI governance, policy packs, enterprise sales | EU-AI-Act-first wedge with a hard deadline, not a broad policy suite; self-serve entry instead of demo-gated |
| **Holistic AI** | AI risk management plus audits, services-heavy | Product-led, days-not-months to value; software margins, not consulting margins |
| **OneTrust** | Privacy/GRC giant adding an AI module | Purpose-built for AI governance; AI-native UX; we move at startup speed against a bolt-on |
| **IBM watsonx.governance** | Governance bundled with the IBM stack | Cloud-neutral and stack-neutral; governs AI wherever it runs, not just on one vendor's platform |

Our wedge, concretely: **EU AI Act readiness first** (the urgent, time-boxed pain), **AI-native UX** (Claude drafts the documents the law requires, humans approve), **deployment in days, not months** (self-serve workspace, no implementation project), and a **PLG assessment funnel** none of the incumbents run, because their motion is sales-led from the first click.

Incumbents are broad and slow. We are narrow, fast, and deep. That is how a startup enters a crowded category.

## Business model

Pricing meters on **governed AI systems**, the axis that tracks customer value. Per-seat is wrong for governance: it touches many occasional stakeholders, and seat pricing punishes exactly the broad adoption we want.

| Plan | Price | Governed systems |
|---|---|---|
| Free | $0 | 3 |
| Team | $499/mo | 25 |
| Business | $1,499/mo | 100 |
| Enterprise | Custom | Unlimited, plus residency, SSO/SCIM, SLA |

The motion: land free via the `/assess` funnel or a free workspace, hit the 3-system cap as the inventory grows (the cap enforcement is already live in the product), upgrade self-serve to Team, and expand by business unit toward Business and Enterprise. The meter rises automatically as the customer's AI program grows, which is the only direction AI programs move. These price points are hypotheses to validate with the first design partners; the metering mechanism is built and tested.

## Go-to-market

- **Top of funnel:** the free EU AI Act readiness assessment. It produces a real gap report, captures the use case data, and creates urgency in one sitting. Content on the EU AI Act and ISO 42001 feeds it (the deadline makes this a high-intent search category right now).
- **Conversion:** assessment to workspace is one email field, already built.
- **Expansion:** sales-assisted upgrades as system counts and stakeholder counts grow. Land one business unit, expand across the portfolio. Net revenue retention is the metric; governance is sticky once it is the system of record.
- **Channels:** partnerships with audit and consulting firms and law firms who need a tool to deliver EU AI Act work on, and a published control crosswalk as a lead magnet that doubles as a credibility signal.

## The moat

- **Content as data.** The framework library (EU AI Act, NIST AI RMF, crosswalks, ISO 42001 next) is versioned data, updatable without a code deploy. Maintained, trusted regulatory crosswalks are slow to build and slow for competitors to copy, and they compound: every framework added multiplies the value of existing evidence.
- **The audit trail is the switching cost.** Once approvals, evidence, and the hash-chained history live in Provenant, leaving means abandoning or laboriously exporting the very record the customer bought the product to keep. Systems of record do not churn.
- **PLG data.** Every assessment teaches us what enterprises actually run and where they fail readiness, which sharpens the questionnaire, the content, and eventually the benchmark data nobody else has.

## Honest risks

- **Crowded market.** Real, well-funded competitors. Our answer is the wedge and speed, and a vertical pivot if needed. We are not pretending to out-enterprise OneTrust on day one.
- **Credibility gap.** Buyers in the trust business distrust new vendors. We need a compliance advisor with regulatory weight and an early SOC 2 path. This is a hire and a process, not a feature.
- **Regulatory drift.** Guidance under the Act will keep moving. Content-as-data is the design answer; an advisor and update discipline are the operational one.
- **Wrong AI guidance is existential.** An AI assistant that mis-states compliance obligations would kill us. That is why every output is advisory, labeled, sourced, logged, and human-approved, enforced in the architecture, not the marketing.
- **Stage risk.** Pre-revenue, no customers, single-builder velocity so far. The mitigations are the asks below.

## The asks

1. **3 to 5 design partners** with EU exposure, on paid pilots at founder pricing in exchange for co-building and a reference. A paid pilot is the demand signal; we will not give it away.
2. **A compliance advisor**: a privacy or AI-risk lawyer, or an ex-regulator, on the advisory board before public launch.
3. **Pre-seed capital** for roughly 12 months: first cloud deployment (EU region) and SOC 2 program, regulatory content depth (license or author the full framework texts), the first GTM hire, and converting test-key integrations to production.
4. **A name.** "Provenant" is a placeholder in a crowded namespace; trademark and domain work is budgeted before any public surface.

The deadline is 2 August 2026. The product that catches the wave it creates is built and tested. What it needs now is a deployment target, a partner list, and a name on the door.
