import { describe, it, expect } from 'vitest';
import { renderReadinessReportMarkdown, type ReadinessReport } from './report';

const base: ReadinessReport = {
  org: 'Acme Corp',
  generatedAt: '2026-06-10T00:00:00.000Z',
  useCase: {
    id: 'uc-1',
    name: 'Resume Screener',
    description: 'Ranks applicants',
    purpose: 'hiring',
    lifecycle: 'IN_REVIEW',
    riskTier: 'HIGH',
    createdAt: '2026-06-01T00:00:00.000Z',
  },
  assessment: { tier: 'HIGH', rationale: 'Annex III employment', createdAt: '2026-06-02T00:00:00.000Z' },
  readiness: {
    required: 2,
    satisfied: 1,
    readinessPct: 50,
    byStatus: { NOT_STARTED: 1, IN_PROGRESS: 0, IMPLEMENTED: 1, NOT_APPLICABLE: 0 },
    gaps: [{ controlId: 'c2', code: 'Art10', reason: 'mapped but not started' }],
  },
  controls: [
    {
      framework: 'EU_AI_ACT',
      code: 'Art9',
      title: 'Risk management',
      status: 'IMPLEMENTED',
      evidenceCount: 1,
      cleanEvidenceCount: 1,
    },
  ],
  approvals: [
    { decision: 'APPROVED', comment: 'looks good', approver: 'jo@acme.eu', decidedAt: '2026-06-09T00:00:00.000Z' },
  ],
};

describe('renderReadinessReportMarkdown', () => {
  it('includes the headline facts', () => {
    const md = renderReadinessReportMarkdown(base);
    expect(md).toContain('# EU AI Act Readiness Report');
    expect(md).toContain('Resume Screener');
    expect(md).toContain('Acme Corp');
    expect(md).toContain('**Risk tier:** HIGH');
    expect(md).toContain('50% ready');
    expect(md).toContain('Annex III employment');
  });

  it('renders controls, gaps, and the approval trail', () => {
    const md = renderReadinessReportMarkdown(base);
    expect(md).toContain('EU_AI_ACT Art9');
    expect(md).toContain('Art10');
    expect(md).toContain('mapped but not started');
    expect(md).toContain('APPROVED');
    expect(md).toContain('jo@acme.eu');
    expect(md).toContain('advisory');
  });

  it('handles empty controls/approvals and missing assessment', () => {
    const md = renderReadinessReportMarkdown({
      ...base,
      assessment: null,
      controls: [],
      approvals: [],
    });
    expect(md).toContain('_No controls mapped._');
    expect(md).toContain('_No approvals recorded._');
    expect(md).toContain('_No risk assessment recorded._');
  });

  it('is deterministic for the same input', () => {
    expect(renderReadinessReportMarkdown(base)).toBe(renderReadinessReportMarkdown(base));
  });
});
