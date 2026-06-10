import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { ChainVerification } from '@aegis/core';
import { AuthGuard } from '../auth/auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { RequireAction } from '../auth/roles.decorator.js';
import type { RequestWithSession } from '../auth/session.types.js';
import { AuditService, type AuditLogEntryDto } from './audit.service.js';

@Controller('audit')
@UseGuards(AuthGuard, RolesGuard)
export class AuditController {
  constructor(private readonly service: AuditService) {}

  @Get('chain/verify')
  @RequireAction('org:manage')
  verify(@Req() req: RequestWithSession): Promise<ChainVerification> {
    return this.service.verifyChain(req.session!.orgId);
  }

  @Get()
  @RequireAction('org:manage')
  recent(@Req() req: RequestWithSession): Promise<AuditLogEntryDto[]> {
    return this.service.recent(req.session!.orgId);
  }
}
