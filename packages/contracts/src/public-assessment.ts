import { z } from 'zod';

export const publicClassifySchema = z.object({
  answers: z.record(z.string(), z.boolean()),
});
export type PublicClassifyInput = z.infer<typeof publicClassifySchema>;

export const publicConvertSchema = z.object({
  email: z.string().email().max(254),
  systemName: z.string().min(1).max(120),
  answers: z.record(z.string(), z.boolean()),
});
export type PublicConvertInput = z.infer<typeof publicConvertSchema>;

export interface ObligationDto {
  code: string;
  title: string;
}

export interface PublicClassifyResult {
  tier: string;
  rationale: string;
  obligations: ObligationDto[];
  /** What the full product adds beyond this free check. */
  nextSteps: string[];
}

export interface PublicConvertResult {
  orgName: string;
  useCaseId: string;
  tier: string;
}
