import { ForbiddenException, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { forOrg } from '@aegis/db';
import { meter, PLANS, type MeterResult, type PlanDef, type PlanTier } from '@aegis/core';

export interface BillingStatus {
  plan: PlanTier;
  subscriptionStatus: string | null;
  meter: MeterResult;
  plans: Record<string, PlanDef>;
}

@Injectable()
export class BillingService {
  status(orgId: string): Promise<BillingStatus> {
    return forOrg(orgId, async (tx) => {
      const org = await tx.organization.findUnique({
        where: { id: orgId },
        select: { plan: true, subscriptionStatus: true },
      });
      const used = await tx.useCase.count();
      const tier = (org?.plan ?? 'FREE') as PlanTier;
      return {
        plan: tier,
        subscriptionStatus: org?.subscriptionStatus ?? null,
        meter: meter(tier, used),
        plans: PLANS,
      };
    });
  }

  checkout(orgId: string, tier: PlanTier): { url: string; mock: boolean } {
    if (process.env.STRIPE_SECRET_KEY) {
      // Real Stripe Checkout Session creation goes here (needs the stripe SDK +
      // configured price IDs). Inert until keys are provisioned.
      throw new HttpException('Stripe checkout not configured', HttpStatus.NOT_IMPLEMENTED);
    }
    // Mock provider (no keys): same shape the UI consumes, lets dev/CI run without Stripe.
    return { url: `https://example.test/checkout?org=${orgId}&plan=${tier}`, mock: true };
  }

  setPlan(orgId: string, plan: PlanTier): Promise<{ plan: PlanTier }> {
    if ((process.env.NODE_ENV ?? 'development') === 'production') {
      // In production the plan changes only via the signature-verified Stripe webhook.
      throw new ForbiddenException('plan can only be changed via Stripe in production');
    }
    return forOrg(orgId, async (tx) => {
      await tx.organization.update({
        where: { id: orgId },
        data: { plan, subscriptionStatus: plan === 'FREE' ? null : 'active' },
      });
      return { plan };
    });
  }
}
