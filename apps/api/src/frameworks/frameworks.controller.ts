import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import type {
  FrameworkSummaryDto,
  FrameworkDetailDto,
  CrosswalkResultDto,
} from '@aegis/contracts';
import { AuthGuard } from '../auth/auth.guard.js';
import { FrameworksService } from './frameworks.service.js';

/** The framework/control library — global reference content, available to any member. */
@Controller()
@UseGuards(AuthGuard)
export class FrameworksController {
  constructor(private readonly service: FrameworksService) {}

  @Get('frameworks')
  list(): Promise<FrameworkSummaryDto[]> {
    return this.service.listFrameworks();
  }

  @Get('frameworks/:key')
  get(@Param('key') key: string): Promise<FrameworkDetailDto> {
    return this.service.getFramework(key);
  }

  @Get('controls/:id/crosswalks')
  crosswalks(@Param('id', ParseUUIDPipe) id: string): Promise<CrosswalkResultDto> {
    return this.service.crosswalksForControl(id);
  }
}
