/**
 * Auth provider abstraction. The dev provider authenticates by trusting a
 * supplied email (local dev only, no external account). Real providers (WorkOS
 * AuthKit, which also gives Google login — backlog B1) implement a redirect
 * flow and resolve the callback into an AuthIdentity. Keeping this interface
 * thin lets the WorkOS adapter drop in without touching call sites.
 */
export interface AuthIdentity {
  email: string;
  name?: string;
}

export interface AuthProvider {
  readonly id: string;
}

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function normalizeEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  if (!EMAIL.test(normalized)) {
    throw new Error('invalid email');
  }
  return normalized;
}

/** Local-dev auth: trusts the provided email. NEVER enable in production. */
export class DevAuthProvider implements AuthProvider {
  readonly id = 'dev';

  authenticate(email: string): AuthIdentity {
    return { email: normalizeEmail(email) };
  }
}
