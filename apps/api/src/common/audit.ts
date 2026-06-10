import { createHash } from 'node:crypto';
import { Prisma, type TenantClient } from '@aegis/db';
import { computeEntryHash, type AuditEntryContent } from '@aegis/core';

const sha256 = (input: string): string => createHash('sha256').update(input).digest('hex');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface AuditEntry {
  orgId: string;
  actorId?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  before?: unknown;
  after?: unknown;
}

function toJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

/**
 * Append a tamper-evident entry to the tenant's audit log. Must run inside a
 * `forOrg` transaction. Takes a per-org advisory lock so concurrent writers
 * cannot fork the hash chain, then chains the new entry onto the previous one.
 */
export async function audit(tx: TenantClient, entry: AuditEntry): Promise<void> {
  if (!UUID.test(entry.orgId)) {
    throw new Error('audit: orgId must be a UUID');
  }
  // Serialize audit appends for this org (released at transaction end). The lock
  // function returns void (which Prisma cannot deserialize), so it is wrapped in a
  // subquery and a real column is selected instead.
  await tx.$queryRawUnsafe(
    `SELECT 1 AS ok FROM (SELECT pg_advisory_xact_lock(hashtext('${entry.orgId}')::bigint)) _lock`,
  );

  const last = await tx.auditLog.findFirst({
    where: { orgId: entry.orgId },
    orderBy: { seq: 'desc' },
    select: { entryHash: true },
  });
  const prevHash = last?.entryHash ?? null;

  const occurredAt = new Date();
  const beforeJson = toJson(entry.before);
  const afterJson = toJson(entry.after);

  const content: AuditEntryContent = {
    orgId: entry.orgId,
    actorId: entry.actorId ?? null,
    action: entry.action,
    targetType: entry.targetType,
    targetId: entry.targetId ?? null,
    before: beforeJson ?? null,
    after: afterJson ?? null,
    occurredAt: occurredAt.toISOString(),
  };
  const entryHash = computeEntryHash(prevHash, content, sha256);

  await tx.auditLog.create({
    data: {
      orgId: entry.orgId,
      actorId: entry.actorId ?? undefined,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId ?? undefined,
      before: beforeJson,
      after: afterJson,
      occurredAt,
      prevHash,
      entryHash,
    },
  });
}
