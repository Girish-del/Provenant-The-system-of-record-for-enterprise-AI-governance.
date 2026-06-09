import { PrismaClient, type Prisma } from '@prisma/client';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Shared Prisma client. Connects as the non-superuser app role, so RLS applies. */
export const prisma = new PrismaClient();

/** A transaction-scoped client with the tenant context set. */
export type TenantClient = Prisma.TransactionClient;

/**
 * Run `fn` with the Postgres tenant context set, so Row-Level Security scopes
 * every query to `orgId`. Implemented as an interactive transaction + `SET LOCAL`:
 * the setting is bound to the transaction and never leaks across pooled
 * connections. Always use this for tenant-scoped data access.
 */
export async function forOrg<T>(
  orgId: string,
  fn: (tx: TenantClient) => Promise<T>,
): Promise<T> {
  if (!UUID.test(orgId)) {
    throw new Error('forOrg: orgId must be a valid UUID');
  }
  return prisma.$transaction(async (tx) => {
    // orgId is UUID-validated above; SET does not accept bind params, so we
    // interpolate the validated value.
    await tx.$executeRawUnsafe(`SET LOCAL app.current_org = '${orgId}'`);
    return fn(tx);
  });
}
