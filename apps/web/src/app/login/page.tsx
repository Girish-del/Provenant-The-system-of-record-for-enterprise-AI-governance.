'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BrandMark } from '@/components/shell/brand';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('founder@acme.eu');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.login(email.trim());
      router.push('/');
    } catch {
      setError('Could not sign in. Make sure the API is running on :3001.');
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div
        className="relative hidden flex-col justify-between p-12 text-white lg:flex"
        style={{ backgroundColor: '#262626' }}
      >
        <div className="flex items-center gap-2.5">
          <BrandMark />
          <span className="text-lg font-semibold" style={{ fontFamily: 'var(--font-serif)' }}>
            Aegis
          </span>
        </div>
        <div>
          <h1
            className="max-w-md text-[2.6rem] font-semibold leading-[1.1]"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            Govern every AI system before the <span style={{ color: '#ccad8f' }}>2 Aug 2026</span>{' '}
            deadline.
          </h1>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-white/70">
            The system of record for enterprise AI — discover use cases, classify risk against the EU
            AI Act, map controls, collect evidence, and export audit-ready proof.
          </p>
        </div>
        <div className="flex gap-6 text-xs text-white/45">
          <span>EU AI Act</span>
          <span>NIST AI RMF</span>
          <span>ISO/IEC 42001</span>
        </div>
      </div>

      <div className="flex items-center justify-center bg-canvas p-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <BrandMark />
            <span className="text-lg font-semibold" style={{ fontFamily: 'var(--font-serif)' }}>
              Aegis
            </span>
          </div>
          <h2 className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-serif)' }}>
            Sign in
          </h2>
          <p className="mt-1 text-sm text-muted">Access your governance workspace.</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
                Work email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="focus-ring w-full rounded-md border border-border bg-canvas px-3 py-2.5 text-sm outline-none"
                placeholder="you@company.com"
              />
            </div>
            {error ? <p className="text-sm text-carmine">{error}</p> : null}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in…' : 'Continue'}
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs text-faint">
            <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
          </div>
          <a href={api.ssoLoginUrl()} className="block">
            <Button variant="secondary" type="button" className="w-full">
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.1A6.6 6.6 0 0 1 5.49 12c0-.73.13-1.44.35-2.1V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.16-3.16A11 11 0 0 0 2.18 7.06L5.84 9.9C6.71 7.31 9.14 5.38 12 5.38z"
                />
              </svg>
              Continue with Google
            </Button>
          </a>
          <p className="mt-2 text-center text-[11px] text-faint">
            Google sign-in activates once WorkOS keys are configured.
          </p>

          <p className="mt-6 text-xs leading-relaxed text-faint">
            Dev mode: any email opens or creates a workspace. In production, sign-in is via WorkOS SSO
            (SAML/OIDC) with SCIM provisioning.
          </p>
        </div>
      </div>
    </div>
  );
}
