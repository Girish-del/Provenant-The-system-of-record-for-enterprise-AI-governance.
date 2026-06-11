import { Body, Controller, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';
import { AuthGuard } from '../auth/auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { RequireAction } from '../auth/roles.decorator.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import type { RequestWithSession } from '../auth/session.types.js';
import { AiService, type AiDraftResult, type AiProvenance, type AiSuggestion } from './ai.service.js';

const draftSchema = z.object({ kind: z.enum(['risk_summary', 'fria', 'dpia']) });
type DraftInput = z.infer<typeof draftSchema>;

@Controller('use-cases/:useCaseId/ai')
@UseGuards(AuthGuard, RolesGuard)
export class AiController {
  constructor(private readonly service: AiService) {}

  @Post('draft')
  @RequireAction('usecase:edit')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  draft(
    @Req() req: RequestWithSession,
    @Param('useCaseId', ParseUUIDPipe) useCaseId: string,
    @Body(new ZodValidationPipe(draftSchema)) body: DraftInput,
  ): Promise<AiDraftResult> {
    return this.service.draft(req.session!.orgId, req.session!.userId, useCaseId, body.kind);
  }

  @Post('suggest-controls')
  @RequireAction('control:map')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  suggest(
    @Req() req: RequestWithSession,
    @Param('useCaseId', ParseUUIDPipe) useCaseId: string,
  ): Promise<{ suggestions: AiSuggestion[]; provenance: AiProvenance }> {
    return this.service.suggestControls(req.session!.orgId, req.session!.userId, useCaseId);
  }
}
