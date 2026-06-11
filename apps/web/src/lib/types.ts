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

export interface Questionnaire {
  key: string;
  name: string;
  version: string;
  questions: { key: string; order: number; text: string; type: string }[];
}

export interface AssessmentResult {
  id: string;
  useCaseId: string;
  tier: string;
  rationale: string;
  status: string;
  createdAt: string;
}

export interface EvidenceItem {
  id: string;
  fileName: string;
  mimeType: string | null;
  sha256: string | null;
  scanStatus: string;
  createdAt: string;
}

export interface ReviewWorkflow {
  id: string;
  status: string;
  createdAt: string;
  steps: {
    id: string;
    title: string;
    status: string;
    assigneeId: string | null;
    dueAt: string | null;
    overdue: boolean;
  }[];
}

export interface AiDraft {
  content: string;
  provenance: {
    provider: string;
    model: string;
    generated_at: string;
    advisory: boolean;
    label: string;
    sources: string[];
  };
}

export interface BillingStatus {
  plan: string;
  subscriptionStatus: string | null;
  meter: {
    tier: string;
    limit: number | null;
    used: number;
    remaining: number | null;
    overLimit: boolean;
  };
  plans: Record<
    string,
    { tier: string; name: string; systemLimit: number | null; priceMonthlyUsd: number | null }
  >;
}

export interface Member {
  id: string;
  role: string;
  createdAt: string;
  user: { id: string; email: string };
}

export interface PolicyItem {
  id: string;
  title: string;
  body: string | null;
  version: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}
