import { Controller, Get, Param, ParseUUIDPipe, Req, UseGuards } from '@nestjs/common';
import type { UseCaseReadinessDto, PortfolioReadinessDto } from '@aegis/contracts';
import { AuthGuard } from '../auth/auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { RequireAction } from '../auth/roles.decorator.js';
import type { RequestWithSession } from '../auth/session.types.js';
import { ReadinessService } from './readiness.service.js';

@Controller()
@UseGuards(AuthGuard, RolesGuard)
export class ReadinessController {
  constructor(private readonly service: ReadinessService) {}

  @Get('use-cases/:useCaseId/readiness')
  @RequireAction('usecase:view')
  useCase(
    @Req() req: RequestWithSession,
    @Param('useCaseId', ParseUUIDPipe) useCaseId: string,
  ): Promise<UseCaseReadinessDto> {
    return this.service.useCaseReadiness(req.session!.orgId, useCaseId);
  }

  @Get('readiness')
  @RequireAction('usecase:view')
  portfolio(@Req() req: RequestWithSession): Promise<PortfolioReadinessDto> {
    return this.service.portfolio(req.session!.orgId);
  }
}
