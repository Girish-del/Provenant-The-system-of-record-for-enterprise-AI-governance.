const RISK: Record<string, { label: string; hex: string }> = {
  PROHIBITED: { label: 'Prohibited', hex: '#b3001b' },
  HIGH: { label: 'High', hex: '#c2410c' },
  LIMITED: { label: 'Limited', hex: '#b7791f' },
  MINIMAL: { label: 'Minimal', hex: '#3f7d58' },
  UNASSIGNED: { label: 'Unassigned', hex: '#9aa6b2' },
};

export function RiskBadge({ tier }: { tier: string }) {
  const meta = RISK[tier] ?? RISK.UNASSIGNED;
  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-sm px-2 py-0.5 text-xs font-medium"
      style={{ color: meta.hex, backgroundColor: `color-mix(in srgb, ${meta.hex} 13%, transparent)` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.hex }} />
      {meta.label}
    </span>
  );
}

const STATUS: Record<string, { label: string; tone: 'neutral' | 'primary' | 'success' | 'danger' }> = {
  // lifecycle
  PROPOSED: { label: 'Proposed', tone: 'neutral' },
  IN_REVIEW: { label: 'In review', tone: 'primary' },
  APPROVED: { label: 'Approved', tone: 'success' },
  IN_PRODUCTION: { label: 'In production', tone: 'success' },
  RETIRED: { label: 'Retired', tone: 'neutral' },
  // control status
  NOT_STARTED: { label: 'Not started', tone: 'neutral' },
  IN_PROGRESS: { label: 'In progress', tone: 'primary' },
  IMPLEMENTED: { label: 'Implemented', tone: 'success' },
  NOT_APPLICABLE: { label: 'N/A', tone: 'neutral' },
  // approvals
  PENDING: { label: 'Pending', tone: 'primary' },
  REJECTED: { label: 'Rejected', tone: 'danger' },
};

const TONE: Record<string, string> = {
  neutral: 'text-muted bg-surface border border-border',
  primary: 'text-primary',
  success: 'text-success',
  danger: 'text-carmine',
};

const TONE_BG: Record<string, string> = {
  primary: 'color-mix(in srgb, #255c99 11%, transparent)',
  success: 'color-mix(in srgb, #3f7d58 12%, transparent)',
  danger: 'color-mix(in srgb, #b3001b 11%, transparent)',
};

export function StatusBadge({ status }: { status: string }) {
  const meta = STATUS[status] ?? { label: status, tone: 'neutral' as const };
  const style = meta.tone === 'neutral' ? undefined : { backgroundColor: TONE_BG[meta.tone] };
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-sm px-2 py-0.5 text-xs font-medium ${TONE[meta.tone]}`}
      style={style}
    >
      {meta.label}
    </span>
  );
}
