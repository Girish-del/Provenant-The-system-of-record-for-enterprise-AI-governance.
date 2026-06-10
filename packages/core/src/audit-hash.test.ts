import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import {
  computeEntryHash,
  verifyAuditChain,
  stableStringify,
  type AuditEntryContent,
  type ChainEntry,
} from './audit-hash';

const sha256 = (input: string): string => createHash('sha256').update(input).digest('hex');

function entry(seq: number): AuditEntryContent {
  return {
    orgId: 'org-1',
    actorId: 'user-1',
    action: `action.${seq}`,
    targetType: 'UseCase',
    targetId: `uc-${seq}`,
    before: null,
    after: { n: seq },
    occurredAt: `2026-06-09T00:00:0${seq}.000Z`,
  };
}

function buildChain(n: number): ChainEntry[] {
  const out: ChainEntry[] = [];
  let prev: string | null = null;
  for (let i = 0; i < n; i++) {
    const content = entry(i);
    const entryHash = computeEntryHash(prev, content, sha256);
    out.push({ ...content, prevHash: prev, entryHash });
    prev = entryHash;
  }
  return out;
}

describe('audit hash chain', () => {
  it('stableStringify is key-order independent', () => {
    expect(stableStringify({ b: 1, a: 2 })).toBe(stableStringify({ a: 2, b: 1 }));
    expect(stableStringify({ a: { y: 1, x: 2 } })).toBe('{"a":{"x":2,"y":1}}');
  });

  it('verifies a well-formed chain', () => {
    const chain = buildChain(5);
    expect(verifyAuditChain(chain, sha256)).toEqual({ valid: true, count: 5 });
  });

  it('detects a tampered entry payload', () => {
    const chain = buildChain(5);
    chain[2] = { ...chain[2]!, after: { n: 999 } }; // mutate content, keep old hashes
    const result = verifyAuditChain(chain, sha256);
    expect(result.valid).toBe(false);
    expect(result.brokenAt).toBe(2);
  });

  it('detects a deleted entry (broken prevHash link)', () => {
    const chain = buildChain(5);
    chain.splice(2, 1); // remove an entry; entry-3 now points at a missing prev
    const result = verifyAuditChain(chain, sha256);
    expect(result.valid).toBe(false);
    expect(result.brokenAt).toBe(2);
  });

  it('detects a reordered chain', () => {
    const chain = buildChain(5);
    [chain[1], chain[2]] = [chain[2]!, chain[1]!];
    expect(verifyAuditChain(chain, sha256).valid).toBe(false);
  });
});
