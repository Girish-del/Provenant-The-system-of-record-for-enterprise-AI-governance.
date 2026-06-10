export interface SessionInfo {
  userId: string;
  orgId: string;
  role: string;
  orgName?: string;
  email?: string | null;
}

export interface UseCase {
  id: string;
  name: string;
  description: string | null;
  purpose: string | null;
  lifecycle: string;
  riskTier: string;
  ownerId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PortfolioReadiness {
  totalUseCases: number;
  byRiskTier: Record<string, number>;
  byLifecycle: Record<string, number>;
  auditReady: number;
  notReady: number;
  avgReadinessPct: number;
  highRiskNotReady: number;
}

export interface Gap {
  controlId: string;
  code: string;
  reason: string;
}

export interface ReadinessSummary {
  required: number;
  satisfied: number;
  readinessPct: number;
  byStatus: Record<string, number>;
  gaps: Gap[];
}

export interface UseCaseReadiness {
  useCaseId: string;
  name: string;
  riskTier: string;
  summary: ReadinessSummary;
}

export interface ControlMapping {
  id: string;
  status: string;
  notes: string | null;
  control: { id: string; code: string; title: string; framework: string };
  evidenceCount: number;
}

export interface Approval {
  id: string;
  useCaseId: string;
  decision: string;
  comment: string | null;
  approverId: string | null;
  decidedAt: string | null;
  createdAt: string;
}
