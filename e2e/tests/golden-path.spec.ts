import { test, expect } from '@playwright/test';

/**
 * End-to-end test of the full governance pipeline against the real API + Postgres
 * (RLS) + LocalStack S3. Uses Playwright's API request fixture (no browser): the
 * `request` context keeps the session cookie across calls within a test.
 */
test('governance golden path: register → classify → map → evidence → approve → export', async ({
  request,
}) => {
  // Fresh org per run via the dev auth provider (unique email).
  const email = `e2e-${Date.now()}@e2e.dev`;
  const login = await request.post('/auth/dev/login', { data: { email } });
  expect(login.ok()).toBeTruthy();
  const session = await login.json();
  expect(session.orgId).toBeTruthy();
  expect(session.role).toBe('ADMIN');

  // 1. Register an AI use case.
  const created = await request.post('/use-cases', {
    data: { name: 'E2E Hiring AI', purpose: 'rank candidates' },
  });
  expect(created.status()).toBe(201);
  const useCase = await created.json();

  // 2. Classify risk → HIGH (Annex III).
  const assessed = await request.post(`/use-cases/${useCase.id}/assessments`, {
    data: { questionnaireKey: 'EU_AI_ACT_RISK_V1', answers: { annex_iii: true } },
  });
  expect((await assessed.json()).tier).toBe('HIGH');
  const reread = await (await request.get(`/use-cases/${useCase.id}`)).json();
  expect(reread.riskTier).toBe('HIGH');

  // 3. Suggest the required controls for the tier (idempotent).
  const suggested = await request.post(`/use-cases/${useCase.id}/controls/suggest`);
  expect((await suggested.json()).added).toBe(7);
  const controls = await (await request.get(`/use-cases/${useCase.id}/controls`)).json();
  expect(controls).toHaveLength(7);
  const mappingId = controls[0].id;

  // 4. Implement one control and attach clean evidence (uploaded to S3, scanned).
  await request.patch(`/use-cases/${useCase.id}/controls/${mappingId}`, {
    data: { status: 'IMPLEMENTED' },
  });
  const evidence = await request.post(`/control-mappings/${mappingId}/evidence`, {
    multipart: {
      file: {
        name: 'oversight-sop.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('human oversight standard operating procedure'),
      },
    },
  });
  expect((await evidence.json()).scanStatus).toBe('CLEAN');

  // 5. Readiness reflects exactly 1 of 7 satisfied.
  const readiness = await (await request.get(`/use-cases/${useCase.id}/readiness`)).json();
  expect(readiness.summary.satisfied).toBe(1);
  expect(readiness.summary.readinessPct).toBe(14);

  // 6. Submit for review and approve → lifecycle APPROVED.
  await request.post(`/use-cases/${useCase.id}/submit-for-review`, { data: {} });
  const approvals = await (await request.get(`/use-cases/${useCase.id}/approvals`)).json();
  const decided = await request.post(`/approvals/${approvals[0].id}/decide`, {
    data: { decision: 'APPROVED', comment: 'baseline complete' },
  });
  expect((await decided.json()).decision).toBe('APPROVED');
  const afterApproval = await (await request.get(`/use-cases/${useCase.id}`)).json();
  expect(afterApproval.lifecycle).toBe('APPROVED');

  // 7. Export the audit-ready report.
  const reportRes = await request.get(`/use-cases/${useCase.id}/report.md`);
  expect(reportRes.ok()).toBeTruthy();
  const md = await reportRes.text();
  expect(md).toContain('# EU AI Act Readiness Report');
  expect(md).toContain('E2E Hiring AI');
  expect(md).toContain('14% ready');
  expect(md).toContain('APPROVED');

  // 8. The audit chain for this org is intact (tamper-evident).
  const verify = await (await request.get('/audit/chain/verify')).json();
  expect(verify.valid).toBe(true);
  expect(verify.count).toBeGreaterThan(0);
});

test('unauthenticated requests are rejected', async ({ request }) => {
  const res = await request.get('/use-cases');
  expect(res.status()).toBe(401);
});

test('cross-tenant isolation: a fresh org sees no other org data', async ({ request }) => {
  const login = await request.post('/auth/dev/login', {
    data: { email: `e2e-iso-${Date.now()}@e2e.dev` },
  });
  expect(login.ok()).toBeTruthy();
  const useCases = await (await request.get('/use-cases')).json();
  expect(Array.isArray(useCases)).toBeTruthy();
  expect(useCases).toHaveLength(0);
});
