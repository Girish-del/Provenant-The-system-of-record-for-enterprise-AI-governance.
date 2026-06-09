import { z } from 'zod';
import { LIFECYCLE_STATES, RISK_TIERS } from '@aegis/core';

export const lifecycleStateSchema = z.enum(LIFECYCLE_STATES);
export const riskTierSchema = z.enum(RISK_TIERS);

export const createUseCaseSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().max(5000).optional(),
  purpose: z.string().max(2000).optional(),
});
export type CreateUseCaseInput = z.infer<typeof createUseCaseSchema>;

export const updateUseCaseSchema = createUseCaseSchema.partial();
export type UpdateUseCaseInput = z.infer<typeof updateUseCaseSchema>;

export const transitionUseCaseSchema = z.object({ to: lifecycleStateSchema });
export type TransitionUseCaseInput = z.infer<typeof transitionUseCaseSchema>;

export const listUseCasesQuerySchema = z.object({
  lifecycle: lifecycleStateSchema.optional(),
  riskTier: riskTierSchema.optional(),
  q: z.string().trim().min(1).optional(),
});
export type ListUseCasesQuery = z.infer<typeof listUseCasesQuerySchema>;

export const importUseCasesSchema = z.object({
  csv: z.string().min(1, 'csv body is required'),
});
export type ImportUseCasesInput = z.infer<typeof importUseCasesSchema>;

export const useCaseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  purpose: z.string().nullable(),
  lifecycle: lifecycleStateSchema,
  riskTier: riskTierSchema,
  ownerId: z.string().uuid().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type UseCaseDto = z.infer<typeof useCaseSchema>;
