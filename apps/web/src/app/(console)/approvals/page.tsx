'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, X } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import type { Approval, UseCase } from '@/lib/types';

export default function ApprovalsPage() {
  const [pending, setPending] = useState<Approval[] | null>(null);
  const [decided, setDecided] = useState<Approval[] | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    Promise.all([api.approvalQueue('PENDING'), api.approvalQueue(), api.useCases()]).then(
      ([p, all, useCases]) => {
        setPending(p);
        setDecided(all.filter((a) => a.decision !== 'PENDING').slice(0, 10));
        setNames(Object.fromEntries(useCases.map((u: UseCase) => [u.id, u.name])));
      },
      () => undefined,
    );
  }, []);
  useEffect(load, [load]);

  async function decide(id: string, decision: 'APPROVED' | 'REJECTED') {
    setBusy(id);
    try {
      await api.decide(id, decision);
      load();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Approvals"
        subtitle="Review queue for AI systems awaiting a governance decision."
      />

      <div className="card overflow-hidden">
        <div className="border-b border-border px-5 py-3.5 text-sm font-medium">
          Pending ({pending?.length ?? '…'})
        </div>
        {!pending ? (
          <div className="px-5 py-10 text-center text-sm text-muted">Loading…</div>
        ) : pending.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-muted">
            Nothing waiting on you. Systems submitted for review appear here.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {pending.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                <div className="min-w-0">
                  <Link
                    href={`/inventory/${a.useCaseId}`}
                    className="truncate text-sm font-medium hover:text-primary"
                  >
                    {names[a.useCaseId] ?? a.useCaseId.slice(0, 8)}
                  </Link>
                  <div className="text-xs text-muted">
                    Submitted {new Date(a.createdAt).toLocaleDateString()}
                    {a.comment ? ` — “${a.comment}”` : ''}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    onClick={() => decide(a.id, 'APPROVED')}
                    disabled={busy === a.id}
                    className="px-3 py-1.5"
                  >
                    <Check size={15} /> Approve
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => decide(a.id, 'REJECTED')}
                    disabled={busy === a.id}
                    className="px-3 py-1.5"
                  >
                    <X size={15} /> Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {decided && decided.length > 0 ? (
        <div className="card mt-4 overflow-hidden">
          <div className="border-b border-border px-5 py-3.5 text-sm font-medium">Recently decided</div>
          <div className="divide-y divide-border">
            {decided.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-4 px-5 py-3">
                <Link
                  href={`/inventory/${a.useCaseId}`}
                  className="truncate text-sm hover:text-primary"
                >
                  {names[a.useCaseId] ?? a.useCaseId.slice(0, 8)}
                </Link>
                <div className="flex items-center gap-3">
                  <StatusBadge status={a.decision} />
                  <span className="text-xs text-faint">
                    {a.decidedAt ? new Date(a.decidedAt).toLocaleDateString() : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
