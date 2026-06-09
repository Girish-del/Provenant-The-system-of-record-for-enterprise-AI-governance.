import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { forOrg } from '@aegis/db';
import { AuthGuard } from '../auth/auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { RequireAction } from '../auth/roles.decorator.js';
import type { RequestWithSession } from '../auth/session.types.js';

/** Sample org-scoped, RBAC-gated endpoint: lists members of the active org. */
@Controller('memberships')
@UseGuards(AuthGuard, RolesGuard)
export class MembershipsController {
  @Get()
  @RequireAction('member:manage')
  async list(@Req() req: RequestWithSession): Promise<unknown> {
    const session = req.session!;
    return forOrg(session.orgId, (tx) =>
      tx.membership.findMany({ include: { user: { select: { id: true, email: true } } } }),
    );
  }
}
