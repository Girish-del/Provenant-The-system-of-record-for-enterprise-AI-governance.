# Security & Threat Model — AI Governance Platform

> Companion to `02-ARCHITECTURE.md`. This product sells trust, so security is not
> a feature, it is the product. A breach here is existential (see risk register in
> `04-GTM-AND-RISKS.md`). This doc is the output of a CSO-lens review: threat model
> (STRIDE), tenant-isolation design, audit-log integrity, AI data handling, and the
> security program that makes SOC 2 / ISO 27001 achievable from Phase 1.

## 1. Security principles (non-negotiable)

1. **Tenant isolation is sacred.** A tenant must *never* read or write another
   tenant's data. This is enforced in depth (RLS + app guards + tests) and verified
   on every PR by an always-on isolation test suite.
2. **Least privilege everywhere.** RBAC for users, scoped IAM for services, scoped
   DB roles, scoped API keys. No service or person holds more than it needs.
3. **Everything material is audited.** Append-only, attributable, tamper-evident.
4. **Zero secrets in code.** Secret scanning blocks merges; runtime secrets come
   from a managed vault.
5. **AI output is never authoritative.** Every AI generation is labeled, sourced,
   logged, and human-reviewed before it becomes evidence.
6. **Secure by default.** Encryption on, MFA available, sessions short, deny-by-default
   authorization, fail closed.
7. **The platform governs itself.** We register our own AI features in our own
   inventory and run them through our own controls (dogfood).

## 2. Trust boundaries

```
[ Browser ]  --TLS-->  [ CDN/WAF ]  -->  [ Next.js (RSC/SSR) ]
                                              |  session cookie (httpOnly, Secure, SameSite=Lax)
                                              v
                                       [ NestJS Core API ]  --- authz guard + tenant context
                                          |          |    \
                                   [ Postgres+RLS ]  [ S3 ]  [ Redis ]
                                          |
                                   [ BullMQ workers ] --> [ Python AI svc ] --> [ Anthropic API ]
```

Boundaries that matter:
- **Public internet → edge:** WAF, TLS 1.2+, rate limiting, bot mitigation.
- **Edge → app:** authenticated session; CSRF protection on mutations.
- **App → DB:** tenant context set per request; RLS enforces row scoping.
- **App → AI service:** internal-only network; signed service-to-service auth (mTLS
  or signed JWT); no direct internet exposure of the AI service.
- **AI service → Anthropic:** enterprise API terms (no training on our data); egress
  allowlist; per-tenant token budgets.

## 3. STRIDE threat model

| Threat | Vector | Mitigation |
|--------|--------|-----------|
| **Spoofing** | Stolen session, weak SSO config | WorkOS SSO/SAML/OIDC, MFA, short-lived sessions, device/session list + revoke, signed service tokens between services |
| **Tampering** | Modify evidence or audit records | Append-only audit log, hash-chaining (§5), S3 object-lock for evidence, DB write-guards, content hashes on evidence files |
| **Repudiation** | "I didn't approve that" | Every approval/attestation is signed with actor + timestamp + IP + reason, written to the immutable audit log |
| **Information disclosure** | Cross-tenant read, leaked exports, log leakage | RLS + app guards + isolation tests (§4), per-tenant S3 prefixes with scoped IAM, PII redaction in logs, signed expiring URLs for downloads |
| **Denial of service** | Request flood, expensive AI calls | WAF rate limiting, per-tenant API quotas, AI token budgets + circuit breakers, async heavy jobs, queue backpressure |
| **Elevation of privilege** | RBAC bypass, IDOR, SSRF to metadata | Deny-by-default authz, object-level checks (not just route-level), no user-supplied URLs fetched without allowlist, blocked link-local/metadata IPs, scoped IAM roles |

### High-severity scenarios to design against explicitly
- **IDOR on evidence/use-case IDs** (use-case `123` belongs to tenant B; tenant A
  guesses it). Defense: RLS makes the row invisible *and* the app authz layer rejects
  it; both must independently fail-close. Tested in the isolation suite.
- **SSRF via discovery connectors** (Phase 3 connectors fetch URLs/registries).
  Defense: allowlist of hosts, block RFC1918 + link-local + cloud metadata
  (169.254.169.254), no redirects to private ranges, dedicated egress proxy.
- **Prompt injection via uploaded documents** (a malicious PDF tells the AI to
  exfiltrate or fabricate a "pass"). Defense: AI output is advisory-only and
  human-reviewed; the AI cannot write attestations or change risk tiers; treat
  retrieved content as untrusted; never let the model trigger privileged actions.
- **Malicious evidence upload** (malware in an evidence file). Defense: malware scan
  on ingest (ClamAV/lambda or managed), block on detection, store quarantined,
  content-type sniffing, no server-side rendering of untrusted files.

## 4. Tenant isolation (the core control)

**Model:** shared DB, shared schema, `tenant_id` (org_id) on every tenant-scoped
row, enforced by **PostgreSQL Row-Level Security**.

Implementation rules:
- Every tenant-scoped table has `org_id uuid not null` and an RLS policy:
  `USING (org_id = current_setting('app.current_org')::uuid)`.
- The app sets `SET LOCAL app.current_org = $orgId` at the start of every request's
  transaction, derived from the authenticated session, never from client input.
- The application connects as a **non-superuser** role with no `BYPASSRLS`. Migrations
  use a separate privileged role.
- A dedicated set of system tables (frameworks, control library content) is global
  read, tenant-scoped write where applicable.

**Verification (always-on suite, runs on every PR, blocks merge):**
- For each tenant-scoped repository/endpoint, assert tenant A cannot read, list,
  update, or delete tenant B's rows, by ID and by query.
- Assert that omitting the tenant context fails closed (returns nothing, not
  everything).
- Fuzz IDs across tenants. Snapshot the RLS policy set so a dropped policy fails CI.

**Escalation path:** large/regulated tenants → schema-per-tenant or dedicated DB for
residency/isolation guarantees. The data-access layer is written so this is a
deployment/routing concern, not a rewrite.

## 5. Audit log integrity

- **Append-only.** No update/delete grants on the audit table for the app role.
- **Attributable.** Each entry: `actor_id, actor_ip, org_id, action, target_type,
  target_id, before, after, occurred_at, request_id`.
- **Tamper-evident (hash-chained).** Each entry stores
  `prev_hash` and `entry_hash = H(prev_hash || canonical(entry))`. A periodic job
  verifies the chain and publishes the head hash to a separate store (and, for
  high-assurance tenants, an external timestamping/anchor). Any gap or mismatch
  raises a security incident.
- **Queryable + exportable.** Auditors can filter by actor/target/time and export a
  signed audit package.

## 6. AI-specific security & governance

- **Data handling:** tenant data is sent to Anthropic under enterprise terms with no
  training on inputs. PII minimization before prompting where feasible. Residency:
  honor the tenant's region (do not route EU tenant data through non-EU inference if
  the contract forbids it; make the inference region a tenant config).
- **Provenance logging:** for every generation, record model id, model version,
  prompt template id, input hash, retrieved sources, output, reviewer, and
  accept/reject. This *is* an auditable trail and a debugging tool.
- **Guardrails:** the AI service has no write access to attestations, risk tiers, or
  approvals. It proposes; humans dispose. Outputs are labeled "AI-drafted, unverified."
- **Eval gate:** classification and drafting changes ship only if the golden-set eval
  suite passes a regression threshold (see `02-ARCHITECTURE §8`).
- **Abuse/cost controls:** per-tenant token budgets, per-request max tokens, prompt-
  injection-resistant system prompts, circuit breaker on Anthropic errors/timeouts.

## 7. Data protection

- **In transit:** TLS 1.2+ everywhere, HSTS, internal mTLS or signed tokens.
- **At rest:** KMS-managed encryption for DB, S3, backups, and Redis where supported.
- **Key management:** AWS KMS; rotate; separate keys per environment; consider
  per-tenant data keys (envelope encryption) for high-assurance tenants later.
- **Secrets:** AWS Secrets Manager in cloud; Doppler or local `.env` (gitignored) in
  dev. CI runs secret scanning (gitleaks/trufflehog) and blocks on findings.
- **PII / DSAR:** data export and deletion flows for GDPR; configurable retention;
  documented data map (what we store, where, why, how long).
- **Backups:** automated, encrypted, tested restores. RPO ≤ 1h, RTO ≤ 4h. Restore
  drills quarterly.

## 8. Application security controls

- **AuthN:** WorkOS (SSO/SAML/OIDC + Directory Sync/SCIM). MFA. Short sessions,
  rotation, server-side revocation.
- **AuthZ:** deny-by-default RBAC (Admin/Contributor/Reviewer/Viewer), object-level
  checks on every access, not just route guards. ABAC/field-level later.
- **Input validation:** schema validation at every boundary (Zod/class-validator);
  never trust client, API responses, or file contents.
- **Output encoding:** React escapes by default; sanitize any rendered HTML; CSP
  headers; no `dangerouslySetInnerHTML` on untrusted content.
- **CSRF:** SameSite cookies + CSRF tokens on state-changing requests.
- **Rate limiting:** per-IP and per-tenant at the edge and app.
- **Dependency & supply chain:** Dependabot/Renovate, `pnpm audit`, SCA in CI, lockfile
  integrity, pinned base images, image scanning (Trivy), SBOM generation.
- **SAST/DAST:** CodeQL/Semgrep in CI; periodic DAST against staging; annual third-
  party pen test (buyers ask for the report).
- **Headers:** CSP, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy.

## 9. Infrastructure & pipeline security

- **IaC (Terraform):** reviewed, scanned (tfsec/Checkov), least-privilege IAM, no
  public S3, private subnets for data, security groups deny-by-default.
- **Network:** app in private subnets; only the load balancer is public; AI service
  not internet-reachable; egress allowlists.
- **CI/CD:** protected branches, required reviews, signed commits where feasible,
  OIDC-based cloud auth (no long-lived CI keys), separate deploy roles per env,
  migration gate + backup step before destructive changes.
- **Secrets in CI:** scoped, masked, rotated; no secrets in logs or PR text.

## 10. Compliance program (start Phase 1, not Phase 4)

- **SOC 2 Type II** path from day one via **Vanta** (or Drata): connect cloud, HRIS,
  and code; auto-collect evidence; assign control owners. Aim for Type I early,
  Type II after the observation window.
- **ISO 27001** to follow, then **ISO/IEC 42001** (the AI management system, which is
  also a product feature you sell).
- **Policies:** security policy set (access control, incident response, vendor
  management, SDLC, data retention, BCP/DR) authored early; we dogfood these in the
  product.
- **Incident response:** runbook, severity levels, on-call, comms templates,
  breach-notification clock awareness (GDPR 72h). Tabletop exercise before GA.
- **Vendor risk:** assess subprocessors (Anthropic, WorkOS, AWS, Stripe, etc.);
  maintain a subprocessor list and DPAs; publish a trust page.

## 11. Security testing checklist (Definition of Done per feature)

- [ ] Tenant-scoped tables have RLS + isolation tests
- [ ] Object-level authz checks (not just route guards)
- [ ] Input validated at the boundary
- [ ] No secrets added to code; secret scan clean
- [ ] Audit-log entries written for material changes
- [ ] AI features: provenance logged, output labeled, no privileged writes
- [ ] New dependencies scanned; no critical CVEs
- [ ] Errors fail closed; no sensitive data in errors/logs

## 12. Open security decisions

- Per-tenant envelope encryption: which tenants/tiers warrant it, and when?
- External anchoring for audit-chain head hash: needed at GA or only for high-
  assurance tenants?
- DAST tooling and pen-test vendor selection (timing: before first enterprise deal).
- Inference residency: confirm Anthropic regional options vs contractual carve-outs
  for EU-residency customers.
