interface StatProps {
  label: string;
  value: string | number;
  hint?: string;
  accent?: 'default' | 'warn' | 'ok' | 'sand';
}

const ACCENT: Record<string, string> = {
  default: 'text-ink',
  warn: 'text-risk-high',
  ok: 'text-success',
  sand: 'text-ink',
};

export function Stat({ label, value, hint, accent = 'default' }: StatProps) {
  return (
    <div className="card p-5">
      <div className="text-xs font-medium uppercase tracking-wide text-faint">{label}</div>
      <div
        className={`tnum mt-2 font-serif text-3xl font-semibold ${ACCENT[accent]}`}
        style={{ fontFamily: 'var(--font-serif)' }}
      >
        {value}
      </div>
      {hint ? <div className="mt-1 text-xs text-muted">{hint}</div> : null}
    </div>
  );
}
