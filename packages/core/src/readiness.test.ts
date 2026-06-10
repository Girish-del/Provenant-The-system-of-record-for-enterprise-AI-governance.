import { describe, it, expect } from 'vitest';
import { computeReadiness, type ControlState } from './readiness';

const make = (over: Partial<ControlState>): ControlState => ({
  controlId: over.controlId ?? 'c',
  code: over.code ?? 'Art9',
  mapped: over.mapped ?? false,
  status: over.status ?? null,
  cleanEvidenceCount: over.cleanEvidenceCount ?? 0,
});

describe('computeReadiness', () => {
  it('is 100% when nothing is required', () => {
    const r = computeReadiness([]);
    expect(r.readinessPct).toBe(100);
    expect(r.required).toBe(0);
    expect(r.gaps).toHaveLength(0);
  });

  it('counts a control satisfied only when IMPLEMENTED with clean evidence', () => {
    const r = computeReadiness([
      make({ code: 'Art9', mapped: true, status: 'IMPLEMENTED', cleanEvidenceCount: 1 }),
    ]);
    expect(r.satisfied).toBe(1);
    expect(r.readinessPct).toBe(100);
    expect(r.gaps).toHaveLength(0);
  });

  it('flags IMPLEMENTED-without-evidence as a gap', () => {
    const r = computeReadiness([
      make({ code: 'Art9', mapped: true, status: 'IMPLEMENTED', cleanEvidenceCount: 0 }),
    ]);
    expect(r.satisfied).toBe(0);
    expect(r.gaps[0]!.reason).toContain('missing verified');
  });

  it('treats NOT_APPLICABLE as satisfied', () => {
    const r = computeReadiness([make({ mapped: true, status: 'NOT_APPLICABLE' })]);
    expect(r.satisfied).toBe(1);
    expect(r.readinessPct).toBe(100);
  });

  it('flags unmapped and not-started controls with distinct reasons', () => {
    const r = computeReadiness([
      make({ controlId: 'a', code: 'Art9', mapped: false }),
      make({ controlId: 'b', code: 'Art10', mapped: true, status: 'NOT_STARTED' }),
    ]);
    expect(r.readinessPct).toBe(0);
    expect(r.gaps.find((g) => g.code === 'Art9')!.reason).toContain('not mapped');
    expect(r.gaps.find((g) => g.code === 'Art10')!.reason).toContain('not started');
  });

  it('computes a rounded percentage and a status breakdown', () => {
    const r = computeReadiness([
      make({ controlId: '1', mapped: true, status: 'IMPLEMENTED', cleanEvidenceCount: 2 }),
      make({ controlId: '2', mapped: true, status: 'IMPLEMENTED', cleanEvidenceCount: 0 }),
      make({ controlId: '3', mapped: true, status: 'IN_PROGRESS' }),
    ]);
    expect(r.required).toBe(3);
    expect(r.satisfied).toBe(1);
    expect(r.readinessPct).toBe(33);
    expect(r.byStatus.IMPLEMENTED).toBe(2);
    expect(r.byStatus.IN_PROGRESS).toBe(1);
  });
});
