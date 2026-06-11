'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { BrandMark } from '@/components/shell/brand';
import { Button } from '@/components/ui/button';
import { RiskBadge } from '@/components/ui/badge';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface Question {
  key: string;
  order: number;
  text: string;
}

interface ClassifyResult {
  tier: string;
  rationale: string;
  obligations: { code: string; title: string }[];
  nextSteps: string[];
}

type Phase = 'questions' | 'result' | 'converting' | 'done';

export default function AssessPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [phase, setPhase] = useState<Phase>('questions');
  const [result, setResult] = useState<ClassifyResult | null>(null);
  const [email, setEmail] = useState('');
  const [systemName, setSystemName] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${BASE}/public/assessment`)
      .then((r) => r.json())
      .then((q) => setQuestions(q.questions))
      .catch(() => setError('Could not load the assessment. Is the API running?'));
  }, []);

  async function answer(key: string, value: boolean) {
    const next = { ...answers, [key]: value };
    setAnswers(next);
    if (questions && step < questions.length - 1) {
      setStep(step + 1);
      return;
    }
    const res = await fetch(`${BASE}/public/assessment/classify`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ answers: next }),
    });
    if (!res.ok) {
      setError('Classification failed. Please try again in a minute.');
      return;
    }
    setResult(await res.json());
    setPhase('result');
  }

  async function convert(e: React.FormEvent) {
    e.preventDefault();
    setPhase('converting');
    setError(null);
    const res = await fetch(`${BASE}/public/assessment/convert`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), systemName: systemName.trim(), answers }),
    });
    if (!res.ok) {
      setError(
        res.status === 429
          ? 'Too many sign-ups from this address right now — try again in a minute.'
          : 'Could not create your workspace. Please try again.',
      );
      setPhase('result');
      return;
    }
    const data = (await res.json()) as { useCaseId: string };
    setPhase('done');
    setTimeout(() => router.push(`/inventory/${data.useCaseId}`), 900);
  }

  const progress = questions ? Math.round((step / questions.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-surface">
      <header className="flex items-center justify-between border-b border-border bg-canvas px-6 py-4">
        <div className="flex items-center gap-2.5">
          <BrandMark />
          <span className="text-lg font-semibold" style={{ fontFamily: 'var(--font-serif)' }}>
            Aegis
          </span>
        </div>
        <a href="/login" className="text-sm text-muted hover:text-ink">
          Sign in
        </a>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-14">
        {phase === 'questions' ? (
          <>
            <p className="text-xs font-medium uppercase tracking-wide text-primary">
              Free EU AI Act readiness check
            </p>
            <h1
              className="mt-2 text-3xl font-semibold leading-tight"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              Where does your AI system land under the EU AI Act?
            </h1>
            <p className="mt-2 text-sm text-muted">
              Four questions. Instant risk tier, obligations, and gaps. No account required.
            </p>

            <div className="mt-8 h-1.5 w-full overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>

            {error ? <p className="mt-6 text-sm text-carmine">{error}</p> : null}

            {!questions ? (
              <p className="mt-8 text-sm text-muted">Loading…</p>
            ) : (
              <div className="card mt-6 p-7">
                <div className="text-xs text-faint">
                  Question {step + 1} of {questions.length}
                </div>
                <p className="mt-2 text-lg font-medium leading-snug">{questions[step]!.text}</p>
                <div className="mt-6 flex gap-3">
                  <Button onClick={() => answer(questions[step]!.key, true)}>Yes</Button>
                  <Button variant="secondary" onClick={() => answer(questions[step]!.key, false)}>
                    No
                  </Button>
                  {step > 0 ? (
                    <button
                      onClick={() => setStep(step - 1)}
                      className="ml-auto text-sm text-muted hover:text-ink"
                    >
                      Back
                    </button>
                  ) : null}
                </div>
              </div>
            )}
          </>
        ) : null}

        {(phase === 'result' || phase === 'converting') && result ? (
          <>
            <p className="text-xs font-medium uppercase tracking-wide text-primary">Your result</p>
            <div className="mt-3 flex items-center gap-3">
              <h1 className="text-3xl font-semibold" style={{ fontFamily: 'var(--font-serif)' }}>
                Risk tier:
              </h1>
              <RiskBadge tier={result.tier} />
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted">{result.rationale}</p>

            {result.obligations.length > 0 ? (
              <div className="card mt-6 p-6">
                <div className="text-sm font-medium">
                  Obligations that apply ({result.obligations.length})
                </div>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {result.obligations.map((o) => (
                    <li key={o.code} className="flex items-start gap-2 text-sm">
                      <span className="mt-0.5 font-medium text-primary">{o.code}</span>
                      <span className="text-muted">{o.title}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="card mt-6 p-6 text-sm text-muted">
                No high-risk obligations apply at this tier. Keep an inventory entry so you can
                prove it.
              </div>
            )}

            <div
              className="mt-6 rounded-lg border p-6"
              style={{
                borderColor: 'color-mix(in srgb, #ccad8f 55%, transparent)',
                backgroundColor: 'color-mix(in srgb, #ccad8f 14%, transparent)',
              }}
            >
              <div className="text-sm font-medium">Turn this into audit-ready proof</div>
              <ul className="mt-2 space-y-1.5">
                {result.nextSteps.map((s) => (
                  <li key={s} className="flex items-start gap-2 text-sm text-muted">
                    <CheckCircle2 size={15} className="mt-0.5 shrink-0" style={{ color: '#8a6d4a' }} />
                    {s}
                  </li>
                ))}
              </ul>
              <form onSubmit={convert} className="mt-5 space-y-3">
                <input
                  required
                  placeholder="Name this AI system (e.g. Resume Screener)"
                  value={systemName}
                  onChange={(e) => setSystemName(e.target.value)}
                  className="focus-ring w-full rounded-md border border-border bg-canvas px-3 py-2.5 text-sm outline-none"
                />
                <div className="flex gap-2">
                  <input
                    required
                    type="email"
                    placeholder="Work email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="focus-ring w-full rounded-md border border-border bg-canvas px-3 py-2.5 text-sm outline-none"
                  />
                  <Button type="submit" disabled={phase === 'converting'}>
                    {phase === 'converting' ? 'Creating…' : 'Create workspace'}
                    <ArrowRight size={15} />
                  </Button>
                </div>
              </form>
              {error ? <p className="mt-3 text-sm text-carmine">{error}</p> : null}
              <p className="mt-3 text-xs text-faint">
                Free plan: govern up to 3 AI systems. Your answers carry over.
              </p>
            </div>
          </>
        ) : null}

        {phase === 'done' ? (
          <div className="grid place-items-center py-24 text-center">
            <CheckCircle2 size={40} style={{ color: '#3f7d58' }} />
            <h1 className="mt-4 text-2xl font-semibold" style={{ fontFamily: 'var(--font-serif)' }}>
              Workspace ready
            </h1>
            <p className="mt-1 text-sm text-muted">Taking you to your governed AI system…</p>
          </div>
        ) : null}
      </main>
    </div>
  );
}
