import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import {
  submitAssessmentSchema,
  type SubmitAssessmentInput,
  type AssessmentResultDto,
} from '@aegis/contracts';
import type { RiskAssessment } from '@aegis/db';
import { AuthGuard } from '../auth/auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { RequireAction } from '../auth/roles.decorator.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import type { RequestWithSession } from '../auth/session.types.js';
import { AssessmentsService } from './assessments.service.js';

@Controller('use-cases/:useCaseId/assessments')
@UseGuards(AuthGuard, RolesGuard)
export class AssessmentsController {
  constructor(private readonly service: AssessmentsService) {}

  @Post()
  @RequireAction('risk:assess')
  submit(
    @Req() req: RequestWithSession,
    @Param('useCaseId', ParseUUIDPipe) useCaseId: string,
    @Body(new ZodValidationPipe(submitAssessmentSchema)) body: SubmitAssessmentInput,
  ): Promise<AssessmentResultDto> {
    return this.service.submit(req.session!.orgId, req.session!.userId, useCaseId, body);
  }

  @Get()
  @RequireAction('usecase:view')
  list(
    @Req() req: RequestWithSession,
    @Param('useCaseId', ParseUUIDPipe) useCaseId: string,
  ): Promise<RiskAssessment[]> {
    return this.service.list(req.session!.orgId, useCaseId);
  }
}
