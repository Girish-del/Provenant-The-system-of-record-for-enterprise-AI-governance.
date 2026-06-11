import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { prisma, forOrg } from './client';

// The most important test in the product: prove that Row-Level Security makes
// one tenant unable to read or write another tenant's data. Requires a running
// Postgres with the schema + rls.sql applied, and the app connecting as aegis_app.
//
//   docker compose up -d postgres
//   pnpm --filter @aegis/db db:push && pnpm --filter @aegis/db rls:apply
//   pnpm --filter @aegis/db test

const orgA = randomUUID();
const orgB = randomUUID();
const userId = randomUUID();
const strangerId = randomUUID();

beforeAll(async () => {
  // organizations + users are not org-scoped; create them directly.
  await prisma.organization.createMany({
    data: [
      { id: orgA, name: 'Org A', slug: `a-${orgA.slice(0, 8)}` },
      { id: orgB, name: 'Org B', slug: `b-${orgB.slice(0, 8)}` },
    ],
  });
  await prisma.user.createMany({
    data: [
      { id: userId, email: `u-${userId.slice(0, 8)}@test.dev` },
      { id: strangerId, email: `s-${strangerId.slice(0, 8)}@test.dev` },
    ],
  });
  // memberships are RLS-scoped: each insert must run in its own tenant context.
  await forOrg(orgA, (tx) => tx.membership.create({ data: { orgId: orgA, userId, role: 'ADMIN' } }));
  await forOrg(orgB, (tx) => tx.membership.create({ data: { orgId: orgB, userId, role: 'VIEWER' } }));
});

afterAll(async () => {
  // Deleting the orgs cascades to memberships (FK cascade bypasses RLS).
  await prisma.organization.deleteMany({ where: { id: { in: [orgA, orgB] } } });
  await prisma.user.deleteMany({ where: { id: { in: [userId, strangerId] } } });
  await prisma.$disconnect();
});

describe('tenant isolation (RLS)', () => {
  it('scopes reads to the active org only', async () => {
    const inA = await forOrg(orgA, (tx) => tx.membership.findMany());
    expect(inA.length).toBeGreaterThan(0);
    expect(inA.every((m) => m.orgId === orgA)).toBe(true);
    expect(inA.some((m) => m.orgId === orgB)).toBe(false);
  });

  it('fails closed when no tenant context is set', async () => {
    const unscoped = await prisma.membership.findMany();
    expect(unscoped).toHaveLength(0);
  });

  it('cannot write a row into another tenant (WITH CHECK)', async () => {
    await expect(
      forOrg(orgA, (tx) =>
        tx.membership.create({ data: { orgId: orgB, userId: strangerId, role: 'VIEWER' } }),
      ),
    ).rejects.toThrow();
  });

  it('isolates business tables too (use_cases via the loop-applied policy)', async () => {
    const created = await forOrg(orgA, (tx) =>
      tx.useCase.create({ data: { orgId: orgA, name: 'Resume Screener' } }),
    );
    const fromA = await forOrg(orgA, (tx) => tx.useCase.findMany());
    expect(fromA.some((u) => u.id === created.id)).toBe(true);
    const fromB = await forOrg(orgB, (tx) => tx.useCase.findMany());
    expect(fromB.some((u) => u.id === created.id)).toBe(false);
  });
});

describe('organizations hardening (B2)', () => {
  it('cannot UPDATE another tenant organization from a tenant context', async () => {
    await expect(
      forOrg(orgA, (tx) => tx.organization.update({ where: { id: orgB }, data: { name: 'pwned' } })),
    ).rejects.toThrow();
    const untouched = await prisma.organization.findUnique({ where: { id: orgB } });
    expect(untouched?.name).toBe('Org B');
  });

  it('can still UPDATE its own organization', async () => {
    const updated = await forOrg(orgA, (tx) =>
      tx.organization.update({ where: { id: orgA }, data: { name: 'Org A renamed' } }),
    );
    expect(updated.name).toBe('Org A renamed');
  });
});

describe('audit log: tenant-scoped + append-only', () => {
  it('cannot read another tenant audit rows', async () => {
    const rowA = await forOrg(orgA, (tx) =>
      tx.auditLog.create({ data: { orgId: orgA, action: 'test.a', targetType: 'Test' } }),
    );
    await forOrg(orgB, (tx) =>
      tx.auditLog.create({ data: { orgId: orgB, action: 'test.b', targetType: 'Test' } }),
    );
    const fromA = await forOrg(orgA, (tx) => tx.auditLog.findMany());
    expect(fromA.some((r) => r.id === rowA.id)).toBe(true);
    expect(fromA.every((r) => r.orgId === orgA)).toBe(true);
  });

  it('rejects UPDATE by the app role (append-only)', async () => {
    const row = await forOrg(orgA, (tx) =>
      tx.auditLog.create({ data: { orgId: orgA, action: 'test.update', targetType: 'Test' } }),
    );
    await expect(
      forOrg(orgA, (tx) => tx.auditLog.update({ where: { id: row.id }, data: { action: 'tampered' } })),
    ).rejects.toThrow();
  });

  it('rejects DELETE by the app role (append-only)', async () => {
    const row = await forOrg(orgA, (tx) =>
      tx.auditLog.create({ data: { orgId: orgA, action: 'test.delete', targetType: 'Test' } }),
    );
    await expect(
      forOrg(orgA, (tx) => tx.auditLog.delete({ where: { id: row.id } })),
    ).rejects.toThrow();
  });
});
