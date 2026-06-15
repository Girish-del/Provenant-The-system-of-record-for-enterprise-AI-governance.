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
      // Review routing (B6): record the review as a workflow with SLA-tracked steps.
      // Approval state stays the single source of truth; tasks add assignability,
      // due dates, and an exec-visible trail. Temporal is the scale-out path.
      // Default 5 business-ish days. Guard against an empty/invalid env value
      // (`Number('')` is 0, which would make every step instantly overdue).
      const parsedSla = Number(process.env.REVIEW_SLA_DAYS);
      const slaDays = Number.isFinite(parsedSla) && parsedSla > 0 ? parsedSla : 5;
      const dueAt = new Date(Date.now() + slaDays * 86_400_000);
      await tx.workflow.create({
        data: {
          orgId,
          useCaseId,
          type: 'use-case-review',
          status: 'open',
          tasks: {
            create: [
              { orgId, title: 'Compliance review', dueAt },
              { orgId, title: 'Final approval decision', dueAt },
            ],
          },
        },
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
      // Close out the review workflow's open steps with the decision.
      const workflow = await tx.workflow.findFirst({
        where: { useCaseId: approval.useCaseId, type: 'use-case-review', status: 'open' },
        orderBy: { createdAt: 'desc' },
      });
      if (workflow) {
        await tx.task.updateMany({
          where: { workflowId: workflow.id, status: { not: 'DONE' } },
          data: { status: 'DONE', assigneeId: actorId },
        });
        await tx.workflow.update({
          where: { id: workflow.id },
          data: { status: input.decision === 'APPROVED' ? 'completed' : 'rejected' },
        });
      }
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

  /** The review workflow (steps, assignees, SLA due dates) for a use case. */
  workflowFor(orgId: string, useCaseId: string): Promise<unknown> {
    return forOrg(orgId, async (tx) => {
      const workflow = await tx.workflow.findFirst({
        where: { useCaseId, type: 'use-case-review' },
        orderBy: { createdAt: 'desc' },
        include: { tasks: { orderBy: { createdAt: 'asc' } } },
      });
      if (!workflow) {
        return null;
      }
      return {
        id: workflow.id,
        status: workflow.status,
        createdAt: workflow.createdAt.toISOString(),
        steps: workflow.tasks.map((t) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          assigneeId: t.assigneeId,
          dueAt: t.dueAt ? t.dueAt.toISOString() : null,
          overdue: t.status !== 'DONE' && t.dueAt !== null && t.dueAt < new Date(),
        })),
      };
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
