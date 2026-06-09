import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { can, type Action } from '@aegis/core';
import { REQUIRE_ACTION } from './roles.decorator.js';
import type { RequestWithSession } from './session.types.js';

/** Deny-by-default RBAC: a route's RequireAction must be granted to the session role. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const action = this.reflector.getAllAndOverride<Action | undefined>(REQUIRE_ACTION, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!action) {
      return true;
    }
    const req = ctx.switchToHttp().getRequest<RequestWithSession>();
    if (!req.session) {
      throw new ForbiddenException('no session');
    }
    if (!can(req.session.role, action)) {
      throw new ForbiddenException(`role ${req.session.role} may not ${action}`);
    }
    return true;
  }
}
