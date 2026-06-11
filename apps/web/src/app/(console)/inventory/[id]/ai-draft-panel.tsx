'use client';

import { useState } from 'react';
import { Copy, Download, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import type { AiDraft } from '@/lib/types';

const KINDS = [
  { value: 'risk_summary', label: 'Risk summary' },
  { value: 'fria', label: 'FRIA (fundamental rights)' },
  { value: 'dpia', label: 'DPIA (data protection)' },
];

/**
 * AI-drafted content is advisory only — visually distinct (Sand), provenance-
 * labeled, and never auto-applied. The human takes it away (copy/download)
 * and reviews it; nothing is written into governance records automatically.
 */
export function AiDraftPanel({ useCaseId, useCaseName }: { useCaseId: string; useCaseName: string }) {
  const [kind, setKind] = useState('risk_summary');
  const [draft, setDraft] = useState<AiDraft | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      setDraft(await api.aiDraft(useCaseId, kind));
    } catch {
      setError('AI service unavailable (is it running, with budget remaining?).');
    } finally {
      setLoading(false);
    }
  }

  function download() {
    if (!draft) return;
    const blob = new Blob([draft.content], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${useCaseName.replace(/\W+/g, '-')}-${kind}-AI-DRAFT.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div
      className="rounded-lg border p-5"
      style={{
        borderColor: 'color-mix(in srgb, #ccad8f 55%, transparent)',
        backgroundColor: 'color-mix(in srgb, #ccad8f 12%, transparent)',
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Sparkles size={16} style={{ color: '#8a6d4a' }} /> Draft with AI
        </div>
        <div className="flex gap-2">
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            className="focus-ring rounded-md border border-border bg-canvas px-2 py-1.5 text-xs outline-none"
          >
            {KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
          <Button onClick={generate} disabled={loading} className="px-3 py-1.5 text-xs">
            {loading ? 'Drafting…' : 'Generate'}
          </Button>
        </div>
      </div>

      {error ? <p className="mt-3 text-sm text-carmine">{error}</p> : null}

      {draft ? (
        <div className="mt-4">
          <div
            className="inline-block rounded-sm px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide"
            style={{
              fontFamily: 'var(--font-mono)',
              color: '#8a6d4a',
              backgroundColor: 'color-mix(in srgb, #ccad8f 40%, transparent)',
            }}
          >
            AI-drafted · advisory only · {draft.provenance.provider}/{draft.provenance.model}
          </div>
          <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-canvas p-4 text-xs leading-relaxed">
            {draft.content}
          </pre>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[11px] text-faint">
              Sources: {draft.provenance.sources.join('; ') || '—'} · must be reviewed by a qualified
              person before use
            </span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="px-2.5 py-1 text-xs"
                onClick={() => navigator.clipboard.writeText(draft.content)}
              >
                <Copy size={13} /> Copy
              </Button>
              <Button variant="secondary" className="px-2.5 py-1 text-xs" onClick={download}>
                <Download size={13} /> Download .md
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
