# Provenant, Explained Simply

> A rehearsal script for explaining the product to anyone, from a curious kid to a
> skeptical sponsor. One analogy, carried all the way through. Every "for the
> grown-ups" line names a real, shipped feature in this repository.

---

## The one-sentence version

Companies keep robots now. The law says every robot needs to go to school. We built
the school.

That is the whole story. Everything below is just rooms in the school.

---

## The story, room by room

### 1. The register of every robot

**The story:** Every school keeps a list of every student. Name, photo, which class
they are in, who their teacher is. If a robot is in the building, it is on the list.
No robot sneaks in through the back door and sits quietly in the corner for a year.

**For the grown-ups:** This is the AI use-case registry, a central inventory of every
AI system in the company with lifecycle states (proposed, in review, approved, in
production, retired), manual entry, CSV import, and role-based permissions on who can
add or change entries.

### 2. The danger test

**The story:** On the first day, every robot takes a short quiz. The answers sort it
into one of four colored groups. **Red** means this robot is banned, it does things
the law says no robot may ever do, and it must leave the building. **Orange** means
this robot does serious work, like deciding who gets a job or a loan, so it must
follow strict rules and be watched closely. **Yellow** means the robot is mostly fine
but must always be honest that it is a robot when it talks to people. **Green** means
it is fine, go play.

**For the grown-ups:** This is the EU AI Act risk-classification questionnaire. A
pure classification engine turns the answers into a risk tier (PROHIBITED, HIGH,
LIMITED, MINIMAL) with a written rationale, and the most severe answer always wins.
The tier is saved on the AI system's record and drives everything downstream.

### 3. The checklist of safety rules

**The story:** Each colored group gets its own checklist taped to the classroom door.
Orange robots get the long checklist: wear a helmet, keep a logbook, let a human
press the stop button. Green robots get a short one. Nobody has to guess which rules
apply; the color tells you.

**For the grown-ups:** This is control mapping with suggest-by-tier. The platform
ships a curated control library (EU AI Act and NIST AI RMF, with crosswalks between
them), and one click suggests and maps the controls the system's risk tier requires.
Each mapping tracks its status from suggested to implemented.

### 4. The binder of proof

**The story:** Saying "the robot wore its helmet" is not enough. The school keeps a
binder with photos: here is the helmet, here is the logbook, here is the stop button
being tested. And there is a guard at the binder's door who checks every photo for
germs before it goes in, so nothing nasty hides inside the binder.

**For the grown-ups:** This is evidence upload. Files attach to controls, get a
sha256 fingerprint, pass through a malware scan at the door (an EICAR-signature stub
today, built to swap in a real scanner), and land in S3 object storage. Infected
files are flagged, and only clean evidence counts toward readiness.

### 5. The report card

**The story:** Anyone can look at a robot's report card and see, in one number, how
ready it is. "This robot has done 8 of its 11 safety rules, here are the 3 it still
owes us." No surprises on exam day.

**For the grown-ups:** This is the readiness dashboard and gap report. A required
control only counts when it is implemented with clean evidence attached. There is a
per-system readiness percentage, a portfolio rollup across the whole company, and a
one-click export of an "EU AI Act Readiness Report" in Markdown or JSON.

### 6. The principal's sign-off

**The story:** Before a robot is allowed to start its real job, the principal reads
the file and signs the bottom of the page. Or refuses to sign, and the robot goes
back to fix things. Nobody graduates by just walking out the door.

**For the grown-ups:** This is the review and approval workflow. A contributor
submits a system for review, a reviewer approves or rejects with the decision
recorded, the lifecycle state transitions accordingly, and review steps carry SLA
due dates so requests do not rot in an inbox.

### 7. The diary nobody can secretly edit

**The story:** The school keeps a diary of everything that happens. Here is the
trick: every page is glued to the page before it in a special way, so if anyone rips
out a page or changes a word, all the glue after that point visibly breaks. You
cannot quietly rewrite yesterday.

**For the grown-ups:** This is the hash-chained, append-only audit log. Every
material change writes an entry whose hash includes the previous entry's hash, the
database role physically cannot update or delete rows, and an admin endpoint
verifies the whole chain and reports exactly where it broke if anyone tampered.

### 8. The locked classrooms

**The story:** Many companies use the same school building, but every company's
robots sit in their own locked classroom. The lock is built into the walls, not
taped to the door. Even if a teacher forgets to check a hall pass, the wall itself
refuses to let one company peek at another company's robots.

**For the grown-ups:** This is tenant isolation via Postgres Row-Level Security,
forced on all 14 org-scoped tables. The app connects as a non-superuser role that
cannot bypass the policies, the policies fail closed when no org is set, and a
dedicated isolation test suite blocks CI if any of this ever weakens.

### 9. The helpful robot assistant

**The story:** The school has one friendly robot on staff. It is great at homework:
it will draft the paperwork, suggest which checklist items a new robot probably
needs, and show exactly which page of the rulebook it used. But it is never allowed
to sign anything. A human reads every draft, and every draft wears a big sticker
that says "draft, written by the assistant."

**For the grown-ups:** This is the Python FastAPI AI service, with a mock provider
for development and a Claude provider behind an API key. It drafts risk summaries
and suggests controls, every response carries provenance (advisory-only, labeled,
sourced, logged), and it never auto-applies anything. It also has its own cost
discipline: per-org daily token budgets, a response cache, a circuit breaker, and
cheaper-model routing for the simpler tasks.

### 10. The entrance quiz anyone can take

**The story:** Outside the school is a table with a free quiz on it. Any company can
walk up, answer a few questions about one of its robots, and immediately learn its
color and what the rules will expect. No sign-up needed to take the quiz. If they
like the answer, the door to the school is right there.

**For the grown-ups:** This is the public /assess funnel. The questionnaire and the
classification run on a rate-limited public API with no login, the result page shows
the risk tier and obligations, and an email captures the visitor into a real
workspace with their assessed system already inside it. It is the product demo and
the lead form in one.

### 11. The price of a seat

**The story:** The school charges per robot enrolled. Your first three robots learn
for free. After that, you pay for a bigger classroom, and when your classroom is
full, the door politely asks you to upgrade before it lets the next robot in.

**For the grown-ups:** This is billing metered on governed AI systems: Free (3
systems), Team ($499/month, 25), Business ($1,499/month, 100), Enterprise (custom,
unlimited). Registering a system past the cap returns a clean 402 with an upgrade
path, and Stripe checkout plus a webhook handles plan changes (test-key placeholders
today).

---

## The 60-second elevator version (read this out loud)

"Every company is hiring robots right now: chatbots, scoring models, AI features
buried in vendor software. Starting this August, European law fines companies up to
seven percent of global revenue if they cannot prove those robots are safe and
legal. Most companies cannot even list their robots, let alone prove anything.

We built the school the law is asking for. You register every robot. A short test
sorts each one into four danger colors, from banned to fine. Each color comes with
its checklist of safety rules. You attach proof for every rule, a human signs off,
and everything is written in a diary that cannot be secretly edited. At the end you
press one button and hand the regulator a readiness report.

There is a free quiz on the sidewalk: any company can test one robot in two minutes,
see its danger color, and walk straight into a paid workspace. We charge per robot
governed, from free for three up to fifteen hundred a month for a hundred.

The whole platform is built and tested end to end. The deadline is August 2nd. We
are the school, and enrollment is about to get very motivated."

---

## Five hard sponsor questions, answered straight

**1. Why now?**
Because the law set an alarm clock. The EU AI Act's high-risk obligations apply on
2 August 2026, with penalties up to 35 million euros or 7% of global turnover.
ISO 42001 is becoming the certificate buyers ask vendors for, and US state laws like
Colorado's are landing this year. Compliance software sells best when the deadline
is real and dated, and this one is weeks away.

**2. Why you?**
Because we picked one sharp door into a crowded building. Incumbents sell broad
governance suites; we sell "EU AI Act readiness," a specific outcome on a specific
date, with a free public assessment as the front door and an AI assistant that turns
a three-week paperwork exercise into days. And the foundations buyers actually test
us on, tenant isolation enforced in the database itself and an audit log that proves
its own integrity, are built and continuously tested, not promised.

**3. What if OneTrust copies you?**
They might add the words. Copying the substance is harder: a maintained control
library with crosswalks so one piece of evidence satisfies several frameworks, a
self-serve assessment funnel that converts without a salesperson, and AI-native
drafting wired into the workflow rather than bolted on. Big GRC vendors move at big
GRC speed, and their AI modules serve their existing suite, not this deadline. If
they validate the category loudly, that helps us more than it hurts.

**4. How do you make money?**
Subscription, metered on the number of AI systems under governance. Free covers 3
systems, Team is $499 a month for 25, Business is $1,499 for 100, Enterprise is
custom. The meter scales with the customer's own AI growth, the cap is enforced in
the product, and governance is sticky: once a company's audit trail lives here,
leaving means abandoning its own evidence. AI assist costs are capped per tenant so
the tiers stay margin-positive.

**5. What exists today, honestly?**
A working product and zero revenue. The full planned scope is built: registry, risk
classification, control mapping, evidence with malware scanning, approvals, the
tamper-evident audit log, readiness reports, the public assessment funnel, billing
with cap enforcement, and the AI drafting service, all passing an automated test
suite in CI, including end-to-end runs and a dedicated tenant-isolation suite.
What does not exist yet: a cloud deployment, real Stripe and SSO keys (test
placeholders are wired), a final brand name (Provenant is a working title), and
customers. The next milestones are deployment, three to five design partners, and
the first paid pilot. We are pre-revenue with the hard part already built.

---

*Companion docs: `00-OVERVIEW.md` (the wedge), `01-PRD.md` (full requirements),
`04-GTM-AND-RISKS.md` (market and pricing rationale), `BUILD-LOG.md` (exactly what
shipped, commit by commit).*
