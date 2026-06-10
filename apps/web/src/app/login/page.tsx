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

          <p className="mt-6 text-xs leading-relaxed text-faint">
            Dev mode: any email opens or creates a workspace. In production, sign-in is via WorkOS SSO
            (SAML/OIDC) with SCIM provisioning.
          </p>
        </div>
      </div>
    </div>
  );
}
