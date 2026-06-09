import { z } from 'zod';
import { riskTierSchema } from './use-cases';

export type RiskTierName = z.infer<typeof riskTierSchema>;

export const submitAssessmentSchema = z.object({
  questionnaireKey: z.string().min(1),
  answers: z.record(z.string(), z.boolean()),
});
export type SubmitAssessmentInput = z.infer<typeof submitAssessmentSchema>;

export interface QuestionDto {
  key: string;
  order: number;
  text: string;
  type: string;
}

export interface QuestionnaireDto {
  key: string;
  name: string;
  version: string;
  questions: QuestionDto[];
}

export interface AssessmentResultDto {
  id: string;
  useCaseId: string;
  tier: RiskTierName;
  rationale: string;
  status: string;
  createdAt: string;
}
