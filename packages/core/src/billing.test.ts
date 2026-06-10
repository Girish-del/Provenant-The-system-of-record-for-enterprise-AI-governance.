import { describe, it, expect } from 'vitest';
import { meter, canRegisterSystem, PLANS } from './billing';

describe('billing meter', () => {
  it('reports usage against the Free plan limit', () => {
    const m = meter('FREE', 2);
    expect(m.limit).toBe(3);
    expect(m.remaining).toBe(1);
    expect(m.overLimit).toBe(false);
  });

  it('flags over-limit', () => {
    expect(meter('FREE', 4).overLimit).toBe(true);
    expect(meter('FREE', 3).overLimit).toBe(false);
    expect(meter('FREE', 3).remaining).toBe(0);
  });

  it('Enterprise is unlimited', () => {
    const m = meter('ENTERPRISE', 5000);
    expect(m.limit).toBeNull();
    expect(m.remaining).toBeNull();
    expect(m.overLimit).toBe(false);
  });

  it('uses the right limit per tier', () => {
    expect(PLANS.TEAM.systemLimit).toBe(25);
    expect(PLANS.BUSINESS.systemLimit).toBe(100);
  });
});

describe('canRegisterSystem', () => {
  it('allows below the limit, blocks at/above it', () => {
    expect(canRegisterSystem('FREE', 2)).toBe(true);
    expect(canRegisterSystem('FREE', 3)).toBe(false);
    expect(canRegisterSystem('TEAM', 24)).toBe(true);
    expect(canRegisterSystem('TEAM', 25)).toBe(false);
  });

  it('always allows on Enterprise', () => {
    expect(canRegisterSystem('ENTERPRISE', 100000)).toBe(true);
  });
});
