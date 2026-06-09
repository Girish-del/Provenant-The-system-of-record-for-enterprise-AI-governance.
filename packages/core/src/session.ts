import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import type { Role } from './rbac';

/**
 * Stateless signed sessions (HS256 JWT). No external service. The same
 * SESSION_SECRET signs and verifies. Carries the user, their active org, and
 * their role in that org, so a request can set tenant context + authorize.
 */
export interface SessionData {
  userId: string;
  orgId: string;
  role: Role;
}

const ISSUER = 'aegis';
const AUDIENCE = 'aegis-web';

function key(secret: string): Uint8Array {
  if (secret.length < 32) {
    throw new Error('SESSION_SECRET must be at least 32 characters');
  }
  return new TextEncoder().encode(secret);
}

export async function createSession(
  data: SessionData,
  secret: string,
  ttlSeconds = 60 * 60 * 8,
): Promise<string> {
  return new SignJWT({ org: data.orgId, role: data.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(data.userId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + ttlSeconds)
    .sign(key(secret));
}

export async function verifySession(token: string, secret: string): Promise<SessionData> {
  const { payload } = await jwtVerify(token, key(secret), {
    issuer: ISSUER,
    audience: AUDIENCE,
  });
  const p = payload as JWTPayload & { org?: unknown; role?: unknown };
  if (typeof p.sub !== 'string' || typeof p.org !== 'string' || typeof p.role !== 'string') {
    throw new Error('malformed session payload');
  }
  return { userId: p.sub, orgId: p.org, role: p.role as Role };
}
