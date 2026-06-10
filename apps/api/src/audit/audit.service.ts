import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { forOrg } from '@aegis/db';
import { verifyAuditChain, type ChainEntry, type ChainVerification } from '@aegis/core';

const sha256 = (input: string): string => createHash('sha256').update(input).digest('hex');

export interface AuditLogEntryDto {
  id: string;
  action: string;
  targetType: string;
  targetId: string | null;
  actorId: string | null;
  occurredAt: string;
  entryHash: string | null;
}

@Injectable()
export class AuditService {
  /** Recompute the tenant's audit hash chain and report the first break, if any. */
  verifyChain(orgId: string): Promise<ChainVerification> {
    return forOrg(orgId, async (tx) => {
      const rows = await tx.auditLog.findMany({ where: { orgId }, orderBy: { seq: 'asc' } });
      const entries: ChainEntry[] = rows.map((r) => ({
        orgId: r.orgId,
        actorId: r.actorId,
        action: r.action,
        targetType: r.targetType,
        targetId: r.targetId,
        before: r.before ?? null,
        after: r.after ?? null,
        occurredAt: r.occurredAt.toISOString(),
        prevHash: r.prevHash,
        entryHash: r.entryHash,
      }));
      return verifyAuditChain(entries, sha256);
    });
  }

  recent(orgId: string, limit = 50): Promise<AuditLogEntryDto[]> {
    return forOrg(orgId, async (tx) => {
      const rows = await tx.auditLog.findMany({
        where: { orgId },
        orderBy: { seq: 'desc' },
        take: limit,
      });
      return rows.map((r) => ({
        id: r.id,
        action: r.action,
        targetType: r.targetType,
        targetId: r.targetId,
        actorId: r.actorId,
        occurredAt: r.occurredAt.toISOString(),
        entryHash: r.entryHash,
      }));
    });
  }
}
