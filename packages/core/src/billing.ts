export const PLAN_TIERS = ['FREE', 'TEAM', 'BUSINESS', 'ENTERPRISE'] as const;
export type PlanTier = (typeof PLAN_TIERS)[number];

export interface PlanDef {
  tier: PlanTier;
  name: string;
  /** Max governed AI systems. `null` = unlimited. */
  systemLimit: number | null;
  /** Monthly price in USD. `null` = custom / contact sales. */
  priceMonthlyUsd: number | null;
}

/**
 * Pricing meters on **governed AI systems** (the value axis), not seats —
 * governance touches many occasional stakeholders, so per-seat would mis-price it.
 */
export const PLANS: Record<PlanTier, PlanDef> = {
  FREE: { tier: 'FREE', name: 'Free', systemLimit: 3, priceMonthlyUsd: 0 },
  TEAM: { tier: 'TEAM', name: 'Team', systemLimit: 25, priceMonthlyUsd: 499 },
  BUSINESS: { tier: 'BUSINESS', name: 'Business', systemLimit: 100, priceMonthlyUsd: 1499 },
  ENTERPRISE: { tier: 'ENTERPRISE', name: 'Enterprise', systemLimit: null, priceMonthlyUsd: null },
};

export interface MeterResult {
  tier: PlanTier;
  limit: number | null;
  used: number;
  remaining: number | null;
  overLimit: boolean;
}

function planFor(tier: PlanTier): PlanDef {
  return PLANS[tier] ?? PLANS.FREE;
}

export function meter(tier: PlanTier, used: number): MeterResult {
  const limit = planFor(tier).systemLimit;
  if (limit === null) {
    return { tier: planFor(tier).tier, limit: null, used, remaining: null, overLimit: false };
  }
  return {
    tier: planFor(tier).tier,
    limit,
    used,
    remaining: Math.max(0, limit - used),
    overLimit: used > limit,
  };
}

/** Can the org register one more governed system under its current plan? */
export function canRegisterSystem(tier: PlanTier, currentCount: number): boolean {
  const limit = planFor(tier).systemLimit;
  return limit === null || currentCount < limit;
}
