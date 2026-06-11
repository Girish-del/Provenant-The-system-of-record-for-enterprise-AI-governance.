'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Download } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { RiskBadge, StatusBadge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import type { UseCase, UseCaseReadiness } from '@/lib/types';

interface Row extends UseCase {
  readinessPct?: number;
}

export default function ReportsPage() {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    api
      .useCases()
      .then(async (useCases) => {
        const readiness = await Promise.all(
          useCases.map((u) => api.useCaseReadiness(u.id).catch(() => null)),
        );
        setRows(
          useCases.map((u, i) => ({
            ...u,
            readinessPct: (readiness[i] as UseCaseReadiness | null)?.summary.readinessPct,
          })),
        );
      })
      .catch(() => undefined);
  }, []);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Reports"
        subtitle="Audit-ready EU AI Act readiness reports, per governed system."
      />
      <div className="card overflow-hidden">
        {!rows ? (
          <div className="px-5 py-10 text-center text-sm text-muted">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-muted">
            Register an AI system to generate its readiness report.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-faint">
                <th className="px-5 py-3 font-medium">System</th>
                <th className="px-5 py-3 font-medium">Risk</th>
                <th className="px-5 py-3 font-medium">Lifecycle</th>
                <th className="px-5 py-3 font-medium">Readiness</th>
                <th className="px-5 py-3 font-medium">Report</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-3.5">
                    <Link href={`/inventory/${r.id}`} className="font-medium hover:text-primary">
                      {r.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5">
                    <RiskBadge tier={r.riskTier} />
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={r.lifecycle} />
                  </td>
                  <td className="tnum px-5 py-3.5">
                    {r.readinessPct !== undefined ? `${r.readinessPct}%` : '—'}
                  </td>
                  <td className="px-5 py-3.5">
                    <a
                      href={api.reportUrl(r.id)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-primary hover:underline"
                    >
                      <Download size={14} /> Markdown
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="mt-3 text-xs text-faint">
        Reports include system identity, risk classification with rationale, control status,
        verified evidence counts, gaps, and the full approval trail.
      </p>
    </div>
  );
}
