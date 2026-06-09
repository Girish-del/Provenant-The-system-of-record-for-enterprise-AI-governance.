/**
 * Role-based access control. Deny by default: a role can only perform the
 * actions explicitly granted to it. Roles mirror the DB MembershipRole enum.
 */
export const ROLES = ['ADMIN', 'CONTRIBUTOR', 'REVIEWER', 'VIEWER'] as const;
export type Role = (typeof ROLES)[number];

export const ACTIONS = [
  'org:manage',
  'member:manage',
  'usecase:create',
  'usecase:edit',
  'usecase:view',
  'risk:assess',
  'control:map',
  'evidence:upload',
  'review:decide',
  'report:export',
] as const;
export type Action = (typeof ACTIONS)[number];

// Each role lists exactly the actions it is granted. Anything not listed is denied.
const GRANTS: Record<Role, ReadonlySet<Action>> = {
  ADMIN: new Set(ACTIONS),
  CONTRIBUTOR: new Set<Action>([
    'usecase:create',
    'usecase:edit',
    'usecase:view',
    'risk:assess',
    'control:map',
    'evidence:upload',
    'report:export',
  ]),
  REVIEWER: new Set<Action>(['usecase:view', 'review:decide', 'report:export']),
  VIEWER: new Set<Action>(['usecase:view']),
};

export function can(role: Role, action: Action): boolean {
  return GRANTS[role]?.has(action) ?? false;
}

export class ForbiddenError extends Error {
  constructor(
    public readonly role: Role,
    public readonly action: Action,
  ) {
    super(`Role ${role} may not perform ${action}`);
    this.name = 'ForbiddenError';
  }
}

export function assertCan(role: Role, action: Action): void {
  if (!can(role, action)) {
    throw new ForbiddenError(role, action);
  }
}
