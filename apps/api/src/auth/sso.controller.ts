import {
  BadRequestException,
  Controller,
  Get,
  Query,
  Res,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { WorkOS } from '@workos-inc/node';
import { AuthService } from './auth.service.js';
import { SESSION_COOKIE } from './cookie.js';
import { env } from '../env.js';

/**
 * SSO via WorkOS AuthKit — covers Google OAuth (backlog B1) and, with the same
 * code path, Microsoft/SAML/OIDC enterprise SSO. Activates when WORKOS_API_KEY +
 * WORKOS_CLIENT_ID are set (placeholders documented in .env.example); without
 * them both endpoints return 503 and the dev email login remains the dev path.
 */
@Controller('auth/sso')
export class SsoController {
  private readonly workos: WorkOS | null;

  constructor(private readonly auth: AuthService) {
    this.workos =
      env.WORKOS_API_KEY && env.WORKOS_CLIENT_ID
        ? new WorkOS(env.WORKOS_API_KEY, { clientId: env.WORKOS_CLIENT_ID })
        : null;
  }

  private require(): WorkOS {
    if (!this.workos) {
      throw new ServiceUnavailableException(
        'SSO not configured: set WORKOS_API_KEY, WORKOS_CLIENT_ID, WORKOS_REDIRECT_URI',
      );
    }
    return this.workos;
  }

  /** Start the OAuth dance: redirect the browser to the provider via WorkOS. */
  @Get('login')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  login(@Res() res: Response, @Query('provider') provider = 'GoogleOAuth'): void {
    const workos = this.require();
    const url = workos.userManagement.getAuthorizationUrl({
      clientId: env.WORKOS_CLIENT_ID!,
      provider,
      redirectUri: env.WORKOS_REDIRECT_URI ?? `${env.API_URL}/auth/sso/callback`,
    });
    res.redirect(url);
  }

  /** Provider redirects back here; exchange the code, mint a session, go to the app. */
  @Get('callback')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async callback(@Query('code') code: string | undefined, @Res() res: Response): Promise<void> {
    const workos = this.require();
    if (!code) {
      throw new BadRequestException('missing authorization code');
    }
    const { user } = await workos.userManagement.authenticateWithCode({
      clientId: env.WORKOS_CLIENT_ID!,
      code,
    });
    // Identity is verified by the provider; workspace provisioning reuses the
    // same find-or-create flow as dev login.
    const result = await this.auth.devLogin(user.email);
    res.cookie(SESSION_COOKIE, result.token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: env.NODE_ENV === 'production',
      maxAge: 8 * 60 * 60 * 1000,
    });
    res.redirect(env.WEB_URL);
  }
}
