import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { verifySession } from '@aegis/core';
import { env } from '../env.js';
import { SESSION_COOKIE } from './cookie.js';
import type { RequestWithSession } from './session.types.js';

/** Requires a valid signed session cookie; attaches the session to the request. */
@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<RequestWithSession>();
    const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
    if (!token) {
      throw new UnauthorizedException('no session');
    }
    try {
      req.session = await verifySession(token, env.SESSION_SECRET);
      return true;
    } catch {
      throw new UnauthorizedException('invalid session');
    }
  }
}
