'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RiskBadge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import type { AssessmentResult, Questionnaire } from '@/lib/types';

export function AssessmentModal({
  useCaseId,
  onClose,
  onDone,
}: {
  useCaseId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.questionnaire().then(setQuestionnaire).catch(() => setError('Could not load questionnaire.'));
  }, []);

  async function answer(key: string, value: boolean) {
    const next = { ...answers, [key]: value };
    setAnswers(next);
    if (questionnaire && step < questionnaire.questions.length - 1) {
      setStep(step + 1);
      return;
    }
    try {
      setResult(await api.submitAssessment(useCaseId, next));
    } catch {
      setError('Assessment failed. Try again.');
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/30 p-4" onClick={onClose}>
      <div className="card w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-serif)' }}>
            EU AI Act risk assessment
          </h2>
          <button onClick={onClose} className="text-faint hover:text-ink">
            <X size={18} />
          </button>
        </div>

        {error ? <p className="mt-4 text-sm text-carmine">{error}</p> : null}

        {!result && questionnaire ? (
          <>
            <div className="mt-3 text-xs text-faint">
              Question {step + 1} of {questionnaire.questions.length} · {questionnaire.name} v
              {questionnaire.version}
            </div>
            <p className="mt-2 text-base font-medium leading-snug">
              {questionnaire.questions[step]!.text}
            </p>
            <div className="mt-5 flex gap-3">
              <Button onClick={() => answer(questionnaire.questions[step]!.key, true)}>Yes</Button>
              <Button variant="secondary" onClick={() => answer(questionnaire.questions[step]!.key, false)}>
                No
              </Button>
              {step > 0 ? (
                <button onClick={() => setStep(step - 1)} className="ml-auto text-sm text-muted hover:text-ink">
                  Back
                </button>
              ) : null}
            </div>
          </>
        ) : null}

        {result ? (
          <div className="mt-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted">Classified:</span>
              <RiskBadge tier={result.tier} />
            </div>
            <p className="mt-2 text-sm text-muted">{result.rationale}</p>
            <div className="mt-5 flex justify-end">
              <Button onClick={onDone}>Done</Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
