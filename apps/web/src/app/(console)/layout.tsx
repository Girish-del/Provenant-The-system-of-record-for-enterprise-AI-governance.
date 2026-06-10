'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/shell/sidebar';
import { Topbar } from '@/components/shell/topbar';
import { api } from '@/lib/api';
import type { SessionInfo } from '@/lib/types';

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<SessionInfo | null>(null);

  useEffect(() => {
    api.me().then(setSession).catch(() => undefined);
  }, []);

  if (!session) {
    return (
      <div className="grid h-screen place-items-center text-sm text-muted">
        Loading your workspace…
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar session={session} />
        <main className="flex-1 overflow-auto px-8 py-7">{children}</main>
      </div>
    </div>
  );
}
