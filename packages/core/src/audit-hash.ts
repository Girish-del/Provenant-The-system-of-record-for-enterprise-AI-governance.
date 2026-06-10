/**
 * Tamper-evident audit hashing. Each entry's hash covers the previous entry's
 * hash plus a canonical serialization of the entry, forming a chain: altering
 * any historical entry breaks every hash after it.
 *
 * Pure and environment-agnostic: the caller injects the hash function (the API
 * uses node:crypto sha256), so this stays importable from any runtime.
 */

export interface AuditEntryContent {
  orgId: string;
  actorId: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  before: unknown;
  after: unknown;
  occurredAt: string; // ISO 8601
}

export type HashFn = (input: string) => string;

/** Deterministic JSON: object keys sorted recursively, so jsonb round-trips
 *  (which do not preserve key order) still produce an identical string. */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value) ?? 'null';
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`;
}

export function canonicalize(entry: AuditEntryContent): string {
  return stableStringify({
    orgId: entry.orgId,
    actorId: entry.actorId ?? null,
    action: entry.action,
    targetType: entry.targetType,
    targetId: entry.targetId ?? null,
    before: entry.before ?? null,
    after: entry.after ?? null,
    occurredAt: entry.occurredAt,
  });
}

export function computeEntryHash(
  prevHash: string | null,
  entry: AuditEntryContent,
  hash: HashFn,
): string {
  return hash(`${prevHash ?? ''}\n${canonicalize(entry)}`);
}

export interface ChainEntry extends AuditEntryContent {
  prevHash: string | null;
  entryHash: string | null;
}

export interface ChainVerification {
  valid: boolean;
  count: number;
  brokenAt?: number; // index of the first entry whose hash does not verify
}

/** Recompute the chain over entries (in seq order) and report the first break. */
export function verifyAuditChain(entries: ChainEntry[], hash: HashFn): ChainVerification {
  let prev: string | null = null;
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]!;
    if (entry.prevHash !== prev) {
      return { valid: false, count: entries.length, brokenAt: i };
    }
    const expected = computeEntryHash(prev, entry, hash);
    if (entry.entryHash !== expected) {
      return { valid: false, count: entries.length, brokenAt: i };
    }
    prev = entry.entryHash;
  }
  return { valid: true, count: entries.length };
}
