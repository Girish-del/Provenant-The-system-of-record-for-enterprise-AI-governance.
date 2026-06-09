import { describe, it, expect } from 'vitest';
import { classifyRisk, type RiskRule } from './risk';

const rules: RiskRule[] = [
  { key: 'prohibited_practice', impliesTierWhenTrue: 'PROHIBITED' },
  { key: 'annex_iii', impliesTierWhenTrue: 'HIGH' },
  { key: 'safety_component', impliesTierWhenTrue: 'HIGH' },
  { key: 'interacts_or_synthetic', impliesTierWhenTrue: 'LIMITED' },
];

describe('classifyRisk', () => {
  it('returns MINIMAL when nothing fires', () => {
    expect(classifyRisk({}, rules).tier).toBe('MINIMAL');
    expect(classifyRisk({ annex_iii: false }, rules).tier).toBe('MINIMAL');
  });

  it('classifies PROHIBITED', () => {
    expect(classifyRisk({ prohibited_practice: true }, rules).tier).toBe('PROHIBITED');
  });

  it('classifies HIGH from Annex III or safety component', () => {
    expect(classifyRisk({ annex_iii: true }, rules).tier).toBe('HIGH');
    expect(classifyRisk({ safety_component: true }, rules).tier).toBe('HIGH');
  });

  it('classifies LIMITED for interaction/synthetic content', () => {
    expect(classifyRisk({ interacts_or_synthetic: true }, rules).tier).toBe('LIMITED');
  });

  it('the most severe fired rule wins', () => {
    const result = classifyRisk(
      { prohibited_practice: true, annex_iii: true, interacts_or_synthetic: true },
      rules,
    );
    expect(result.tier).toBe('PROHIBITED');
    expect(result.fired).toHaveLength(3);
  });

  it('includes a rationale that cites what fired', () => {
    const result = classifyRisk({ annex_iii: true }, rules);
    expect(result.rationale).toContain('HIGH');
    expect(result.rationale).toContain('annex_iii');
  });
});
