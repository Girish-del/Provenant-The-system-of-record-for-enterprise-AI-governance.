'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Boxes,
  ShieldAlert,
  ListChecks,
  FileText,
  GitBranch,
  BarChart3,
  ScrollText,
  Settings2,
  type LucideIcon,
} from 'lucide-react';
import { BrandMark } from './brand';
import { cn } from '@/lib/cn';

const NAV: { label: string; href: string; icon: LucideIcon }[] = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'AI Inventory', href: '/inventory', icon: Boxes },
];

const MODULES: { label: string; icon: LucideIcon }[] = [
  { label: 'Risk Assessments', icon: ShieldAlert },
  { label: 'Controls', icon: ListChecks },
  { label: 'Evidence', icon: FileText },
  { label: 'Workflows', icon: GitBranch },
  { label: 'Reports', icon: BarChart3 },
  { label: 'Policies', icon: ScrollText },
  { label: 'Settings', icon: Settings2 },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-border bg-surface">
      <div className="flex items-center gap-2.5 px-5 py-4">
        <BrandMark />
        <div>
          <div className="text-lg font-semibold leading-none" style={{ fontFamily: 'var(--font-serif)' }}>
            Aegis
          </div>
          <div className="mt-1 text-[11px] text-faint">AI Governance</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2">
        {NAV.map((item) => {
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'mb-0.5 flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                active ? 'font-medium text-primary' : 'text-muted hover:bg-canvas hover:text-ink',
              )}
              style={active ? { backgroundColor: 'color-mix(in srgb, #255c99 12%, transparent)' } : undefined}
            >
              <Icon size={17} strokeWidth={active ? 2.2 : 1.8} />
              {item.label}
            </Link>
          );
        })}

        <div className="mb-1 mt-5 px-3 text-[11px] font-medium uppercase tracking-wide text-faint">
          Modules
        </div>
        {MODULES.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="mb-0.5 flex items-center gap-3 rounded-md px-3 py-2 text-sm text-faint"
            >
              <Icon size={17} strokeWidth={1.8} />
              <span>{item.label}</span>
              <span className="ml-auto rounded-sm bg-canvas px-1.5 py-0.5 text-[10px] font-medium">
                Soon
              </span>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-border px-5 py-3 text-[11px] text-faint">
        EU AI Act · NIST AI RMF · ISO 42001
      </div>
    </aside>
  );
}
