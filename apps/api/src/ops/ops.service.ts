import { Injectable, Logger, type OnApplicationShutdown } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { PostHog } from 'posthog-node';
import { Resend } from 'resend';

/**
 * Platform ops facade: error tracking (Sentry), product analytics (PostHog),
 * transactional email (Resend). Every integration is optional — when its env var
 * is absent the call is a no-op, so dev and CI run with zero external services.
 */
@Injectable()
export class OpsService implements OnApplicationShutdown {
  private readonly logger = new Logger('Ops');
  private readonly posthog: PostHog | null;
  private readonly resend: Resend | null;
  private readonly sentryEnabled: boolean;

  constructor() {
    this.sentryEnabled = Boolean(process.env.SENTRY_DSN);
    if (this.sentryEnabled) {
      Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV ?? 'development',
        tracesSampleRate: 0.1,
      });
    }
    this.posthog = process.env.POSTHOG_KEY
      ? new PostHog(process.env.POSTHOG_KEY, {
          host: process.env.POSTHOG_HOST ?? 'https://eu.posthog.com',
        })
      : null;
    this.resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

    this.logger.log(
      `sentry=${this.sentryEnabled ? 'on' : 'noop'} posthog=${this.posthog ? 'on' : 'noop'} resend=${this.resend ? 'on' : 'noop'}`,
    );
  }

  /** Report an unexpected server error. No-op without SENTRY_DSN. */
  captureError(error: unknown, context?: Record<string, unknown>): void {
    if (!this.sentryEnabled) {
      return;
    }
    Sentry.captureException(error, context ? { extra: context } : undefined);
  }

  /** Track a product event (org-scoped, no PII payloads). No-op without POSTHOG_KEY. */
  track(orgId: string, event: string, properties?: Record<string, unknown>): void {
    if (!this.posthog) {
      return;
    }
    this.posthog.capture({ distinctId: orgId, event, properties });
  }

  /** Send a transactional email. Without RESEND_API_KEY, logs instead (dev). */
  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    if (!this.resend) {
      this.logger.log(`[email noop] to=${to} subject="${subject}"`);
      return;
    }
    const from = process.env.EMAIL_FROM ?? 'Aegis <noreply@aegis.dev>';
    await this.resend.emails.send({ from, to, subject, html });
  }

  async onApplicationShutdown(): Promise<void> {
    await this.posthog?.shutdown().catch(() => undefined);
    if (this.sentryEnabled) {
      await Sentry.close(2000).catch(() => undefined);
    }
  }
}
