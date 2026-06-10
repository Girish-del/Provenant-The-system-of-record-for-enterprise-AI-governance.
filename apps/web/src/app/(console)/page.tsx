'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Stat } from '@/components/ui/stat';
import { RiskBadge, StatusBadge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import type { PortfolioReadiness, UseCase } from '@/lib/types';

const DEADLINE = Date.parse('2026-08-02T00:00:00Z');
const TIER_ORDER = ['PROHIBITED', 'HIGH', 'LIMITED', 'MINIMAL', 'UNASSIGNED'] as const;
const TIER_HEX: Record<string, string> = {
  PROHIBITED: '#b3001b',
  HIGH: '#c2410c',
  LIMITED: '#b7791f',
  MINIMAL: '#3f7d58',
  UNASSIGNED: '#cbd3dc',
};
const TIER_LABEL: Record<string, string> = {
  PROHIBITED: 'Prohibited',
  HIGH: 'High',
  LIMITED: 'Limited',
  MINIMAL: 'Minimal',
  UNASSIGNED: 'Unassigned',
};

export default function DashboardPage() {
  const [portfolio, setPortfolio] = useState<PortfolioReadiness | null>(null);
  const [useCases, setUseCases] = useState<UseCase[] | null>(null);

  useEffect(() => {
    api.portfolio().then(setPortfolio).catch(() => undefined);
    api.useCases().then(setUseCases).catch(() => undefined);
  }, []);

  if (!portfolio || !useCases) {
    return (
      <div className="mx-auto max-w-6xl animate-pulse">
        <div className="h-8 w-44 rounded bg-border" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-lg bg-border/40" />
          ))}
        </div>
      </div>
    );
  }

  const total = portfolio.totalUseCases;
  const highRisk = (portfolio.byRiskTier.HIGH ?? 0) + (portfolio.byRiskTier.PROHIBITED ?? 0);
  const days = Math.max(0, Math.ceil((DEADLINE - Date.now()) / 86_400_000));
  const tierSegments = TIER_ORDER.map((tier) => ({ tier, count: portfolio.byRiskTier[tier] ?? 0 })).filter(
    (x) => x.count > 0,
  );
  const recent = useCases.slice(0, 6);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Dashboard"
        subtitle="Portfolio risk posture and EU AI Act readiness across your AI systems."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Governed systems"
          value={total}
          hint={`${portfolio.byLifecycle.IN_PRODUCTION ?? 0} in production`}
        />
        <Stat
          label="High-risk"
          value={highRisk}
          accent="warn"
          hint={`${portfolio.highRiskNotReady} not yet audit-ready`}
        />
        <Stat
          label="Audit-ready"
          value={`${total ? Math.round((portfolio.auditReady / total) * 100) : 100}%`}
          accent="ok"
          hint={`${portfolio.auditReady} of ${total} systems`}
        />
        <Stat label="Days to 2 Aug 2026" value={days} hint="EU AI Act high-risk obligations" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="card p-5">
          <div className="text-sm font-medium">Risk distribution</div>
          <div className="mt-4 flex h-2.5 w-full overflow-hidden rounded-full bg-surface">
            {tierSegments.map((x) => (
              <div
                key={x.tier}
                style={{ width: `${(x.count / total) * 100}%`, backgroundColor: TIER_HEX[x.tier] }}
                title={`${TIER_LABEL[x.tier]}: ${x.count}`}
              />
            ))}
          </div>
          <div className="mt-4 space-y-2">
            {TIER_ORDER.map((tier) => (
              <div key={tier} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: TIER_HEX[tier] }} />
                  {TIER_LABEL[tier]}
                </span>
                <span className="tnum font-medium">{portfolio.byRiskTier[tier] ?? 0}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <span className="text-sm font-medium">Recently registered</span>
            <Link href="/inventory" className="flex items-center gap-1 text-sm text-primary hover:underline">
              View all <ArrowUpRight size={14} />
            </Link>
          </div>
          {recent.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-muted">No AI systems registered yet.</div>
          ) : (
            <div className="divide-y divide-border">
              {recent.map((uc) => (
                <Link
                  key={uc.id}
                  href={`/inventory/${uc.id}`}
                  className="flex items-center justify-between gap-4 px-5 py-3 transition-colors hover:bg-surface"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{uc.name}</div>
                    <div className="text-xs text-muted">
                      Registered {new Date(uc.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <StatusBadge status={uc.lifecycle} />
                    <RiskBadge tier={uc.riskTier} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {portfolio.highRiskNotReady > 0 ? (
        <div
          className="mt-4 flex items-start gap-3 rounded-lg border px-4 py-3 text-sm"
          style={{
            borderColor: 'color-mix(in srgb, #c2410c 35%, transparent)',
            backgroundColor: 'color-mix(in srgb, #c2410c 7%, transparent)',
            color: '#c2410c',
          }}
        >
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <span>
            <strong>
              {portfolio.highRiskNotReady} high-risk{' '}
              {portfolio.highRiskNotReady === 1 ? 'system is' : 'systems are'} not yet audit-ready.
            </strong>{' '}
            Map the required controls and attach verified evidence before the deadline.
          </span>
        </div>
      ) : null}
    </div>
  );
}
