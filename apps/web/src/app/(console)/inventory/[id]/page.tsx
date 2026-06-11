'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Download, ListChecks, Paperclip, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RiskBadge, StatusBadge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import type {
  Approval,
  ControlMapping,
  ReviewWorkflow,
  UseCase,
  UseCaseReadiness,
} from '@/lib/types';
import { AssessmentModal } from './assessment-modal';
import { AiDraftPanel } from './ai-draft-panel';

const CONTROL_STATUSES = ['NOT_STARTED', 'IN_PROGRESS', 'IMPLEMENTED', 'NOT_APPLICABLE'];

export default function UseCaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [uc, setUc] = useState<UseCase | null>(null);
  const [readiness, setReadiness] = useState<UseCaseReadiness | null>(null);
  const [controls, setControls] = useState<ControlMapping[] | null>(null);
  const [approvals, setApprovals] = useState<Approval[] | null>(null);
  const [workflow, setWorkflow] = useState<ReviewWorkflow | null>(null);
  const [assessing, setAssessing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const fileFor = useRef<string | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);

  const load = useCallback(() => {
    if (!id) return;
    api.useCase(id).then(setUc).catch(() => undefined);
    api.useCaseReadiness(id).then(setReadiness).catch(() => undefined);
    api.controls(id).then(setControls).catch(() => undefined);
    api.approvals(id).then(setApprovals).catch(() => undefined);
    api.workflow(id).then(setWorkflow).catch(() => undefined);
  }, [id]);
  useEffect(load, [load]);

  if (!uc) {
    return <div className="mx-auto max-w-6xl text-sm text-muted">Loading…</div>;
  }

  const pct = readiness?.summary.readinessPct ?? 0;
  const accent = pct === 100 ? '#3f7d58' : '#255c99';
  const pendingApproval = approvals?.find((a) => a.decision === 'PENDING');

  async function run(label: string, fn: () => Promise<unknown>) {
    setBusy(label);
    try {
      await fn();
      load();
    } finally {
      setBusy(null);
    }
  }

  function pickEvidence(mappingId: string) {
    fileFor.current = mappingId;
    fileInput.current?.click();
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const mappingId = fileFor.current;
    e.target.value = '';
    if (!file || !mappingId) return;
    await run('evidence', () => api.uploadEvidence(mappingId, file));
  }

  return (
    <div className="mx-auto max-w-6xl">
      <input ref={fileInput} type="file" className="hidden" onChange={onFile} />
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
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setAssessing(true)}>
            <ShieldAlert size={16} /> {uc.riskTier === 'UNASSIGNED' ? 'Assess risk' : 'Re-assess'}
          </Button>
          {uc.lifecycle === 'PROPOSED' ? (
            <Button
              disabled={busy === 'submit'}
              onClick={() => run('submit', () => api.submitForReview(uc.id))}
            >
              Submit for review
            </Button>
          ) : null}
          {pendingApproval ? (
            <>
              <Button
                disabled={busy === 'approve'}
                onClick={() => run('approve', () => api.decide(pendingApproval.id, 'APPROVED'))}
              >
                Approve
              </Button>
              <Button
                variant="danger"
                disabled={busy === 'reject'}
                onClick={() => run('reject', () => api.decide(pendingApproval.id, 'REJECTED'))}
              >
                Reject
              </Button>
            </>
          ) : null}
          <a href={api.reportUrl(uc.id)} target="_blank" rel="noreferrer">
            <Button variant="secondary">
              <Download size={16} /> Report
            </Button>
          </a>
        </div>
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

          <AiDraftPanel useCaseId={uc.id} useCaseName={uc.name} />

          <div className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
              <span className="text-sm font-medium">Controls</span>
              <Button
                variant="secondary"
                className="px-3 py-1.5 text-xs"
                disabled={busy === 'suggest'}
                onClick={() => run('suggest', () => api.suggestControls(uc.id))}
              >
                <ListChecks size={14} /> Suggest required controls
              </Button>
            </div>
            {!controls || controls.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-muted">
                No controls mapped yet. Assess the risk, then suggest the required controls.
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
                        <select
                          value={c.status}
                          onChange={(e) =>
                            run('status', () => api.updateControlStatus(uc.id, c.id, e.target.value))
                          }
                          className="focus-ring rounded-md border border-border bg-canvas px-2 py-1 text-xs outline-none"
                        >
                          {CONTROL_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s.replace('_', ' ').toLowerCase()}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-5 py-3">
                        <button
                          onClick={() => pickEvidence(c.id)}
                          className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                        >
                          <Paperclip size={13} />
                          <span className="tnum">{c.evidenceCount}</span> · attach
                        </button>
                      </td>
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
          </div>

          {workflow ? (
            <div className="card p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Review workflow</span>
                <span className="text-xs text-faint">{workflow.status}</span>
              </div>
              <ul className="mt-3 space-y-2.5">
                {workflow.steps.map((s) => (
                  <li key={s.id} className="flex items-start gap-2.5 text-sm">
                    <span
                      className="mt-1 h-2 w-2 shrink-0 rounded-full"
                      style={{
                        backgroundColor:
                          s.status === 'DONE' ? '#3f7d58' : s.overdue ? '#b3001b' : '#7ea3cc',
                      }}
                    />
                    <div>
                      <div>{s.title}</div>
                      <div className="text-xs text-faint">
                        {s.status === 'DONE'
                          ? 'done'
                          : s.dueAt
                            ? `due ${new Date(s.dueAt).toLocaleDateString()}${s.overdue ? ' · overdue' : ''}`
                            : 'open'}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="card p-5">
            <div className="text-sm font-medium">Approvals</div>
            {!approvals || approvals.length === 0 ? (
              <div className="mt-3 text-sm text-muted">Not yet submitted for review.</div>
            ) : (
              <ul className="mt-3 space-y-3">
                {approvals.map((a) => (
                  <li key={a.id} className="text-sm">
                    <StatusBadge status={a.decision} />
                    {a.comment ? <div className="mt-1 text-muted">{a.comment}</div> : null}
                    <div className="mt-0.5 text-xs text-faint">
                      {a.decidedAt ? new Date(a.decidedAt).toLocaleDateString() : 'pending'}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {assessing ? (
        <AssessmentModal
          useCaseId={uc.id}
          onClose={() => setAssessing(false)}
          onDone={() => {
            setAssessing(false);
            load();
          }}
        />
      ) : null}
    </div>
  );
}
