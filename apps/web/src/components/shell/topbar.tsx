'use client';

import { Search } from 'lucide-react';
import type { SessionInfo } from '@/lib/types';
import { api } from '@/lib/api';

export function Topbar({ session }: { session: SessionInfo }) {
  const initials = (session.email ?? session.role ?? 'U').slice(0, 2).toUpperCase();

  async function logout() {
    await api.logout().catch(() => undefined);
    window.location.href = '/login';
  }

  return (
    <header className="flex items-center justify-between border-b border-border bg-canvas px-6 py-3">
      <div className="flex items-center gap-2.5 text-sm">
        <span className="font-medium">{session.orgName ?? 'Workspace'}</span>
        <span
          className="rounded-sm border border-border px-1.5 py-0.5 text-[11px] text-muted"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          EU · Frankfurt
        </span>
        <span className="rounded-sm px-1.5 py-0.5 text-[11px] font-medium text-primary"
          style={{ backgroundColor: 'color-mix(in srgb, #255c99 11%, transparent)' }}>
          {session.role}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-faint md:flex">
          <Search size={15} />
          <span>Search use cases, controls, evidence…</span>
          <kbd
            className="ml-4 rounded-sm border border-border bg-canvas px-1.5 text-[11px]"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            ⌘K
          </kbd>
        </div>
        <button onClick={logout} className="text-sm text-muted transition-colors hover:text-ink">
          Sign out
        </button>
        <div
          className="grid h-8 w-8 place-items-center rounded-full text-xs font-semibold"
          style={{ backgroundColor: '#ccad8f', color: '#5b4a33' }}
        >
          {initials}
        </div>
      </div>
    </header>
  );
}
