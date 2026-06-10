# @aegis/web

The Aegis governance console — Next.js (App Router) + Tailwind v4, styled to `DESIGN.md`
(Lapis primary, Sand signature accent, Carmine = critical only; Fraunces display + Geist).
Talks to the core API at `NEXT_PUBLIC_API_URL` (default `http://localhost:3001`) with
cookie-based sessions (`credentials: 'include'`).

## Screens
- `/login` — dev sign-in (WorkOS SSO/SCIM in production)
- `/` — portfolio dashboard: readiness stats, risk distribution, recent systems, deadline alert
- `/inventory` — AI inventory table + "register system" modal
- `/inventory/[id]` — use-case detail: overview, mapped controls, gaps, audit-readiness, approval trail, report export

## Develop

```bash
# The API must be running on :3001 (see the repo-root BUILD-LOG runbook).
pnpm --filter @aegis/web dev      # http://localhost:3000
pnpm --filter @aegis/web build    # production build (also type-checks the app)
```

Type-checking is handled by `next build` (Next generates `next-env.d.ts`), so there is no
standalone `tsc` step.
