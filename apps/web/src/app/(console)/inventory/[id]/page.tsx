'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RiskBadge, StatusBadge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import type { Approval, ControlMapping, UseCase, UseCaseReadiness } from '@/lib/types';

const STATUS_LABEL: Record<string, string> = {
  IMPLEMENTED: 'Implemented',
  IN_PROGRESS: 'In progress',
  NOT_STARTED: 'Not started',
  NOT_APPLICABLE: 'Not applicable',
};

export default function UseCaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [uc, setUc] = useState<UseCase | null>(null);
  const [readiness, setReadiness] = useState<UseCaseReadiness | null>(null);
  const [controls, setControls] = useState<ControlMapping[] | null>(null);
  const [approvals, setApprovals] = useState<Approval[] | null>(null);

  useEffect(() => {
    if (!id) return;
    api.useCase(id).then(setUc).catch(() => undefined);
    api.useCaseReadiness(id).then(setReadiness).catch(() => undefined);
    api.controls(id).then(setControls).catch(() => undefined);
    api.approvals(id).then(setApprovals).catch(() => undefined);
  }, [id]);

  if (!uc) {
    return <div className="mx-auto max-w-6xl text-sm text-muted">Loading…</div>;
  }

  const pct = readiness?.summary.readinessPct ?? 0;
  const accent = pct === 100 ? '#3f7d58' : '#255c99';

  return (
    <div className="mx-auto max-w-6xl">
      <Link
        href="/inventory"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft size={15} /> AI Inventory
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-serif)' }}>
            {uc.name}
          </h1>
          <div className="mt-2 flex items-center gap-2">
            <RiskBadge tier={uc.riskTier} />
            <StatusBadge status={uc.lifecycle} />
            <span className="text-xs text-faint" style={{ fontFamily: 'var(--font-mono)' }}>
              {uc.id.slice(0, 8)}
            </span>
          </div>
        </div>
        <a href={api.reportUrl(uc.id)} target="_blank" rel="noreferrer">
          <Button variant="secondary">
            <Download size={16} /> Export readiness report
          </Button>
        </a>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="card p-5">
            <div className="text-sm font-medium">Overview</div>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div className="col-span-2">
                <dt className="text-xs text-faint">Purpose</dt>
                <dd className="mt-0.5">{uc.purpose ?? '—'}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs text-faint">Description</dt>
                <dd className="mt-0.5">{uc.description ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-faint">Registered</dt>
                <dd className="mt-0.5">{new Date(uc.createdAt).toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-xs text-faint">Risk tier</dt>
                <dd className="mt-0.5">{uc.riskTier}</dd>
              </div>
            </dl>
          </div>

          <div className="card overflow-hidden">
            <div className="border-b border-border px-5 py-3.5 text-sm font-medium">Mapped controls</div>
            {!controls ? (
              <div className="px-5 py-8 text-center text-sm text-muted">Loading…</div>
            ) : controls.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-muted">
                No controls mapped yet. Run a risk assessment to suggest the required controls.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-faint">
                    <th className="px-5 py-2.5 font-medium">Control</th>
                    <th className="px-5 py-2.5 font-medium">Status</th>
                    <th className="px-5 py-2.5 font-medium">Evidence</th>
                  </tr>
                </thead>
                <tbody>
                  {controls.map((c) => (
                    <tr key={c.id} className="border-b border-border last:border-0">
                      <td className="px-5 py-3">
                        <div className="font-medium">
                          {c.control.framework} {c.control.code}
                        </div>
                        <div className="text-xs text-muted">{c.control.title}</div>
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="tnum px-5 py-3 text-muted">{c.evidenceCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {readiness && readiness.summary.gaps.length > 0 ? (
            <div className="card p-5">
              <div className="text-sm font-medium">Gaps to close</div>
              <ul className="mt-3 space-y-2">
                {readiness.summary.gaps.map((g) => (
                  <li key={g.controlId} className="flex items-start gap-2 text-sm">
                    <span
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: '#c2410c' }}
                    />
                    <span>
                      <span className="font-medium">{g.code}</span>{' '}
                      <span className="text-muted">— {g.reason}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          <div className="card p-5">
            <div className="text-sm font-medium">Audit readiness</div>
            <div className="mt-3 flex items-end gap-2">
              <span
                className="tnum text-4xl font-semibold"
                style={{ fontFamily: 'var(--font-serif)', color: accent }}
              >
                {pct}%
              </span>
              {readiness ? (
                <span className="mb-1.5 text-xs text-muted">
                  {readiness.summary.satisfied} of {readiness.summary.required} controls
                </span>
              ) : null}
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, backgroundColor: accent }}
              />
            </div>
            {readiness ? (
              <div className="mt-4 space-y-1.5 text-sm">
                {(['IMPLEMENTED', 'IN_PROGRESS', 'NOT_STARTED', 'NOT_APPLICABLE'] as const).map((s) => (
                  <div key={s} className="flex items-center justify-between">
                    <span className="text-muted">{STATUS_LABEL[s]}</span>
                    <span className="tnum font-medium">{readiness.summary.byStatus[s] ?? 0}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="card p-5">
            <div className="text-sm font-medium">Review &amp; approvals</div>
            {!approvals ? (
              <div className="mt-3 text-sm text-muted">Loading…</div>
            ) : approvals.length === 0 ? (
              <div className="mt-3 text-sm text-muted">Not yet submitted for review.</div>
            ) : (
              <ul className="mt-3 space-y-3">
                {approvals.map((a) => (
                  <li key={a.id} className="flex items-start gap-2.5">
                    <span
                      className="mt-1 h-2 w-2 shrink-0 rounded-full"
                      style={{
                        backgroundColor:
                          a.decision === 'APPROVED'
                            ? '#3f7d58'
                            : a.decision === 'REJECTED'
                              ? '#b3001b'
                              : '#7ea3cc',
                      }}
                    />
                    <div className="text-sm">
                      <StatusBadge status={a.decision} />
                      {a.comment ? <div className="mt-1 text-muted">{a.comment}</div> : null}
                      <div className="mt-0.5 text-xs text-faint">
                        {a.decidedAt ? new Date(a.decidedAt).toLocaleDateString() : 'pending'}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
