import { Prisma, type TenantClient } from '@aegis/db';

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
 * Append an entry to the tenant's append-only audit log. Must be called inside a
 * `forOrg` transaction so it shares the tenant context (RLS) and commits atomically
 * with the mutation it records.
 */
export async function audit(tx: TenantClient, entry: AuditEntry): Promise<void> {
  await tx.auditLog.create({
    data: {
      orgId: entry.orgId,
      actorId: entry.actorId ?? undefined,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId ?? undefined,
      before: toJson(entry.before),
      after: toJson(entry.after),
    },
  });
}
