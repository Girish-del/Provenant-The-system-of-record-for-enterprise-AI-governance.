'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import type { PolicyItem } from '@/lib/types';

const STATUS_TONE: Record<string, string> = {
  DRAFT: 'text-muted bg-surface border border-border',
  PUBLISHED: 'text-success',
  ARCHIVED: 'text-faint bg-surface border border-border',
};

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<PolicyItem[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const load = useCallback(() => {
    api.policies().then(setPolicies).catch(() => undefined);
  }, []);
  useEffect(load, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await api.createPolicy(title.trim(), body.trim() || undefined);
    setTitle('');
    setBody('');
    setCreating(false);
    load();
  }

  async function setStatus(p: PolicyItem, status: string) {
    await api.updatePolicy(p.id, { status });
    load();
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Policies" subtitle="Organizational AI policies, versioned like the control library.">
        <Button onClick={() => setCreating(true)}>
          <Plus size={16} /> New policy
        </Button>
      </PageHeader>

      {creating ? (
        <form onSubmit={create} className="card mb-4 space-y-3 p-5">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Policy title (e.g. Acceptable AI Use Policy)"
            className="focus-ring w-full rounded-md border border-border bg-canvas px-3 py-2.5 text-sm outline-none"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
            placeholder="Policy text (markdown welcome)…"
            className="focus-ring w-full resize-y rounded-md border border-border bg-canvas px-3 py-2.5 text-sm outline-none"
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim()}>
              Create draft
            </Button>
          </div>
        </form>
      ) : null}

      <div className="card overflow-hidden">
        {!policies ? (
          <div className="px-5 py-10 text-center text-sm text-muted">Loading…</div>
        ) : policies.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-muted">
            No policies yet. Start with an Acceptable AI Use Policy.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {policies.map((p) => (
              <div key={p.id} className="px-5 py-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <span className="text-sm font-medium">{p.title}</span>
                    <span className="ml-2 text-xs text-faint" style={{ fontFamily: 'var(--font-mono)' }}>
                      v{p.version}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      className={`rounded-sm px-2 py-0.5 text-xs font-medium ${STATUS_TONE[p.status] ?? ''}`}
                      style={
                        p.status === 'PUBLISHED'
                          ? { backgroundColor: 'color-mix(in srgb, #3f7d58 12%, transparent)' }
                          : undefined
                      }
                    >
                      {p.status}
                    </span>
                    {p.status === 'DRAFT' ? (
                      <Button className="px-3 py-1" onClick={() => setStatus(p, 'PUBLISHED')}>
                        Publish
                      </Button>
                    ) : p.status === 'PUBLISHED' ? (
                      <Button variant="secondary" className="px-3 py-1" onClick={() => setStatus(p, 'ARCHIVED')}>
                        Archive
                      </Button>
                    ) : null}
                  </div>
                </div>
                {p.body ? (
                  <p className="mt-2 line-clamp-2 max-w-3xl text-sm text-muted">{p.body}</p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
