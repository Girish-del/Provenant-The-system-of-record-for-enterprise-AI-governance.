import type { RiskTier } from './lifecycle';

export const CONTROL_STATUSES = [
  'NOT_STARTED',
  'IN_PROGRESS',
  'IMPLEMENTED',
  'NOT_APPLICABLE',
] as const;
export type ControlStatus = (typeof CONTROL_STATUSES)[number];

/**
 * Which EU AI Act control categories apply at a given risk tier. Drives the
 * "suggest required controls" action: high-risk systems must satisfy the
 * high-risk obligations; limited-risk systems the transparency obligations.
 */
export function requiredControlCategories(tier: RiskTier): string[] {
  switch (tier) {
    case 'PROHIBITED':
    case 'HIGH':
      return ['High-risk obligations'];
    case 'LIMITED':
      return ['Limited risk'];
    case 'MINIMAL':
    case 'UNASSIGNED':
    default:
      return [];
  }
}
