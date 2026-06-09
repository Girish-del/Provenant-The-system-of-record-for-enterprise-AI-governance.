/**
 * Use-case lifecycle state machine. Canonical state lists live here (mirrored by
 * the Prisma enums and the contract Zod enums). Transitions are deny-by-default:
 * only edges listed in TRANSITIONS are allowed.
 */
export const LIFECYCLE_STATES = [
  'PROPOSED',
  'IN_REVIEW',
  'APPROVED',
  'IN_PRODUCTION',
  'RETIRED',
] as const;
export type LifecycleState = (typeof LIFECYCLE_STATES)[number];

export const RISK_TIERS = ['UNASSIGNED', 'PROHIBITED', 'HIGH', 'LIMITED', 'MINIMAL'] as const;
export type RiskTier = (typeof RISK_TIERS)[number];

const TRANSITIONS: Record<LifecycleState, readonly LifecycleState[]> = {
  PROPOSED: ['IN_REVIEW', 'RETIRED'],
  IN_REVIEW: ['APPROVED', 'PROPOSED', 'RETIRED'],
  APPROVED: ['IN_PRODUCTION', 'IN_REVIEW', 'RETIRED'],
  IN_PRODUCTION: ['RETIRED'],
  RETIRED: [],
};

export function allowedTransitions(from: LifecycleState): readonly LifecycleState[] {
  return TRANSITIONS[from];
}

export function canTransition(from: LifecycleState, to: LifecycleState): boolean {
  return TRANSITIONS[from].includes(to);
}

export class InvalidTransitionError extends Error {
  constructor(
    public readonly from: LifecycleState,
    public readonly to: LifecycleState,
  ) {
    super(`Cannot transition a use case from ${from} to ${to}`);
    this.name = 'InvalidTransitionError';
  }
}

export function assertTransition(from: LifecycleState, to: LifecycleState): void {
  if (!canTransition(from, to)) {
    throw new InvalidTransitionError(from, to);
  }
}
