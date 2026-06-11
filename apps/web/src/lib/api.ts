import type {
  AiDraft,
  Approval,
  AssessmentResult,
  BillingStatus,
  ControlMapping,
  EvidenceItem,
  Member,
  PolicyItem,
  PortfolioReadiness,
  Questionnaire,
  ReviewWorkflow,
  SessionInfo,
  UseCase,
  UseCaseReadiness,
} from './types';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (res.status === 401) {
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
    throw new ApiError(401, 'unauthorized');
  }
  if (!res.ok) {
    throw new ApiError(res.status, await res.text());
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}

export const api = {
  login: (email: string): Promise<SessionInfo> =>
    req('/auth/dev/login', { method: 'POST', body: JSON.stringify({ email }) }),
  me: (): Promise<SessionInfo> => req('/auth/me'),
  logout: (): Promise<void> => req('/auth/logout', { method: 'POST' }),

  portfolio: (): Promise<PortfolioReadiness> => req('/readiness'),
  useCases: (): Promise<UseCase[]> => req('/use-cases'),
  useCase: (id: string): Promise<UseCase> => req(`/use-cases/${id}`),
  createUseCase: (body: { name: string; purpose?: string }): Promise<UseCase> =>
    req('/use-cases', { method: 'POST', body: JSON.stringify(body) }),
  useCaseReadiness: (id: string): Promise<UseCaseReadiness> => req(`/use-cases/${id}/readiness`),
  controls: (id: string): Promise<ControlMapping[]> => req(`/use-cases/${id}/controls`),
  approvals: (id: string): Promise<Approval[]> => req(`/use-cases/${id}/approvals`),
  reportUrl: (id: string): string => `${BASE}/use-cases/${id}/report.md`,

  // Assessments
  questionnaire: (): Promise<Questionnaire> => req('/questionnaires/EU_AI_ACT_RISK_V1'),
  submitAssessment: (useCaseId: string, answers: Record<string, boolean>): Promise<AssessmentResult> =>
    req(`/use-cases/${useCaseId}/assessments`, {
      method: 'POST',
      body: JSON.stringify({ questionnaireKey: 'EU_AI_ACT_RISK_V1', answers }),
    }),

  // Controls + evidence
  suggestControls: (useCaseId: string): Promise<{ added: number }> =>
    req(`/use-cases/${useCaseId}/controls/suggest`, { method: 'POST' }),
  updateControlStatus: (useCaseId: string, mappingId: string, status: string): Promise<unknown> =>
    req(`/use-cases/${useCaseId}/controls/${mappingId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  uploadEvidence: async (mappingId: string, file: File): Promise<EvidenceItem> => {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${BASE}/control-mappings/${mappingId}/evidence`, {
      method: 'POST',
      credentials: 'include',
      body: form,
    });
    if (!res.ok) throw new ApiError(res.status, await res.text());
    return (await res.json()) as EvidenceItem;
  },

  // Review workflow
  submitForReview: (useCaseId: string, comment?: string): Promise<Approval> =>
    req(`/use-cases/${useCaseId}/submit-for-review`, {
      method: 'POST',
      body: JSON.stringify({ comment }),
    }),
  decide: (approvalId: string, decision: 'APPROVED' | 'REJECTED', comment?: string): Promise<Approval> =>
    req(`/approvals/${approvalId}/decide`, {
      method: 'POST',
      body: JSON.stringify({ decision, comment }),
    }),
  approvalQueue: (status?: string): Promise<Approval[]> =>
    req(`/approvals${status ? `?status=${status}` : ''}`),
  workflow: (useCaseId: string): Promise<ReviewWorkflow | null> =>
    req(`/use-cases/${useCaseId}/workflow`),

  // AI (advisory only)
  aiDraft: (useCaseId: string, kind: string): Promise<AiDraft> =>
    req(`/use-cases/${useCaseId}/ai/draft`, { method: 'POST', body: JSON.stringify({ kind }) }),

  // Billing + members + policies
  billing: (): Promise<BillingStatus> => req('/billing'),
  checkout: (tier: string): Promise<{ url: string; mock: boolean }> =>
    req('/billing/checkout', { method: 'POST', body: JSON.stringify({ tier }) }),
  setPlanDev: (plan: string): Promise<{ plan: string }> =>
    req('/billing/dev/set-plan', { method: 'POST', body: JSON.stringify({ plan }) }),
  members: (): Promise<Member[]> => req('/memberships'),
  invite: (email: string, role: string): Promise<Member> =>
    req('/memberships/invite', { method: 'POST', body: JSON.stringify({ email, role }) }),
  changeRole: (membershipId: string, role: string): Promise<Member> =>
    req(`/memberships/${membershipId}`, { method: 'PATCH', body: JSON.stringify({ role }) }),
  policies: (): Promise<PolicyItem[]> => req('/policies'),
  createPolicy: (title: string, body?: string): Promise<PolicyItem> =>
    req('/policies', { method: 'POST', body: JSON.stringify({ title, body }) }),
  updatePolicy: (id: string, patch: Record<string, unknown>): Promise<PolicyItem> =>
    req(`/policies/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),

  ssoLoginUrl: (): string => `${BASE}/auth/sso/login?provider=GoogleOAuth`,
};

export { ApiError };
