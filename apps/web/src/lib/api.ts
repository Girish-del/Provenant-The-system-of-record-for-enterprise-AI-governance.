import type {
  Approval,
  ControlMapping,
  PortfolioReadiness,
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
};

export { ApiError };
