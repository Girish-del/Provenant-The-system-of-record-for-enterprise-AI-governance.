'use client';

import { useCallback, useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import type { BillingStatus, Member } from '@/lib/types';

const ROLES = ['ADMIN', 'CONTRIBUTOR', 'REVIEWER', 'VIEWER'];

export default function SettingsPage() {
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [members, setMembers] = useState<Member[] | null>(null);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('CONTRIBUTOR');
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(() => {
    api.billing().then(setBilling).catch(() => undefined);
    api.members().then(setMembers).catch(() => undefined);
  }, []);
  useEffect(load, [load]);

  async function upgrade(tier: string) {
    setNote(null);
    const res = await api.checkout(tier).catch(() => null);
    if (!res) {
      setNote('Checkout failed.');
      return;
    }
    if (res.mock) {
      // No Stripe keys in this environment: apply the plan via the dev path so
      // the upgrade flow is fully demoable end-to-end.
      await api.setPlanDev(tier);
      setNote(`Plan changed to ${tier} (dev mode — Stripe checkout takes over once keys are set).`);
      load();
    } else {
      window.location.href = res.url;
    }
  }

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    await api.invite(email.trim(), role).catch(() => setNote('Invite failed — already a member?'));
    setEmail('');
    load();
  }

  const pct =
    billing && billing.meter.limit ? Math.min(100, (billing.meter.used / billing.meter.limit) * 100) : 0;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Settings" subtitle="Plan, usage, and workspace members." />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <div className="text-sm font-medium">Plan &amp; usage</div>
          {!billing ? (
            <div className="mt-3 text-sm text-muted">Loading…</div>
          ) : (
            <>
              <div className="mt-3 flex items-end justify-between">
                <span className="font-serif text-2xl font-semibold" style={{ fontFamily: 'var(--font-serif)' }}>
                  {billing.plans[billing.plan]?.name ?? billing.plan}
                </span>
                <span className="tnum text-sm text-muted">
                  {billing.meter.used}
                  {billing.meter.limit !== null ? ` / ${billing.meter.limit}` : ''} governed systems
                </span>
              </div>
              {billing.meter.limit !== null ? (
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: pct >= 100 ? '#c2410c' : '#255c99',
                    }}
                  />
                </div>
              ) : null}
              <div className="mt-5 grid gap-2 sm:grid-cols-3">
                {(['TEAM', 'BUSINESS', 'ENTERPRISE'] as const).map((tier) => {
                  const plan = billing.plans[tier]!;
                  const current = billing.plan === tier;
                  return (
                    <div key={tier} className="rounded-md border border-border p-3">
                      <div className="text-sm font-medium">{plan.name}</div>
                      <div className="mt-0.5 text-xs text-muted">
                        {plan.systemLimit === null ? 'Unlimited' : `${plan.systemLimit}`} systems
                      </div>
                      <div className="tnum mt-1 text-sm">
                        {plan.priceMonthlyUsd === null ? 'Custom' : `$${plan.priceMonthlyUsd}/mo`}
                      </div>
                      <Button
                        variant={current ? 'secondary' : 'primary'}
                        disabled={current || tier === 'ENTERPRISE'}
                        onClick={() => upgrade(tier)}
                        className="mt-2 w-full px-2 py-1.5 text-xs"
                      >
                        {current ? 'Current' : tier === 'ENTERPRISE' ? 'Contact sales' : 'Upgrade'}
                      </Button>
                    </div>
                  );
                })}
              </div>
              {note ? <p className="mt-3 text-xs text-muted">{note}</p> : null}
            </>
          )}
        </div>

        <div className="card p-5">
          <div className="text-sm font-medium">Members</div>
          <form onSubmit={invite} className="mt-3 flex gap-2">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@company.com"
              className="focus-ring w-full rounded-md border border-border bg-canvas px-3 py-2 text-sm outline-none"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="focus-ring rounded-md border border-border bg-canvas px-2 py-2 text-sm outline-none"
            >
              {ROLES.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
            <Button type="submit" className="px-3 py-2">
              Invite
            </Button>
          </form>
          {!members ? (
            <div className="mt-4 text-sm text-muted">Loading…</div>
          ) : (
            <div className="mt-4 divide-y divide-border">
              {members.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="truncate text-sm">{m.user.email}</span>
                  <select
                    value={m.role}
                    onChange={(e) => api.changeRole(m.id, e.target.value).then(load, () => load())}
                    className="focus-ring rounded-md border border-border bg-canvas px-2 py-1 text-xs outline-none"
                  >
                    {ROLES.map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}
          <p className="mt-3 text-xs text-faint">
            Roles: Admin (everything) · Contributor (register &amp; assess) · Reviewer (approve/reject) ·
            Viewer (read-only). Invites email a sign-in link when email keys are configured.
          </p>
        </div>
      </div>
    </div>
  );
}
