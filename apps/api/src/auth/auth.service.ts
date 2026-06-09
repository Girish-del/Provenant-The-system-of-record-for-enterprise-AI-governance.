import { Injectable } from '@nestjs/common';
import { prisma, forOrg } from '@aegis/db';
import { DevAuthProvider, createSession, type Role } from '@aegis/core';
import { env } from '../env.js';

export interface LoginResult {
  token: string;
  userId: string;
  orgId: string;
  orgName: string;
  role: Role;
}

@Injectable()
export class AuthService {
  private readonly dev = new DevAuthProvider();

  /**
   * Dev login: trusts the email (no external account). Finds or creates the user
   * and a per-user dev workspace, ensures an ADMIN membership, and issues a session.
   * Membership creation runs inside the org's RLS context via forOrg.
   */
  async devLogin(email: string): Promise<LoginResult> {
    const ident = this.dev.authenticate(email);

    const user = await prisma.user.upsert({
      where: { email: ident.email },
      create: { email: ident.email },
      update: {},
    });

    const localPart = ident.email.split('@')[0] ?? 'user';
    const slug = `dev-${localPart.replace(/[^a-z0-9]+/g, '-')}`;
    const existingOrg = await prisma.organization.findUnique({ where: { slug } });
    const org =
      existingOrg ??
      (await prisma.organization.create({ data: { name: `${ident.email} workspace`, slug } }));

    let role: Role = 'ADMIN';
    await forOrg(org.id, async (tx) => {
      const existing = await tx.membership.findFirst({ where: { userId: user.id } });
      if (existing) {
        role = existing.role as Role;
      } else {
        await tx.membership.create({ data: { orgId: org.id, userId: user.id, role: 'ADMIN' } });
      }
    });

    const token = await createSession(
      { userId: user.id, orgId: org.id, role },
      env.SESSION_SECRET,
    );
    return { token, userId: user.id, orgId: org.id, orgName: org.name, role };
  }
}
