import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { ROLES } from '@aegis/core';
import { AuthGuard } from '../auth/auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { RequireAction } from '../auth/roles.decorator.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import type { RequestWithSession } from '../auth/session.types.js';
import { MembershipsService, type MemberDto } from './memberships.service.js';

const inviteSchema = z.object({ email: z.string().email().max(254), role: z.enum(ROLES) });
type InviteInput = z.infer<typeof inviteSchema>;

const roleSchema = z.object({ role: z.enum(ROLES) });
type RoleInput = z.infer<typeof roleSchema>;

@Controller('memberships')
@UseGuards(AuthGuard, RolesGuard)
export class MembershipsController {
  constructor(private readonly service: MembershipsService) {}

  @Get()
  @RequireAction('member:manage')
  list(@Req() req: RequestWithSession): Promise<MemberDto[]> {
    return this.service.list(req.session!.orgId);
  }

  @Post('invite')
  @RequireAction('member:manage')
  invite(
    @Req() req: RequestWithSession,
    @Body(new ZodValidationPipe(inviteSchema)) body: InviteInput,
  ): Promise<MemberDto> {
    return this.service.invite(req.session!.orgId, req.session!.userId, body.email, body.role);
  }

  @Patch(':id')
  @RequireAction('member:manage')
  changeRole(
    @Req() req: RequestWithSession,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(roleSchema)) body: RoleInput,
  ): Promise<MemberDto> {
    return this.service.changeRole(req.session!.orgId, req.session!.userId, id, body.role);
  }

  @Delete(':id')
  @RequireAction('member:manage')
  remove(
    @Req() req: RequestWithSession,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ removed: true }> {
    return this.service.remove(req.session!.orgId, req.session!.userId, id);
  }
}
