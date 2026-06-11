import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  submitForReviewSchema,
  decideApprovalSchema,
  approvalQueueQuerySchema,
  type SubmitForReviewInput,
  type DecideApprovalInput,
  type ApprovalQueueQuery,
  type ApprovalDto,
} from '@aegis/contracts';
import { AuthGuard } from '../auth/auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { RequireAction } from '../auth/roles.decorator.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import type { RequestWithSession } from '../auth/session.types.js';
import { ApprovalsService } from './approvals.service.js';

@Controller()
@UseGuards(AuthGuard, RolesGuard)
export class ApprovalsController {
  constructor(private readonly service: ApprovalsService) {}

  @Post('use-cases/:useCaseId/submit-for-review')
  @RequireAction('usecase:edit')
  submit(
    @Req() req: RequestWithSession,
    @Param('useCaseId', ParseUUIDPipe) useCaseId: string,
    @Body(new ZodValidationPipe(submitForReviewSchema)) body: SubmitForReviewInput,
  ): Promise<ApprovalDto> {
    return this.service.submitForReview(req.session!.orgId, req.session!.userId, useCaseId, body);
  }

  @Get('use-cases/:useCaseId/approvals')
  @RequireAction('usecase:view')
  listForUseCase(
    @Req() req: RequestWithSession,
    @Param('useCaseId', ParseUUIDPipe) useCaseId: string,
  ): Promise<ApprovalDto[]> {
    return this.service.listForUseCase(req.session!.orgId, useCaseId);
  }

  @Post('approvals/:approvalId/decide')
  @RequireAction('review:decide')
  decide(
    @Req() req: RequestWithSession,
    @Param('approvalId', ParseUUIDPipe) approvalId: string,
    @Body(new ZodValidationPipe(decideApprovalSchema)) body: DecideApprovalInput,
  ): Promise<ApprovalDto> {
    return this.service.decide(req.session!.orgId, req.session!.userId, approvalId, body);
  }

  @Get('approvals')
  @RequireAction('usecase:view')
  queue(
    @Req() req: RequestWithSession,
    @Query(new ZodValidationPipe(approvalQueueQuerySchema)) query: ApprovalQueueQuery,
  ): Promise<ApprovalDto[]> {
    return this.service.queue(req.session!.orgId, query.status);
  }

  @Get('use-cases/:useCaseId/workflow')
  @RequireAction('usecase:view')
  workflow(
    @Req() req: RequestWithSession,
    @Param('useCaseId', ParseUUIDPipe) useCaseId: string,
  ): Promise<unknown> {
    return this.service.workflowFor(req.session!.orgId, useCaseId);
  }
}
