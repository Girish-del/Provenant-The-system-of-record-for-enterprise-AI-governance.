import { describe, it, expect } from 'vitest';
import { createSession, verifySession, type SessionData } from './session';

const secret = 'x'.repeat(40);
const data: SessionData = {
  userId: '11111111-1111-1111-1111-111111111111',
  orgId: '22222222-2222-2222-2222-222222222222',
  role: 'ADMIN',
};

describe('session', () => {
  it('round-trips sign -> verify', async () => {
    const token = await createSession(data, secret);
    expect(await verifySession(token, secret)).toEqual(data);
  });

  it('rejects a token signed with a different secret', async () => {
    const token = await createSession(data, secret);
    await expect(verifySession(token, 'y'.repeat(40))).rejects.toThrow();
  });

  it('rejects a tampered token', async () => {
    const token = await createSession(data, secret);
    await expect(verifySession(`${token.slice(0, -3)}abc`, secret)).rejects.toThrow();
  });

  it('rejects an expired token', async () => {
    const token = await createSession(data, secret, -10);
    await expect(verifySession(token, secret)).rejects.toThrow();
  });

  it('requires a secret of at least 32 characters', async () => {
    await expect(createSession(data, 'short')).rejects.toThrow();
  });
});
