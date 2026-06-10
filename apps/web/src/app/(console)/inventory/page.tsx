'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { RiskBadge, StatusBadge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import type { UseCase } from '@/lib/types';

export default function InventoryPage() {
  const router = useRouter();
  const [useCases, setUseCases] = useState<UseCase[] | null>(null);
  const [open, setOpen] = useState(false);

  function load() {
    api.useCases().then(setUseCases).catch(() => undefined);
  }
  useEffect(load, []);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="AI Inventory" subtitle="Every AI system, model, and use case under governance.">
        <Button onClick={() => setOpen(true)}>
          <Plus size={16} /> Register AI system
        </Button>
      </PageHeader>

      <div className="card overflow-hidden">
        {!useCases ? (
          <div className="px-5 py-12 text-center text-sm text-muted">Loading…</div>
        ) : useCases.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <div className="text-sm font-medium">No AI systems yet</div>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
              Register your first AI system to classify its risk and start collecting audit evidence.
            </p>
            <Button className="mt-4" onClick={() => setOpen(true)}>
              <Plus size={16} /> Register AI system
            </Button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-faint">
                <th className="px-5 py-3 font-medium">System</th>
                <th className="px-5 py-3 font-medium">Lifecycle</th>
                <th className="px-5 py-3 font-medium">Risk</th>
                <th className="px-5 py-3 font-medium">Registered</th>
              </tr>
            </thead>
            <tbody>
              {useCases.map((uc) => (
                <tr
                  key={uc.id}
                  onClick={() => router.push(`/inventory/${uc.id}`)}
                  className="cursor-pointer border-b border-border last:border-0 transition-colors hover:bg-surface"
                >
                  <td className="px-5 py-3.5">
                    <div className="font-medium">{uc.name}</div>
                    {uc.purpose ? (
                      <div className="mt-0.5 truncate text-xs text-muted">{uc.purpose}</div>
                    ) : null}
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={uc.lifecycle} />
                  </td>
                  <td className="px-5 py-3.5">
                    <RiskBadge tier={uc.riskTier} />
                  </td>
                  <td className="px-5 py-3.5 text-muted">
                    {new Date(uc.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {open ? (
        <RegisterModal
          onClose={() => setOpen(false)}
          onCreated={(uc) => {
            setOpen(false);
            router.push(`/inventory/${uc.id}`);
          }}
        />
      ) : null}
    </div>
  );
}

function RegisterModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (uc: UseCase) => void;
}) {
  const [name, setName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const uc = await api.createUseCase({ name: name.trim(), purpose: purpose.trim() || undefined });
      onCreated(uc);
    } catch {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-ink/30 p-4"
      onClick={onClose}
    >
      <div className="card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-serif)' }}>
            Register AI system
          </h2>
          <button onClick={onClose} className="text-faint hover:text-ink">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={submit} className="mt-4 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">System name</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="focus-ring w-full rounded-md border border-border bg-canvas px-3 py-2.5 text-sm outline-none"
              placeholder="e.g. Resume Screener"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Purpose <span className="font-normal text-faint">(optional)</span>
            </label>
            <textarea
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              rows={3}
              className="focus-ring w-full resize-none rounded-md border border-border bg-canvas px-3 py-2.5 text-sm outline-none"
              placeholder="What does this system do?"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !name.trim()}>
              {saving ? 'Creating…' : 'Create'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
