import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  createUseCaseSchema,
  updateUseCaseSchema,
  transitionUseCaseSchema,
  listUseCasesQuerySchema,
  importUseCasesSchema,
  type CreateUseCaseInput,
  type UpdateUseCaseInput,
  type TransitionUseCaseInput,
  type ListUseCasesQuery,
  type ImportUseCasesInput,
} from '@aegis/contracts';
import type { UseCase } from '@aegis/db';
import { AuthGuard } from '../auth/auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { RequireAction } from '../auth/roles.decorator.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import type { RequestWithSession } from '../auth/session.types.js';
import { UseCasesService } from './use-cases.service.js';

@Controller('use-cases')
@UseGuards(AuthGuard, RolesGuard)
export class UseCasesController {
  constructor(private readonly service: UseCasesService) {}

  @Get()
  @RequireAction('usecase:view')
  list(
    @Req() req: RequestWithSession,
    @Query(new ZodValidationPipe(listUseCasesQuerySchema)) query: ListUseCasesQuery,
  ): Promise<UseCase[]> {
    return this.service.list(req.session!.orgId, query);
  }

  @Post()
  @RequireAction('usecase:create')
  create(
    @Req() req: RequestWithSession,
    @Body(new ZodValidationPipe(createUseCaseSchema)) body: CreateUseCaseInput,
  ): Promise<UseCase> {
    return this.service.create(req.session!.orgId, req.session!.userId, body);
  }

  @Post('import')
  @RequireAction('usecase:create')
  import(
    @Req() req: RequestWithSession,
    @Body(new ZodValidationPipe(importUseCasesSchema)) body: ImportUseCasesInput,
  ): Promise<{ imported: number; useCases: UseCase[] }> {
    return this.service.importCsv(req.session!.orgId, req.session!.userId, body.csv);
  }

  @Get(':id')
  @RequireAction('usecase:view')
  get(@Req() req: RequestWithSession, @Param('id', ParseUUIDPipe) id: string): Promise<UseCase> {
    return this.service.get(req.session!.orgId, id);
  }

  @Patch(':id')
  @RequireAction('usecase:edit')
  update(
    @Req() req: RequestWithSession,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateUseCaseSchema)) body: UpdateUseCaseInput,
  ): Promise<UseCase> {
    return this.service.update(req.session!.orgId, req.session!.userId, id, body);
  }

  @Post(':id/transition')
  @RequireAction('usecase:edit')
  transition(
    @Req() req: RequestWithSession,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(transitionUseCaseSchema)) body: TransitionUseCaseInput,
  ): Promise<UseCase> {
    return this.service.transition(req.session!.orgId, req.session!.userId, id, body.to);
  }
}
