# Go-to-Market, Competition & Risks — AI Governance Platform

> Companion to the PRD/architecture/roadmap. The lens here is "is this a business?"

## 1. Market context (2026)

- **Regulatory tailwind:** EU AI Act high-risk obligations apply **2 Aug 2026**;
  ISO/IEC 42001 certification demand rising; NIST AI RMF is the US baseline;
  Colorado AI Act and other US state laws landing. Boards now treat AI risk as a
  named risk category.
- **Buyer urgency is real and time-boxed** — that's the opening for a startup.
- The category is **crowded but unconsolidated** — no clear default winner yet.

## 2. Competitive landscape

| Group | Examples | Their angle | Your edge |
|-------|----------|-------------|-----------|
| Pure-play AI governance | Credo AI, Holistic AI, Saidot, Monitaur, Trustible, Fairly AI | GRC-style policy + assessment | Sharper wedge + deep stack integration + AI-native UX |
| Big GRC / privacy | OneTrust, ServiceNow, Archer | AI module bolted onto GRC | Purpose-built, faster, AI-stack-aware |
| Cloud/platform | Microsoft Purview, IBM watsonx.governance, Google | Bundled with their cloud | Cloud-neutral, deeper governance workflow |
| ML observability | Fiddler, Arize, Evidently | Monitoring/drift/bias | You *integrate* these; you own policy+compliance |
| Compliance automation | Vanta, Drata | SOC 2 / ISO automation, adding AI | You're AI-specialist depth, not generalist |

**Positioning statement:** _"The system of record for enterprise AI — from
discovery to audit-ready, built around the EU AI Act and ISO 42001, integrated
with your actual AI stack."_

**Why you can win as a startup:** incumbents are broad and slow; you go narrow
(EU AI Act readiness), fast (3-day vs 3-week via AI assist), and deep (live
inventory from real integrations, not questionnaires).

## 3. GTM motion

- **Top of funnel (PLG):** free/low-cost "EU AI Act Readiness Assessment" — a
  self-serve guided tool that produces a real gap report. Captures use-case data,
  demonstrates value, creates urgency.
- **Expansion (sales-led):** convert assessment users to the full platform
  (continuous compliance, workflows, integrations). Land-and-expand by AI use case
  / business unit.
- **Channels:** content on EU AI Act / ISO 42001 (SEO + thought leadership);
  partnerships with audit/consulting firms (Big 4, boutique AI-risk consultancies)
  and law firms; integration-marketplace listings (Databricks, AWS, Azure).
- **Credibility:** advisory board with a regulator/lawyer; publish a control
  crosswalk as a free resource (lead magnet + moat signal).

## 4. Pricing (hypothesis with numbers — validate with design partners)

Meter on **governed AI systems** (scales with value + the customer's AI growth);
avoid pure per-seat (governance touches many occasional stakeholders). Concrete
starting hypothesis to test, not a final card:

| Tier | Price (hypothesis) | Includes | Target |
|------|-------------------|----------|--------|
| **Assessment** | Free | Self-serve EU AI Act readiness assessment + gap report, 1 workspace, limited systems | Lead capture / PLG |
| **Team** | ~$2–4k/mo (annual) | Up to ~25 governed AI systems, EU AI Act + NIST, core workflow, SSO, standard support | Mid-market, first paid |
| **Business** | ~$5–10k/mo (annual) | Up to ~100 systems, ISO 42001 module, integrations, continuous monitoring, SCIM | Scaling AI programs |
| **Enterprise** | Custom (6-figure ACV) | Unlimited/large, EU residency, dedicated env, ABAC, white-label, SLA, premium support | Regulated enterprises |

- **Design-partner pricing:** discounted/founder pricing in exchange for co-build +
  a reference + a case study. Don't give it away free; a paid pilot is a demand signal.
- **Usage angle:** AI drafting/assist can be a metered add-on or bundled by tier; watch
  Claude cost per tenant (`07-SCALING-AND-TOOLING §3`) so tiers stay margin-positive.
- **Land-and-expand:** start one business unit / use-case set, expand by systems and
  modules. NRR is the metric (see §5).
- **Validate before committing:** the numbers above are anchors to test in the first
  3–5 partner conversations, not a published price.

## 5. Key metrics

- **North star:** # of AI use cases under active governance.
- Activation: design partner runs a real use case end-to-end.
- Funnel: assessments started → completed → converted to platform.
- Retention/expansion: NRR (governance is sticky once it's the system of record).
- Time-to-readiness: how fast a customer reaches "audit-ready" (your core promise).

## 6. Risk register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Crowded market, no differentiation | High | High | Sharp wedge; deep integrations; AI-native UX; vertical focus if needed |
| Regulatory text changes / guidance shifts | High | Med | Content-as-data; advisor; subscribe to regulatory updates; version everything |
| Long enterprise sales cycles | High | High | PLG assessment top-of-funnel; design partners; consulting channel |
| Credibility gap (buyers distrust new vendor in trust space) | High | High | Advisor/board; SOC 2 early; published crosswalk; reference customers |
| Data sensitivity / breach = existential | Med | Critical | Security-as-product (`02-ARCHITECTURE §6`); residency; SOC 2; pen tests |
| AI assist produces wrong compliance guidance | Med | High | Human-in-the-loop; cite sources; never auto-attest; eval suite; disclaimers |
| Incumbent bundles "good enough" governance free | Med | High | Depth + neutrality (cloud-agnostic) + workflow quality they won't match |
| Build scope creep (it's a big platform) | High | Med | MVP discipline (`01-PRD §5`); phase gates; design-partner-driven backlog |
| Solo/early-team bandwidth | High | Med | DevFleet parallelization for build; outsource non-core; advisor leverage |

## 7. Immediate next actions (your "how to proceed")

1. **Confirm the wedge** (EU AI Act readiness) — or tell me to pivot to a vertical.
2. **Confirm the stack lane** (`02-ARCHITECTURE §1`, default TS monorepo).
3. **Line up design partners** (3–5, EU-exposed) and a **compliance advisor**.
4. **Decide deliverable depth** with me next:
   - (a) clickable prototype / wireframes for the MVP flow, or
   - (b) scaffold the repo + skeleton, or
   - (c) connect DevFleet and dispatch the mission DAG.
5. **Validate pricing + buyer** in design-partner conversations before Phase 2.
