import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { forOrg, type Approval } from '@aegis/db';
import { assertTransition, InvalidTransitionError, type LifecycleState } from '@aegis/core';
import type {
  SubmitForReviewInput,
  DecideApprovalInput,
  ApprovalDto,
} from '@aegis/contracts';
import { audit } from '../common/audit.js';
import { OpsService } from '../ops/ops.service.js';

function toDto(a: Approval): ApprovalDto {
  return {
    id: a.id,
    useCaseId: a.useCaseId,
    decision: a.decision,
    comment: a.comment,
    approverId: a.approverId,
    decidedAt: a.decidedAt ? a.decidedAt.toISOString() : null,
    createdAt: a.createdAt.toISOString(),
  };
}

@Injectable()
export class ApprovalsService {
  constructor(private readonly ops: OpsService) {}

  submitForReview(
    orgId: string,
    actorId: string,
    useCaseId: string,
    input: SubmitForReviewInput,
  ): Promise<ApprovalDto> {
    return forOrg(orgId, async (tx) => {
      const useCase = await tx.useCase.findUnique({ where: { id: useCaseId } });
      if (!useCase) {
        throw new NotFoundException('use case not found');
      }
      try {
        assertTransition(useCase.lifecycle as LifecycleState, 'IN_REVIEW');
      } catch (error: unknown) {
        if (error instanceof InvalidTransitionError) {
          throw new BadRequestException(`cannot submit for review from ${useCase.lifecycle}`);
        }
        throw error;
      }
      await tx.useCase.update({ where: { id: useCaseId }, data: { lifecycle: 'IN_REVIEW' } });
      const approval = await tx.approval.create({
        data: { orgId, useCaseId, comment: input.comment },
      });
      await audit(tx, {
        orgId,
        actorId,
        action: 'usecase.submit_for_review',
        targetType: 'UseCase',
        targetId: useCaseId,
        before: { lifecycle: useCase.lifecycle },
        after: { lifecycle: 'IN_REVIEW', approvalId: approval.id },
      });
      return toDto(approval);
    });
  }

  decide(
    orgId: string,
    actorId: string,
    approvalId: string,
    input: DecideApprovalInput,
  ): Promise<ApprovalDto> {
    return forOrg(orgId, async (tx) => {
      const approval = await tx.approval.findUnique({ where: { id: approvalId } });
      if (!approval) {
        throw new NotFoundException('approval not found');
      }
      if (approval.decision !== 'PENDING') {
        throw new ConflictException('approval already decided');
      }
      const useCase = await tx.useCase.findUnique({ where: { id: approval.useCaseId } });
      if (!useCase) {
        throw new NotFoundException('use case not found');
      }
      const target: LifecycleState = input.decision === 'APPROVED' ? 'APPROVED' : 'PROPOSED';
      try {
        assertTransition(useCase.lifecycle as LifecycleState, target);
      } catch (error: unknown) {
        if (error instanceof InvalidTransitionError) {
          throw new BadRequestException(
            `cannot ${input.decision.toLowerCase()} from ${useCase.lifecycle}`,
          );
        }
        throw error;
      }
      const updated = await tx.approval.update({
        where: { id: approvalId },
        data: {
          decision: input.decision,
          comment: input.comment ?? approval.comment,
          approverId: actorId,
          decidedAt: new Date(),
        },
      });
      await tx.useCase.update({ where: { id: approval.useCaseId }, data: { lifecycle: target } });
      await audit(tx, {
        orgId,
        actorId,
        action: 'approval.decide',
        targetType: 'Approval',
        targetId: approvalId,
        before: { decision: 'PENDING', lifecycle: useCase.lifecycle },
        after: { decision: input.decision, lifecycle: target },
      });
      this.ops.track(orgId, 'approval_decided', { decision: input.decision });
      return toDto(updated);
    });
  }

  listForUseCase(orgId: string, useCaseId: string): Promise<ApprovalDto[]> {
    return forOrg(orgId, async (tx) => {
      const items = await tx.approval.findMany({
        where: { useCaseId },
        orderBy: { createdAt: 'desc' },
      });
      return items.map(toDto);
    });
  }

  queue(orgId: string, status?: 'PENDING' | 'APPROVED' | 'REJECTED'): Promise<ApprovalDto[]> {
    return forOrg(orgId, async (tx) => {
      const items = await tx.approval.findMany({
        where: status ? { decision: status } : {},
        orderBy: { createdAt: 'desc' },
      });
      return items.map(toDto);
    });
  }
}
