import { describe, it, expect } from 'vitest';
import { requiredControlCategories } from './controls';

describe('requiredControlCategories', () => {
  it('HIGH and PROHIBITED require the high-risk obligations', () => {
    expect(requiredControlCategories('HIGH')).toContain('High-risk obligations');
    expect(requiredControlCategories('PROHIBITED')).toContain('High-risk obligations');
  });

  it('LIMITED requires the limited-risk (transparency) controls', () => {
    expect(requiredControlCategories('LIMITED')).toEqual(['Limited risk']);
  });

  it('MINIMAL and UNASSIGNED require none', () => {
    expect(requiredControlCategories('MINIMAL')).toHaveLength(0);
    expect(requiredControlCategories('UNASSIGNED')).toHaveLength(0);
  });
});
