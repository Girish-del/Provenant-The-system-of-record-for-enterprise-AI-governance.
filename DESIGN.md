# Design System — AI Governance Platform (working title: Provenant)

> Source of truth for all visual and UI decisions. Read this before writing any UI.
> Derived from `docs/06-DESIGN-SYSTEM.md` and the user-selected palette
> (https://coolors.co/b3001b-262626-255c99-7ea3cc-ccad8f). Components are sourced
> from shadcn/ui + 21st.dev (https://21st.dev/community/components).

## Product Context
- **What this is:** A system of record for enterprise AI. Discover AI use cases,
  classify risk (EU AI Act / NIST / ISO 42001), map controls, collect evidence, run
  approvals, and produce audit-ready documentation.
- **Who it's for:** Skeptical, high-stakes buyers — Chief AI/Risk Officers, CISOs,
  DPOs, AI governance leads, auditors. They live in dense tables and forms.
- **Space/industry:** AI governance / GRC. Peers: Credo AI, Holistic AI, Vanta,
  OneTrust, IBM watsonx.governance.
- **Project type:** Data-dense enterprise web app (console) + a lighter marketing /
  PLG assessment surface.

## Memorable Thing
**"Serious software for high-stakes decisions, built by people who get the weight of
it."** Every choice serves this: disciplined blue + ink for authority, a warm sand
accent and a serif display for human warmth the cold-blue competitors lack.

## Aesthetic Direction
- **Direction:** Industrial / Utilitarian meets Institutional Trust. The "calm
  control room," not a consumer app. Closer to Linear / Vanta restraint than a
  colorful dashboard.
- **Decoration level:** minimal. Typography, spacing, and disciplined color do the
  work. No gradients-as-decoration, no blobs, no icon-in-colored-circle grids.
- **Mood:** Calm, authoritative, precise, quietly warm. The product should reduce a
  user's compliance dread, not add to it.
- **Reference posture:** Linear (restraint, density), Vanta (trust framing),
  Stripe docs (clarity), with a warmer, more institutional accent.

## Color

**Approach:** balanced — a confident blue primary + ink neutrals, a warm sand
signature accent used sparingly, and a strict semantic/risk palette. Color is
meaningful, never decorative.

### Brand
| Token | Hex | Role |
|-------|-----|------|
| `--brand-primary` (Lapis) | `#255C99` | Primary actions, brand, active nav, links-as-buttons |
| `--brand-primary-hover` | `#1E4D80` | Hover/active for primary |
| `--brand-secondary` (Steel) | `#7EA3CC` | Info states, secondary accents, hover tints, charts |
| `--brand-ink` (Ink) | `#262626` | Primary text, dark surfaces, headers |
| `--brand-sand` (Sand) | `#CCAD8F` | Signature warm accent: premium highlights, badges, empty-state art, marketing |
| `--brand-carmine` (Carmine) | `#B3001B` | RESERVED: Prohibited risk + critical/destructive only. Never decorative |

### Neutrals (cool gray ramp, anchored on Ink)
`#F7F8FA` `#EEF1F5` `#E1E6EC` `#CBD3DC` `#9AA6B2` `#6B7682` `#4B545E` `#343C44`
`#262626` `#1A1A1A` (50 → 900). Light bg `#FFFFFF`, surface `#F7F8FA`, border
`#E1E6EC`, text `#262626`, text-muted `#6B7682`.

### Semantic
- success `#3F7D58` · warning `#B7791F` · error/danger `#B3001B` · info `#255C99`

### Risk tiers (EU AI Act) — strict, never reused decoratively
| Tier | Hex | Notes |
|------|-----|-------|
| Prohibited | `#B3001B` (Carmine) | Deepest stakes; the brand red |
| High | `#C2410C` (Burnt orange) | |
| Limited | `#B7791F` (Amber-gold) | Harmonizes with Sand |
| Minimal | `#3F7D58` (Green) | |
**Rule:** risk is never conveyed by color alone — always pair the hue with a label +
icon (WCAG + colorblind safety).

### Dark mode
Surfaces from the Ink family: bg `#1A1A1A`, surface `#262626`, raised `#2E2E2E`,
border `#343C44`, text `#F7F8FA`, text-muted `#9AA6B2`. Reduce accent saturation
~10–15%: primary → `#3D77B8`, sand → `#D8BE A4`-range. Risk hues keep meaning;
brighten Carmine slightly to `#E03A50` for contrast on dark.

## Typography
- **Display / Hero:** **Fraunces** (variable serif). Used on the PLG marketing
  surface, report cover pages, and large exec-dashboard numbers. Adds institutional
  gravitas + warmth; this is the memorable signature against a sea of sans-only SaaS.
- **UI / Body / Data:** **Geist Sans**. Clean, modern, neutral, excellent
  `tabular-nums` for the dense tables this product lives in. The app uses Geist
  everywhere; the serif is reserved for marketing/report moments.
- **Mono / IDs / Hashes / Audit / Code:** **Geist Mono**. Audit-log entries, use-case
  IDs, evidence hashes, API keys, code.
- **Loading:** Google Fonts — `Fraunces` (opsz,wght), `Geist`, `Geist Mono`.
  `<link rel="preconnect">` + `display=swap`. Self-host via `next/font` in the app
  for performance + residency (no external font CDN call from EU tenants).
- **Scale (16px base):** xs `0.75rem`/12 · sm `0.875rem`/14 · base `1rem`/16 ·
  lg `1.125rem`/18 · xl `1.25rem`/20 · 2xl `1.5rem`/24 · 3xl `1.875rem`/30 ·
  4xl `2.25rem`/36 · 5xl `3rem`/48 · 6xl `3.75rem`/60. Tables use sm (14) with
  tabular-nums. Display (Fraunces) starts at 3xl.

## Spacing
- **Base unit:** 4px, 8pt rhythm.
- **Density:** comfortable in marketing/forms; **compact in tables** (row height
  ~40px, cell padding 8–12px). Enterprise users want information density.
- **Scale:** 2xs(2) xs(4) sm(8) md(12) base(16) lg(24) xl(32) 2xl(48) 3xl(64).

## Layout
- **Approach:** hybrid. App = grid-disciplined console; PLG/marketing = creative but
  restrained.
- **App shell:** persistent left sidebar (256px, collapsible to 64px) + top bar
  (org/region/workspace switch, ⌘K search, help, user). Content padding 24px,
  full-width tables.
- **Marketing/PLG:** centered, max content width 1200px, 12-column grid, generous
  vertical rhythm.
- **Border radius:** sm 4 · md 6 · lg 8 · xl 12 · full 9999 (avatars/pills only).
  Restrained on purpose — governance is not bubbly.

## Motion
- **Approach:** minimal-functional. Only motion that aids comprehension (state
  changes, async progress, panel transitions). No decorative animation.
- **Easing:** enter `ease-out` · exit `ease-in` · move `ease-in-out`.
- **Duration:** micro 80ms · short 160ms · medium 240ms · long 360ms.
- **Respect `prefers-reduced-motion`** everywhere.

## Components (shadcn/ui base + 21st.dev sourcing)
Base layer is **shadcn/ui** (Radix primitives = accessible by default) themed with
the tokens above. Pull richer blocks from **21st.dev** (shadcn-compatible registry).
Install via the shadcn CLI / 21st.dev "Add component" registry URLs.

| Surface | Component | Source |
|---------|-----------|--------|
| AI inventory, control matrix, audit log | **Data table** (sort/filter/saved views/bulk/CSV) | TanStack Table + shadcn table; 21st.dev data-table blocks |
| Global nav | Collapsible **sidebar** | shadcn `sidebar`; 21st.dev sidebar blocks |
| Search/actions | **Command palette** (⌘K) | `cmdk` + shadcn command |
| Risk tier, lifecycle state | **Badge** with risk/status variants | shadcn Badge (custom variants per risk palette) |
| Dashboard | **Stat / metric cards**, **charts** | 21st.dev metric cards; shadcn charts (Recharts) |
| Intake, risk questionnaire | **Form** (sectioned, conditional, save-as-you-go) | react-hook-form + zod + shadcn form |
| Evidence upload | **Dropzone / uploader** with scan-state | 21st.dev dropzone; shadcn-based uploader |
| Approvals, side context | **Dialog / Sheet / Drawer** | Radix Dialog/Sheet via shadcn |
| Notifications | **Toast** | `sonner` |
| Use-case detail | **Tabs**, **Timeline/Activity** | shadcn tabs; 21st.dev timeline |
| AI-drafted content | Distinct **"AI-drafted" callout** (Sand-accented) w/ sources + accept/edit/reject | custom, built on shadcn card/alert |

**AI-surface rule:** AI output is always visually distinct (Sand-accented "AI-drafted,
unverified" treatment), always shows sources, always has accept/edit/reject. Never
auto-applied.

## Accessibility (WCAG 2.2 AA — a procurement gate)
- Radix/shadcn gives keyboard nav + focus management + ARIA; don't break it.
- Text contrast ≥ 4.5:1. Risk/status never by color alone (label + icon + color).
- Full keyboard operability incl. tables, dialogs, ⌘K palette. Visible focus rings.
- Honor reduced-motion. axe checks in CI.

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-06-08 | Initial design system created | /design-consultation from `docs/06` + user palette |
| 2026-06-08 | Lapis `#255C99` = primary; Sand `#CCAD8F` = signature accent | Trust + a warm differentiator vs cold-blue competitors |
| 2026-06-08 | Carmine `#B3001B` reserved for Prohibited risk + destructive only | Resolves brand-red vs risk-red conflict; keeps risk semantics clean |
| 2026-06-08 | Fraunces (display) + Geist (UI/data) + Geist Mono | Institutional gravitas + dense-table clarity + auditable mono IDs |
