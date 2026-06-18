# Design System & UX — AI Governance Platform

> Output of a design-lens review. This is the `DESIGN.md` for the product: the
> aesthetic direction, information architecture, the key screens, interaction
> patterns, and the accessibility bar. A governance product is dense, high-stakes,
> and bought by skeptical risk/legal/security people. The UI must read as
> trustworthy, calm, and auditable, not as a flashy startup toy.

## 1. Design principles

1. **Trust over flash.** Every element builds or erodes trust. Restraint, clarity,
   and evidence beat gradients and motion. (Rams: as little design as possible.)
2. **Make state legible.** Users must always know: what is this AI system's status,
   its risk tier, what's missing, who owns it, what's the deadline. Status is the
   product.
3. **Show your work.** Risk tiers, AI suggestions, and readiness scores always show
   the rationale and the source. No black boxes in a governance tool.
4. **Reduce dread.** Compliance is anxiety-inducing. The UI should make a 3-week
   exercise feel handled: clear next actions, progress, and "you're X% ready."
5. **Auditable by design.** Timestamps, owners, change history, and AI provenance are
   first-class UI, not buried.
6. **Dense but not cluttered.** Enterprise users want information density; achieve it
   with hierarchy and spacing, not by cramming.

## 2. Aesthetic direction

- **Mood:** institutional trust meets modern SaaS. Think "the calm control room,"
  not "consumer app." Closer to Linear/Vanta restraint than to a colorful dashboard.
- **Color:**
  - Neutral-first: a cool gray scale carries 90% of the UI.
  - One confident brand/primary (a deep blue or slate-indigo signaling trust/depth).
  - **Risk semantic palette is reserved and consistent** (used *only* for risk):
    Prohibited = red, High = amber/orange, Limited = yellow, Minimal = green/gray.
    Never use these hues decoratively, so risk color always means risk.
  - Strong light + dark mode (enterprise users live in both).
- **Typography:** one clean sans (Inter or Geist) for UI; a monospace (JetBrains
  Mono) for IDs, hashes, audit entries, and code-like content. Clear type scale,
  generous line-height for dense tables.
- **Layout:** persistent left nav (the object model: Inventory, Risk, Controls,
  Evidence, Workflows, Reports, Policies, Settings), top bar for org/region/workspace
  switch + search + user. Content area uses a calm 8pt spacing grid.
- **Motion:** minimal and functional (state transitions, loading). No decorative
  animation. Fast > fancy.
- **Components:** shadcn/ui as the base (Radix primitives = accessible by default),
  Tailwind tokens, a documented component library in Storybook.

## 3. Information architecture (navigation)

```
Top bar:  [Org/Region ▾] [Workspace ▾]   ⌘K Search        [Help] [User ▾]
Left nav:
  ▸ Dashboard            (portfolio readiness, deadlines, my tasks)
  ▸ AI Inventory         (registry of AI systems / use cases)
  ▸ Risk Assessments     (questionnaires, tiers, impact assessments)
  ▸ Controls & Frameworks(library, crosswalks, mappings)
  ▸ Evidence             (files/links, attestations)
  ▸ Workflows            (intake, reviews, approvals, my queue)
  ▸ Policies             (author, version, attest)
  ▸ Reports              (readiness, audit packages, exec/board)
  ▸ Settings             (org, members/RBAC, SSO/SCIM, regions, billing, audit log)
```

## 4. Key screens (MVP) and their hardest UX problems

| Screen | Job | The hard part |
|--------|-----|--------------|
| **Portfolio dashboard** | "What's our AI risk posture and what's due?" | Summarize many use cases without lying; surface deadlines (Aug 2026) and gaps; "X% audit-ready" must be honest and explainable |
| **AI Inventory list** | Live catalog of AI systems | Dense table: name, owner, lifecycle state, risk tier, framework readiness, last review. Filter/sort/saved views. Bulk actions. Empty + CSV-import states |
| **Use-case detail** | Single source of truth for one AI system | Tabs: Overview, Risk, Controls, Evidence, Workflow, Activity. Must show owner, state, tier+rationale, what's missing, AI-drafted artifacts (labeled) |
| **Risk questionnaire** | Classify against EU AI Act | Long form done right: sectioned, save-as-you-go, conditional logic, progress, "why this question," then the computed tier **with rationale and the answers that drove it** |
| **Control mapping + evidence** | Map controls, attach proof | Matrix of controls × status; crosswalk view (one evidence → many frameworks); upload with scan state; attestation with signature/timestamp |
| **Readiness + gap report** | "Are we ready, what's left" | Per-framework readiness %, gap list with owners + due dates, exportable; must be skimmable by an exec and detailed for the practitioner |
| **Approval workflow / my queue** | Review and approve | Clear "what am I approving and why," diff/context, decision + reason captured to audit log, SLA/deadline visible |
| **Report export** | Regulator/auditor doc | Faithful PDF/MD; AI-drafted sections clearly labeled; sources cited; deterministic and reproducible |

## 5. The PLG assessment funnel (a distinct surface)

The "EU AI Act Readiness Assessment" is the top of funnel and deserves its own
lightweight, low-friction UX, separate from the full platform:

- **Minimal friction:** start without heavy setup; capture use-case basics; run the
  classification; produce a **real gap report** (not a teaser).
- **Value before signup where possible:** show enough to be useful; gate the export
  or the saved workspace behind signup.
- **Urgency, honestly:** countdown to 2 Aug 2026, "you have N high-risk systems."
- **Clear upgrade path:** "turn this into continuous governance" → platform.
- Visually lighter and more guided than the dense platform; it's a wizard, not a
  console.

## 6. Interaction patterns (consistent everywhere)

- **States for every view:** loading (skeletons), empty (with a clear first action),
  error (recoverable, no blame), partial, success. Design empty states first; a new
  tenant sees them on day one.
- **Async work:** long jobs (report gen, AI drafting) show progress and notify on
  completion; never freeze the UI.
- **AI surfaces:** AI output is visually distinct (a labeled "AI-drafted" treatment),
  always shows sources, always has accept/edit/reject. Never auto-applied.
- **Destructive actions:** confirm with consequences spelled out; retirements are
  reversible-by-record (audit), not silent deletes.
- **Search:** ⌘K command palette for cross-object navigation and actions.
- **Tables:** sortable, filterable, saved views, column config, bulk select, CSV
  export. This product lives in tables; invest here.

## 7. Accessibility (WCAG 2.2 AA — a procurement gate, not optional)

- Radix/shadcn gives keyboard nav, focus management, ARIA out of the box; don't break
  it with custom components.
- Color contrast ≥ 4.5:1 for text; **risk is never conveyed by color alone** (always
  pair with label/icon/text).
- Full keyboard operability incl. tables, dialogs, the command palette.
- Visible focus states; reduced-motion respected; screen-reader labels on icons.
- Accessibility checks in CI (axe) and in the design-review pass.

## 8. Design ops

- **Tokens:** colors/space/type/radii as Tailwind + CSS variables; one source of
  truth; light/dark from tokens.
- **Component library:** Storybook with documented states; visual regression
  (Chromatic or Playwright snapshots).
- **Design review loop:** use `/plan-design-review` before building a surface and
  `/design-review` on the live result; capture before/after.
- **Content/voice:** plain, precise, reassuring. Compliance jargon explained inline
  on first use. Error messages are actionable, never scolding.

## 9. Open design decisions

- Brand name + identity (resolve the "Provenant" placeholder before visual identity work).
- Exact primary hue + full token palette (do `/design-consultation` for the system,
  `/design-shotgun` to explore directions).
- Dashboard data-viz approach (how much charting vs tables for the exec/board view).
- Whether the PLG assessment gets a distinct visual brand from the platform.
