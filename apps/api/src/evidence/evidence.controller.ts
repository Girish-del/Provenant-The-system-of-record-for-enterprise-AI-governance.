import {
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { EvidenceDto } from '@aegis/contracts';
import { AuthGuard } from '../auth/auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { RequireAction } from '../auth/roles.decorator.js';
import type { RequestWithSession } from '../auth/session.types.js';
import { EvidenceService, type UploadedFile as MulterFile } from './evidence.service.js';

@Controller('control-mappings/:mappingId/evidence')
@UseGuards(AuthGuard, RolesGuard)
export class EvidenceController {
  constructor(private readonly service: EvidenceService) {}

  @Get()
  @RequireAction('usecase:view')
  list(
    @Req() req: RequestWithSession,
    @Param('mappingId', ParseUUIDPipe) mappingId: string,
  ): Promise<EvidenceDto[]> {
    return this.service.list(req.session!.orgId, mappingId);
  }

  @Post()
  @RequireAction('evidence:upload')
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @Req() req: RequestWithSession,
    @Param('mappingId', ParseUUIDPipe) mappingId: string,
    @UploadedFile() file: MulterFile | undefined,
  ): Promise<EvidenceDto> {
    if (!file) {
      throw new BadRequestException('a file is required (multipart field "file")');
    }
    return this.service.upload(req.session!.orgId, req.session!.userId, mappingId, file);
  }
}
