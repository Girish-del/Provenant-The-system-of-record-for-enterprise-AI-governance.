import { z } from 'zod';
import { CONTROL_STATUSES } from '@aegis/core';

export const controlStatusSchema = z.enum(CONTROL_STATUSES);

export const mapControlSchema = z.object({
  controlId: z.string().uuid(),
  notes: z.string().max(2000).optional(),
});
export type MapControlInput = z.infer<typeof mapControlSchema>;

export const updateControlMappingSchema = z
  .object({
    status: controlStatusSchema.optional(),
    notes: z.string().max(2000).optional(),
  })
  .refine((v) => v.status !== undefined || v.notes !== undefined, {
    message: 'provide status or notes',
  });
export type UpdateControlMappingInput = z.infer<typeof updateControlMappingSchema>;

export interface ControlRef {
  id: string;
  code: string;
  title: string;
  framework: string;
}

export interface ControlMappingDto {
  id: string;
  status: string;
  notes: string | null;
  control: ControlRef;
  evidenceCount: number;
}

export interface EvidenceDto {
  id: string;
  fileName: string;
  mimeType: string | null;
  sha256: string | null;
  scanStatus: string;
  createdAt: string;
}
