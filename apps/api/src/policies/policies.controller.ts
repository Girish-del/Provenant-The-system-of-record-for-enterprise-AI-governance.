import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { forOrg, type Policy } from '@aegis/db';
import { AuthGuard } from '../auth/auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { RequireAction } from '../auth/roles.decorator.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import type { RequestWithSession } from '../auth/session.types.js';
import { audit } from '../common/audit.js';

const createSchema = z.object({ title: z.string().min(1).max(200), body: z.string().max(50_000).optional() });
type CreateInput = z.infer<typeof createSchema>;

const updateSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    body: z.string().max(50_000).optional(),
    status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'no changes provided' });
type UpdateInput = z.infer<typeof updateSchema>;

@Controller('policies')
@UseGuards(AuthGuard, RolesGuard)
export class PoliciesController {
  @Get()
  @RequireAction('usecase:view')
  list(@Req() req: RequestWithSession): Promise<Policy[]> {
    return forOrg(req.session!.orgId, (tx) =>
      tx.policy.findMany({ orderBy: { updatedAt: 'desc' } }),
    );
  }

  @Post()
  @RequireAction('org:manage')
  create(
    @Req() req: RequestWithSession,
    @Body(new ZodValidationPipe(createSchema)) body: CreateInput,
  ): Promise<Policy> {
    const { orgId, userId } = req.session!;
    return forOrg(orgId, async (tx) => {
      const policy = await tx.policy.create({
        data: { orgId, title: body.title, body: body.body },
      });
      await audit(tx, {
        orgId,
        actorId: userId,
        action: 'policy.create',
        targetType: 'Policy',
        targetId: policy.id,
        after: { title: policy.title },
      });
      return policy;
    });
  }

  @Patch(':id')
  @RequireAction('org:manage')
  update(
    @Req() req: RequestWithSession,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateSchema)) body: UpdateInput,
  ): Promise<Policy> {
    const { orgId, userId } = req.session!;
    return forOrg(orgId, async (tx) => {
      const before = await tx.policy.findUnique({ where: { id } });
      if (!before) {
        throw new NotFoundException('policy not found');
      }
      const policy = await tx.policy.update({
        where: { id },
        data: {
          ...body,
          // A body change is a new policy version (content is versioned, like the framework library).
          ...(body.body !== undefined && body.body !== before.body
            ? { version: before.version + 1 }
            : {}),
        },
      });
      await audit(tx, {
        orgId,
        actorId: userId,
        action: 'policy.update',
        targetType: 'Policy',
        targetId: id,
        before: { title: before.title, status: before.status, version: before.version },
        after: { title: policy.title, status: policy.status, version: policy.version },
      });
      return policy;
    });
  }
}
