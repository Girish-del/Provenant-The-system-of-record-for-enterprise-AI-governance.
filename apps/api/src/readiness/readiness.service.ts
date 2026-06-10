import { Injectable, NotFoundException } from '@nestjs/common';
import { forOrg } from '@aegis/db';
import { computeReadiness, requiredControlCategories, type ControlState } from '@aegis/core';
import type { UseCaseReadinessDto, PortfolioReadinessDto } from '@aegis/contracts';

interface EvidenceRef {
  scanStatus: string;
}
interface MappingRef {
  controlId: string;
  status: ControlState['status'];
  evidence: EvidenceRef[];
}

function statesFor(
  requiredControls: { id: string; code: string }[],
  mappings: MappingRef[],
): ControlState[] {
  const byControl = new Map(mappings.map((m) => [m.controlId, m]));
  return requiredControls.map((control) => {
    const mapping = byControl.get(control.id);
    return {
      controlId: control.id,
      code: control.code,
      mapped: Boolean(mapping),
      status: mapping?.status ?? null,
      cleanEvidenceCount: mapping
        ? mapping.evidence.filter((e) => e.scanStatus === 'CLEAN').length
        : 0,
    };
  });
}

@Injectable()
export class ReadinessService {
  useCaseReadiness(orgId: string, useCaseId: string): Promise<UseCaseReadinessDto> {
    return forOrg(orgId, async (tx) => {
      const useCase = await tx.useCase.findUnique({ where: { id: useCaseId } });
      if (!useCase) {
        throw new NotFoundException('use case not found');
      }
      const categories = requiredControlCategories(useCase.riskTier);
      const requiredControls =
        categories.length > 0
          ? await tx.control.findMany({
              where: { framework: { key: 'EU_AI_ACT' }, category: { in: categories } },
              select: { id: true, code: true },
            })
          : [];
      const mappings = await tx.controlMapping.findMany({
        where: { useCaseId },
        select: { controlId: true, status: true, evidence: { select: { scanStatus: true } } },
      });
      return {
        useCaseId,
        name: useCase.name,
        riskTier: useCase.riskTier,
        summary: computeReadiness(statesFor(requiredControls, mappings)),
      };
    });
  }

  portfolio(orgId: string): Promise<PortfolioReadinessDto> {
    return forOrg(orgId, async (tx) => {
      const useCases = await tx.useCase.findMany({
        select: { id: true, riskTier: true, lifecycle: true },
      });
      const euControls = await tx.control.findMany({
        where: { framework: { key: 'EU_AI_ACT' } },
        select: { id: true, code: true, category: true },
      });
      const mappings = await tx.controlMapping.findMany({
        select: {
          useCaseId: true,
          controlId: true,
          status: true,
          evidence: { select: { scanStatus: true } },
        },
      });

      const mappingsByUseCase = new Map<string, MappingRef[]>();
      for (const mapping of mappings) {
        const list = mappingsByUseCase.get(mapping.useCaseId) ?? [];
        list.push(mapping);
        mappingsByUseCase.set(mapping.useCaseId, list);
      }

      const byRiskTier: Record<string, number> = {};
      const byLifecycle: Record<string, number> = {};
      let auditReady = 0;
      let sumPct = 0;
      let highRiskNotReady = 0;

      for (const useCase of useCases) {
        byRiskTier[useCase.riskTier] = (byRiskTier[useCase.riskTier] ?? 0) + 1;
        byLifecycle[useCase.lifecycle] = (byLifecycle[useCase.lifecycle] ?? 0) + 1;

        const categories = requiredControlCategories(useCase.riskTier);
        const requiredControls = euControls.filter(
          (c) => c.category !== null && categories.includes(c.category),
        );
        const summary = computeReadiness(
          statesFor(requiredControls, mappingsByUseCase.get(useCase.id) ?? []),
        );
        sumPct += summary.readinessPct;
        if (summary.readinessPct === 100) {
          auditReady += 1;
        }
        if (
          (useCase.riskTier === 'HIGH' || useCase.riskTier === 'PROHIBITED') &&
          summary.readinessPct < 100
        ) {
          highRiskNotReady += 1;
        }
      }

      const total = useCases.length;
      return {
        totalUseCases: total,
        byRiskTier,
        byLifecycle,
        auditReady,
        notReady: total - auditReady,
        avgReadinessPct: total === 0 ? 100 : Math.round(sumPct / total),
        highRiskNotReady,
      };
    });
  }
}
