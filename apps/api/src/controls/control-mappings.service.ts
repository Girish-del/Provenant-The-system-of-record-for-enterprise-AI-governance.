import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { forOrg, Prisma, type ControlMapping } from '@aegis/db';
import { requiredControlCategories } from '@aegis/core';
import type {
  MapControlInput,
  UpdateControlMappingInput,
  ControlMappingDto,
} from '@aegis/contracts';
import { audit } from '../common/audit.js';

@Injectable()
export class ControlMappingsService {
  list(orgId: string, useCaseId: string): Promise<ControlMappingDto[]> {
    return forOrg(orgId, async (tx) => {
      const mappings = await tx.controlMapping.findMany({
        where: { useCaseId },
        include: {
          control: { include: { framework: true } },
          _count: { select: { evidence: true } },
        },
        orderBy: { createdAt: 'asc' },
      });
      return mappings.map((m) => ({
        id: m.id,
        status: m.status,
        notes: m.notes,
        control: {
          id: m.control.id,
          code: m.control.code,
          title: m.control.title,
          framework: m.control.framework.key,
        },
        evidenceCount: m._count.evidence,
      }));
    });
  }

  map(
    orgId: string,
    actorId: string,
    useCaseId: string,
    input: MapControlInput,
  ): Promise<ControlMapping> {
    return forOrg(orgId, async (tx) => {
      const useCase = await tx.useCase.findUnique({ where: { id: useCaseId } });
      if (!useCase) {
        throw new NotFoundException('use case not found');
      }
      const control = await tx.control.findUnique({ where: { id: input.controlId } });
      if (!control) {
        throw new BadRequestException('unknown control');
      }
      try {
        const mapping = await tx.controlMapping.create({
          data: { orgId, useCaseId, controlId: input.controlId, notes: input.notes },
        });
        await audit(tx, {
          orgId,
          actorId,
          action: 'control.map',
          targetType: 'ControlMapping',
          targetId: mapping.id,
          after: { controlId: input.controlId },
        });
        return mapping;
      } catch (error: unknown) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          throw new BadRequestException('control already mapped to this use case');
        }
        throw error;
      }
    });
  }

  suggest(orgId: string, actorId: string, useCaseId: string): Promise<{ added: number }> {
    return forOrg(orgId, async (tx) => {
      const useCase = await tx.useCase.findUnique({ where: { id: useCaseId } });
      if (!useCase) {
        throw new NotFoundException('use case not found');
      }
      const categories = requiredControlCategories(useCase.riskTier);
      if (categories.length === 0) {
        return { added: 0 };
      }
      const controls = await tx.control.findMany({
        where: { framework: { key: 'EU_AI_ACT' }, category: { in: categories } },
      });
      const existing = await tx.controlMapping.findMany({
        where: { useCaseId },
        select: { controlId: true },
      });
      const have = new Set(existing.map((e) => e.controlId));
      let added = 0;
      for (const control of controls) {
        if (have.has(control.id)) {
          continue;
        }
        const mapping = await tx.controlMapping.create({
          data: { orgId, useCaseId, controlId: control.id },
        });
        await audit(tx, {
          orgId,
          actorId,
          action: 'control.suggest',
          targetType: 'ControlMapping',
          targetId: mapping.id,
          after: { controlId: control.id },
        });
        added += 1;
      }
      return { added };
    });
  }

  update(
    orgId: string,
    actorId: string,
    useCaseId: string,
    mappingId: string,
    input: UpdateControlMappingInput,
  ): Promise<ControlMapping> {
    return forOrg(orgId, async (tx) => {
      const before = await tx.controlMapping.findFirst({ where: { id: mappingId, useCaseId } });
      if (!before) {
        throw new NotFoundException('control mapping not found');
      }
      const mapping = await tx.controlMapping.update({
        where: { id: mappingId },
        data: { status: input.status, notes: input.notes },
      });
      await audit(tx, {
        orgId,
        actorId,
        action: 'control.update',
        targetType: 'ControlMapping',
        targetId: mappingId,
        before: { status: before.status, notes: before.notes },
        after: { status: mapping.status, notes: mapping.notes },
      });
      return mapping;
    });
  }
}
