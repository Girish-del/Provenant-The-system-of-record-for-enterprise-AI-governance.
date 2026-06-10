import { z } from 'zod';

export const decisionSchema = z.enum(['APPROVED', 'REJECTED']);
export const approvalStatusSchema = z.enum(['PENDING', 'APPROVED', 'REJECTED']);

export const submitForReviewSchema = z.object({
  comment: z.string().max(2000).optional(),
});
export type SubmitForReviewInput = z.infer<typeof submitForReviewSchema>;

export const decideApprovalSchema = z.object({
  decision: decisionSchema,
  comment: z.string().max(2000).optional(),
});
export type DecideApprovalInput = z.infer<typeof decideApprovalSchema>;

export const approvalQueueQuerySchema = z.object({
  status: approvalStatusSchema.optional(),
});
export type ApprovalQueueQuery = z.infer<typeof approvalQueueQuerySchema>;

export interface ApprovalDto {
  id: string;
  useCaseId: string;
  decision: string;
  comment: string | null;
  approverId: string | null;
  decidedAt: string | null;
  createdAt: string;
}
