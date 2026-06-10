import { Injectable, NotFoundException } from '@nestjs/common';
import { forOrg } from '@aegis/db';
import {
  computeReadiness,
  requiredControlCategories,
  type ControlState,
  type ReadinessReport,
} from '@aegis/core';

@Injectable()
export class ReportsService {
  build(orgId: string, useCaseId: string): Promise<ReadinessReport> {
    return forOrg(orgId, async (tx) => {
      const useCase = await tx.useCase.findUnique({ where: { id: useCaseId } });
      if (!useCase) {
        throw new NotFoundException('use case not found');
      }
      const org = await tx.organization.findUnique({ where: { id: orgId }, select: { name: true } });
      const assessment = await tx.riskAssessment.findFirst({
        where: { useCaseId },
        orderBy: { createdAt: 'desc' },
      });
      const mappings = await tx.controlMapping.findMany({
        where: { useCaseId },
        include: {
          control: { include: { framework: { select: { key: true } } } },
          evidence: { select: { scanStatus: true } },
        },
        orderBy: { createdAt: 'asc' },
      });
      const approvals = await tx.approval.findMany({
        where: { useCaseId },
        orderBy: { createdAt: 'asc' },
      });

      const approverIds = [
        ...new Set(approvals.map((a) => a.approverId).filter((id): id is string => Boolean(id))),
      ];
      const approvers = approverIds.length
        ? await tx.user.findMany({ where: { id: { in: approverIds } }, select: { id: true, email: true } })
        : [];
      const emailById = new Map(approvers.map((u) => [u.id, u.email]));

      const categories = requiredControlCategories(useCase.riskTier);
      const requiredControls =
        categories.length > 0
          ? await tx.control.findMany({
              where: { framework: { key: 'EU_AI_ACT' }, category: { in: categories } },
              select: { id: true, code: true },
            })
          : [];
      const byControl = new Map(mappings.map((m) => [m.controlId, m]));
      const states: ControlState[] = requiredControls.map((c) => {
        const mapping = byControl.get(c.id);
        return {
          controlId: c.id,
          code: c.code,
          mapped: Boolean(mapping),
          status: mapping?.status ?? null,
          cleanEvidenceCount: mapping
            ? mapping.evidence.filter((e) => e.scanStatus === 'CLEAN').length
            : 0,
        };
      });

      return {
        org: org?.name ?? 'Unknown organization',
        generatedAt: new Date().toISOString(),
        useCase: {
          id: useCase.id,
          name: useCase.name,
          description: useCase.description,
          purpose: useCase.purpose,
          lifecycle: useCase.lifecycle,
          riskTier: useCase.riskTier,
          createdAt: useCase.createdAt.toISOString(),
        },
        assessment: assessment
          ? {
              tier: assessment.computedTier,
              rationale: assessment.rationale ?? '',
              createdAt: assessment.createdAt.toISOString(),
            }
          : null,
        readiness: computeReadiness(states),
        controls: mappings.map((m) => ({
          framework: m.control.framework.key,
          code: m.control.code,
          title: m.control.title,
          status: m.status,
          evidenceCount: m.evidence.length,
          cleanEvidenceCount: m.evidence.filter((e) => e.scanStatus === 'CLEAN').length,
        })),
        approvals: approvals.map((a) => ({
          decision: a.decision,
          comment: a.comment,
          approver: a.approverId ? (emailById.get(a.approverId) ?? null) : null,
          decidedAt: a.decidedAt ? a.decidedAt.toISOString() : null,
        })),
      };
    });
  }
}
