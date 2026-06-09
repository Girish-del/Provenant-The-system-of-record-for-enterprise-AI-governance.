import { describe, it, expect } from 'vitest';
import { can, assertCan, ForbiddenError, ACTIONS } from './rbac';

describe('rbac', () => {
  it('ADMIN can perform every action', () => {
    for (const a of ACTIONS) expect(can('ADMIN', a)).toBe(true);
  });

  it('VIEWER can only view', () => {
    expect(can('VIEWER', 'usecase:view')).toBe(true);
    expect(can('VIEWER', 'usecase:edit')).toBe(false);
    expect(can('VIEWER', 'review:decide')).toBe(false);
  });

  it('REVIEWER can decide reviews but not create use cases', () => {
    expect(can('REVIEWER', 'review:decide')).toBe(true);
    expect(can('REVIEWER', 'usecase:create')).toBe(false);
  });

  it('CONTRIBUTOR can create/edit but not manage members or decide', () => {
    expect(can('CONTRIBUTOR', 'usecase:create')).toBe(true);
    expect(can('CONTRIBUTOR', 'member:manage')).toBe(false);
    expect(can('CONTRIBUTOR', 'review:decide')).toBe(false);
  });

  it('denies by default; assertCan throws ForbiddenError when not granted', () => {
    expect(() => assertCan('VIEWER', 'usecase:edit')).toThrow(ForbiddenError);
    expect(() => assertCan('ADMIN', 'org:manage')).not.toThrow();
  });
});
