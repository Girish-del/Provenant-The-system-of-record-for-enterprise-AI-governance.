import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  mapControlSchema,
  updateControlMappingSchema,
  type MapControlInput,
  type UpdateControlMappingInput,
  type ControlMappingDto,
} from '@aegis/contracts';
import type { ControlMapping } from '@aegis/db';
import { AuthGuard } from '../auth/auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { RequireAction } from '../auth/roles.decorator.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import type { RequestWithSession } from '../auth/session.types.js';
import { ControlMappingsService } from './control-mappings.service.js';

@Controller('use-cases/:useCaseId/controls')
@UseGuards(AuthGuard, RolesGuard)
export class ControlMappingsController {
  constructor(private readonly service: ControlMappingsService) {}

  @Get()
  @RequireAction('usecase:view')
  list(
    @Req() req: RequestWithSession,
    @Param('useCaseId', ParseUUIDPipe) useCaseId: string,
  ): Promise<ControlMappingDto[]> {
    return this.service.list(req.session!.orgId, useCaseId);
  }

  @Post()
  @RequireAction('control:map')
  map(
    @Req() req: RequestWithSession,
    @Param('useCaseId', ParseUUIDPipe) useCaseId: string,
    @Body(new ZodValidationPipe(mapControlSchema)) body: MapControlInput,
  ): Promise<ControlMapping> {
    return this.service.map(req.session!.orgId, req.session!.userId, useCaseId, body);
  }

  @Post('suggest')
  @RequireAction('control:map')
  suggest(
    @Req() req: RequestWithSession,
    @Param('useCaseId', ParseUUIDPipe) useCaseId: string,
  ): Promise<{ added: number }> {
    return this.service.suggest(req.session!.orgId, req.session!.userId, useCaseId);
  }

  @Patch(':mappingId')
  @RequireAction('control:map')
  update(
    @Req() req: RequestWithSession,
    @Param('useCaseId', ParseUUIDPipe) useCaseId: string,
    @Param('mappingId', ParseUUIDPipe) mappingId: string,
    @Body(new ZodValidationPipe(updateControlMappingSchema)) body: UpdateControlMappingInput,
  ): Promise<ControlMapping> {
    return this.service.update(req.session!.orgId, req.session!.userId, useCaseId, mappingId, body);
  }
}
