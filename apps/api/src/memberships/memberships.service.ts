import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { forOrg, prisma } from '@aegis/db';
import type { Role } from '@aegis/core';
import { audit } from '../common/audit.js';
import { OpsService } from '../ops/ops.service.js';
import { env } from '../env.js';

export interface MemberDto {
  id: string;
  role: string;
  createdAt: string;
  user: { id: string; email: string };
}

@Injectable()
export class MembershipsService {
  constructor(private readonly ops: OpsService) {}

  list(orgId: string): Promise<MemberDto[]> {
    return forOrg(orgId, async (tx) => {
      const members = await tx.membership.findMany({
        include: { user: { select: { id: true, email: true } } },
        orderBy: { createdAt: 'asc' },
      });
      return members.map((m) => ({
        id: m.id,
        role: m.role,
        createdAt: m.createdAt.toISOString(),
        user: m.user,
      }));
    });
  }

  async invite(orgId: string, actorId: string, email: string, role: Role): Promise<MemberDto> {
    // User identities are global; create-or-find outside tenant context.
    const user = await prisma.user.upsert({ where: { email }, create: { email }, update: {} });
    const member = await forOrg(orgId, async (tx) => {
      const existing = await tx.membership.findFirst({ where: { userId: user.id } });
      if (existing) {
        throw new BadRequestException('user is already a member of this workspace');
      }
      const created = await tx.membership.create({
        data: { orgId, userId: user.id, role },
        include: { user: { select: { id: true, email: true } } },
      });
      await audit(tx, {
        orgId,
        actorId,
        action: 'member.invite',
        targetType: 'Membership',
        targetId: created.id,
        after: { email, role },
      });
      return created;
    });
    await this.ops.sendEmail(
      email,
      'You have been invited to a Provenant governance workspace',
      `<p>You were invited as <strong>${role}</strong>. Sign in at <a href="${env.WEB_URL}/login">${env.WEB_URL}/login</a> with this email address.</p>`,
    );
    return {
      id: member.id,
      role: member.role,
      createdAt: member.createdAt.toISOString(),
      user: member.user,
    };
  }

  changeRole(orgId: string, actorId: string, membershipId: string, role: Role): Promise<MemberDto> {
    return forOrg(orgId, async (tx) => {
      const member = await tx.membership.findUnique({
        where: { id: membershipId },
        include: { user: { select: { id: true, email: true } } },
      });
      if (!member) {
        throw new NotFoundException('member not found');
      }
      if (member.role === 'ADMIN' && role !== 'ADMIN') {
        const admins = await tx.membership.count({ where: { role: 'ADMIN' } });
        if (admins <= 1) {
          throw new BadRequestException('cannot demote the last admin');
        }
      }
      const updated = await tx.membership.update({
        where: { id: membershipId },
        data: { role },
        include: { user: { select: { id: true, email: true } } },
      });
      await audit(tx, {
        orgId,
        actorId,
        action: 'member.role_change',
        targetType: 'Membership',
        targetId: membershipId,
        before: { role: member.role },
        after: { role },
      });
      return {
        id: updated.id,
        role: updated.role,
        createdAt: updated.createdAt.toISOString(),
        user: updated.user,
      };
    });
  }

  remove(orgId: string, actorId: string, membershipId: string): Promise<{ removed: true }> {
    return forOrg(orgId, async (tx) => {
      const member = await tx.membership.findUnique({ where: { id: membershipId } });
      if (!member) {
        throw new NotFoundException('member not found');
      }
      if (member.role === 'ADMIN') {
        const admins = await tx.membership.count({ where: { role: 'ADMIN' } });
        if (admins <= 1) {
          throw new BadRequestException('cannot remove the last admin');
        }
      }
      await tx.membership.delete({ where: { id: membershipId } });
      await audit(tx, {
        orgId,
        actorId,
        action: 'member.remove',
        targetType: 'Membership',
        targetId: membershipId,
        before: { userId: member.userId, role: member.role },
      });
      return { removed: true } as const;
    });
  }
}
