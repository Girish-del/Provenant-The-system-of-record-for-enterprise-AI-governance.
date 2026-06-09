import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { prisma } from '@aegis/db';
import { AuthService } from './auth.service.js';
import { AuthGuard } from './auth.guard.js';
import { SESSION_COOKIE } from './cookie.js';
import { env } from '../env.js';
import type { RequestWithSession } from './session.types.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('dev/login')
  async devLogin(
    @Body() body: { email?: string },
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ userId: string; orgId: string; orgName: string; role: string }> {
    if (!body?.email) {
      throw new UnauthorizedException('email required');
    }
    const result = await this.auth.devLogin(body.email);
    res.cookie(SESSION_COOKIE, result.token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: env.NODE_ENV === 'production',
      maxAge: 8 * 60 * 60 * 1000,
    });
    return {
      userId: result.userId,
      orgId: result.orgId,
      orgName: result.orgName,
      role: result.role,
    };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response): { ok: true } {
    res.clearCookie(SESSION_COOKIE);
    return { ok: true };
  }

  @Get('me')
  @UseGuards(AuthGuard)
  async me(@Req() req: RequestWithSession): Promise<{
    userId: string;
    orgId: string;
    role: string;
    email: string | null;
  }> {
    const session = req.session!;
    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    return {
      userId: session.userId,
      orgId: session.orgId,
      role: session.role,
      email: user?.email ?? null,
    };
  }
}
