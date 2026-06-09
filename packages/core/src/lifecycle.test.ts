import { describe, it, expect } from 'vitest';
import { canTransition, assertTransition, allowedTransitions, InvalidTransitionError } from './lifecycle';

describe('use-case lifecycle', () => {
  it('allows the forward path', () => {
    expect(canTransition('PROPOSED', 'IN_REVIEW')).toBe(true);
    expect(canTransition('IN_REVIEW', 'APPROVED')).toBe(true);
    expect(canTransition('APPROVED', 'IN_PRODUCTION')).toBe(true);
    expect(canTransition('IN_PRODUCTION', 'RETIRED')).toBe(true);
  });

  it('allows sending back for revision', () => {
    expect(canTransition('IN_REVIEW', 'PROPOSED')).toBe(true);
    expect(canTransition('APPROVED', 'IN_REVIEW')).toBe(true);
  });

  it('denies illegal jumps', () => {
    expect(canTransition('PROPOSED', 'IN_PRODUCTION')).toBe(false);
    expect(canTransition('PROPOSED', 'APPROVED')).toBe(false);
    expect(canTransition('RETIRED', 'IN_PRODUCTION')).toBe(false);
    expect(canTransition('IN_PRODUCTION', 'APPROVED')).toBe(false);
  });

  it('RETIRED is terminal', () => {
    expect(allowedTransitions('RETIRED')).toHaveLength(0);
  });

  it('assertTransition throws InvalidTransitionError on illegal edges', () => {
    expect(() => assertTransition('PROPOSED', 'IN_PRODUCTION')).toThrow(InvalidTransitionError);
    expect(() => assertTransition('PROPOSED', 'IN_REVIEW')).not.toThrow();
  });
});
