import {
  Injectable,
  NotFoundException,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { forOrg, type UseCase } from '@aegis/db';
import {
  assertTransition,
  InvalidTransitionError,
  canRegisterSystem,
  PLANS,
  type LifecycleState,
  type PlanTier,
} from '@aegis/core';
import type { CreateUseCaseInput, UpdateUseCaseInput, ListUseCasesQuery } from '@aegis/contracts';
import { audit } from '../common/audit.js';
import { parseUseCaseCsv } from './csv.js';
import { OpsService } from '../ops/ops.service.js';

@Injectable()
export class UseCasesService {
  constructor(private readonly ops: OpsService) {}

  list(orgId: string, query: ListUseCasesQuery): Promise<UseCase[]> {
    return forOrg(orgId, (tx) =>
      tx.useCase.findMany({
        where: {
          lifecycle: query.lifecycle,
          riskTier: query.riskTier,
          ...(query.q ? { name: { contains: query.q, mode: 'insensitive' as const } } : {}),
        },
        orderBy: { createdAt: 'desc' },
      }),
    );
  }

  get(orgId: string, id: string): Promise<UseCase> {
    return forOrg(orgId, async (tx) => {
      const useCase = await tx.useCase.findUnique({ where: { id } });
      if (!useCase) {
        throw new NotFoundException('use case not found');
      }
      return useCase;
    });
  }

  create(orgId: string, actorId: string, input: CreateUseCaseInput): Promise<UseCase> {
    return forOrg(orgId, async (tx) => {
      const org = await tx.organization.findUnique({
        where: { id: orgId },
        select: { plan: true },
      });
      const tier = (org?.plan ?? 'FREE') as PlanTier;
      const used = await tx.useCase.count();
      if (!canRegisterSystem(tier, used)) {
        throw new HttpException(
          `Plan limit reached: ${PLANS[tier].name} allows ${PLANS[tier].systemLimit} governed AI systems. Upgrade to register more.`,
          HttpStatus.PAYMENT_REQUIRED,
        );
      }
      const useCase = await tx.useCase.create({
        data: {
          orgId,
          ownerId: actorId,
          name: input.name,
          description: input.description,
          purpose: input.purpose,
        },
      });
      await audit(tx, {
        orgId,
        actorId,
        action: 'usecase.create',
        targetType: 'UseCase',
        targetId: useCase.id,
        after: useCase,
      });
      this.ops.track(orgId, 'system_registered', { useCaseId: useCase.id });
      return useCase;
    });
  }

  update(orgId: string, actorId: string, id: string, input: UpdateUseCaseInput): Promise<UseCase> {
    return forOrg(orgId, async (tx) => {
      const before = await tx.useCase.findUnique({ where: { id } });
      if (!before) {
        throw new NotFoundException('use case not found');
      }
      const useCase = await tx.useCase.update({ where: { id }, data: input });
      await audit(tx, {
        orgId,
        actorId,
        action: 'usecase.update',
        targetType: 'UseCase',
        targetId: id,
        before,
        after: useCase,
      });
      return useCase;
    });
  }

  transition(orgId: string, actorId: string, id: string, to: LifecycleState): Promise<UseCase> {
    return forOrg(orgId, async (tx) => {
      const before = await tx.useCase.findUnique({ where: { id } });
      if (!before) {
        throw new NotFoundException('use case not found');
      }
      try {
        assertTransition(before.lifecycle as LifecycleState, to);
      } catch (error: unknown) {
        if (error instanceof InvalidTransitionError) {
          throw new BadRequestException(error.message);
        }
        throw error;
      }
      const useCase = await tx.useCase.update({ where: { id }, data: { lifecycle: to } });
      await audit(tx, {
        orgId,
        actorId,
        action: 'usecase.transition',
        targetType: 'UseCase',
        targetId: id,
        before: { lifecycle: before.lifecycle },
        after: { lifecycle: to },
      });
      return useCase;
    });
  }

  importCsv(
    orgId: string,
    actorId: string,
    csv: string,
  ): Promise<{ imported: number; useCases: UseCase[] }> {
    let rows;
    try {
      rows = parseUseCaseCsv(csv);
    } catch (error: unknown) {
      throw new BadRequestException(error instanceof Error ? error.message : 'invalid CSV');
    }
    return forOrg(orgId, async (tx) => {
      const created: UseCase[] = [];
      for (const row of rows) {
        const useCase = await tx.useCase.create({
          data: {
            orgId,
            ownerId: actorId,
            name: row.name,
            description: row.description,
            purpose: row.purpose,
          },
        });
        await audit(tx, {
          orgId,
          actorId,
          action: 'usecase.import',
          targetType: 'UseCase',
          targetId: useCase.id,
          after: useCase,
        });
        created.push(useCase);
      }
      return { imported: created.length, useCases: created };
    });
  }
}
