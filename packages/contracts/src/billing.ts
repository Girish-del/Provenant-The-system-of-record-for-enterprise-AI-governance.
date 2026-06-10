import { z } from 'zod';
import { PLAN_TIERS, type MeterResult, type PlanDef } from '@aegis/core';

export const planTierSchema = z.enum(PLAN_TIERS);

export const checkoutSchema = z.object({ tier: planTierSchema });
export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const setPlanSchema = z.object({ plan: planTierSchema });
export type SetPlanInput = z.infer<typeof setPlanSchema>;

export interface BillingStatusDto {
  plan: string;
  subscriptionStatus: string | null;
  meter: MeterResult;
  plans: Record<string, PlanDef>;
}

export type { MeterResult, PlanDef, PlanTier } from '@aegis/core';
