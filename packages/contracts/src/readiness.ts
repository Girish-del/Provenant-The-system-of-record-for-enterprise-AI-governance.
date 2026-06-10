import type { ReadinessSummary } from '@aegis/core';

export type { ReadinessSummary, Gap } from '@aegis/core';

export interface UseCaseReadinessDto {
  useCaseId: string;
  name: string;
  riskTier: string;
  summary: ReadinessSummary;
}

export interface PortfolioReadinessDto {
  totalUseCases: number;
  byRiskTier: Record<string, number>;
  byLifecycle: Record<string, number>;
  auditReady: number; // use cases at 100% readiness
  notReady: number;
  avgReadinessPct: number;
  highRiskNotReady: number; // HIGH/PROHIBITED use cases below 100%
}
