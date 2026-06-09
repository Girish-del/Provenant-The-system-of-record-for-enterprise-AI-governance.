import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { forOrg, type Evidence } from '@aegis/db';
import type { EvidenceDto } from '@aegis/contracts';
import { putObject } from '../common/s3.js';
import { scanBuffer } from './scan.js';
import { audit } from '../common/audit.js';

export interface UploadedFile {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

function toDto(e: Evidence): EvidenceDto {
  return {
    id: e.id,
    fileName: e.fileName,
    mimeType: e.mimeType,
    sha256: e.sha256,
    scanStatus: e.scanStatus,
    createdAt: e.createdAt.toISOString(),
  };
}

@Injectable()
export class EvidenceService {
  list(orgId: string, mappingId: string): Promise<EvidenceDto[]> {
    return forOrg(orgId, async (tx) => {
      const mapping = await tx.controlMapping.findUnique({ where: { id: mappingId } });
      if (!mapping) {
        throw new NotFoundException('control mapping not found');
      }
      const items = await tx.evidence.findMany({
        where: { controlMappingId: mappingId },
        orderBy: { createdAt: 'desc' },
      });
      return items.map(toDto);
    });
  }

  async upload(
    orgId: string,
    actorId: string,
    mappingId: string,
    file: UploadedFile,
  ): Promise<EvidenceDto> {
    // 1. Confirm the mapping belongs to this tenant before touching storage.
    await forOrg(orgId, async (tx) => {
      const mapping = await tx.controlMapping.findUnique({ where: { id: mappingId } });
      if (!mapping) {
        throw new NotFoundException('control mapping not found');
      }
    });

    // 2. Hash, scan, and store the bytes.
    const sha256 = createHash('sha256').update(file.buffer).digest('hex');
    const scanStatus = scanBuffer(file.buffer);
    const key = `${orgId}/${mappingId}/${sha256}-${file.originalname}`;
    await putObject(key, file.buffer, file.mimetype);

    // 3. Record the evidence row + audit, atomically in tenant context.
    return forOrg(orgId, async (tx) => {
      const evidence = await tx.evidence.create({
        data: {
          orgId,
          controlMappingId: mappingId,
          fileName: file.originalname,
          fileKey: key,
          mimeType: file.mimetype,
          sha256,
          scanStatus,
          uploadedById: actorId,
        },
      });
      await audit(tx, {
        orgId,
        actorId,
        action: 'evidence.upload',
        targetType: 'Evidence',
        targetId: evidence.id,
        after: { fileName: file.originalname, sha256, scanStatus },
      });
      return toDto(evidence);
    });
  }
}
