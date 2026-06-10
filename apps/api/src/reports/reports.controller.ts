import { Controller, Get, Header, Param, ParseUUIDPipe, Req, UseGuards } from '@nestjs/common';
import { renderReadinessReportMarkdown, type ReadinessReport } from '@aegis/core';
import { AuthGuard } from '../auth/auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { RequireAction } from '../auth/roles.decorator.js';
import type { RequestWithSession } from '../auth/session.types.js';
import { ReportsService } from './reports.service.js';

@Controller('use-cases/:useCaseId')
@UseGuards(AuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('report')
  @RequireAction('report:export')
  json(
    @Req() req: RequestWithSession,
    @Param('useCaseId', ParseUUIDPipe) useCaseId: string,
  ): Promise<ReadinessReport> {
    return this.service.build(req.session!.orgId, useCaseId);
  }

  @Get('report.md')
  @RequireAction('report:export')
  @Header('Content-Type', 'text/markdown; charset=utf-8')
  async markdown(
    @Req() req: RequestWithSession,
    @Param('useCaseId', ParseUUIDPipe) useCaseId: string,
  ): Promise<string> {
    const report = await this.service.build(req.session!.orgId, useCaseId);
    return renderReadinessReportMarkdown(report);
  }
}
