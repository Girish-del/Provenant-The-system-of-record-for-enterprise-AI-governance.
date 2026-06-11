import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import Stripe from 'stripe';
import { forOrg } from '@aegis/db';
import type { PlanTier } from '@aegis/core';
import { env } from '../env.js';

/**
 * Real Stripe integration, active only when STRIPE_SECRET_KEY is set (test or
 * live). Without keys the billing module falls back to its mock checkout and the
 * dev-only set-plan path. Plan state changes ONLY via the signature-verified
 * webhook — checkout success alone never mutates the database.
 */
@Injectable()
export class StripeService {
  private readonly logger = new Logger('Stripe');
  readonly client: Stripe | null;

  constructor() {
    this.client = env.STRIPE_SECRET_KEY ? new Stripe(env.STRIPE_SECRET_KEY) : null;
    this.logger.log(`stripe=${this.client ? 'on' : 'noop (mock checkout)'}`);
  }

  get enabled(): boolean {
    return this.client !== null;
  }

  private priceFor(tier: PlanTier): string {
    const price =
      tier === 'TEAM' ? env.STRIPE_PRICE_TEAM : tier === 'BUSINESS' ? env.STRIPE_PRICE_BUSINESS : null;
    if (!price) {
      throw new BadRequestException(`no Stripe price configured for tier ${tier}`);
    }
    return price;
  }

  async createCheckout(orgId: string, tier: PlanTier): Promise<{ url: string }> {
    if (!this.client) {
      throw new ServiceUnavailableException('Stripe not configured');
    }
    const session = await this.client.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: this.priceFor(tier), quantity: 1 }],
      success_url: `${env.WEB_URL}/settings?billing=success`,
      cancel_url: `${env.WEB_URL}/settings?billing=cancelled`,
      client_reference_id: orgId,
      metadata: { orgId, tier },
      subscription_data: { metadata: { orgId, tier } },
    });
    if (!session.url) {
      throw new ServiceUnavailableException('Stripe returned no checkout URL');
    }
    return { url: session.url };
  }

  /** Verify the webhook signature and apply subscription state to the org. */
  async handleWebhook(rawBody: Buffer, signature: string | undefined): Promise<{ received: true }> {
    if (!this.client || !env.STRIPE_WEBHOOK_SECRET) {
      throw new ServiceUnavailableException('Stripe webhook not configured');
    }
    if (!signature) {
      throw new BadRequestException('missing stripe-signature header');
    }
    let event: Stripe.Event;
    try {
      event = this.client.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
    } catch {
      throw new BadRequestException('invalid webhook signature');
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        await this.applyPlan(
          session.metadata?.orgId,
          session.metadata?.tier,
          'active',
          typeof session.customer === 'string' ? session.customer : null,
          typeof session.subscription === 'string' ? session.subscription : null,
        );
        break;
      }
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const status = sub.status === 'active' || sub.status === 'trialing' ? 'active' : sub.status;
        await this.applyPlan(sub.metadata?.orgId, sub.metadata?.tier, status, null, sub.id);
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        await this.applyPlan(sub.metadata?.orgId, 'FREE', null, null, null);
        break;
      }
      default:
        this.logger.log(`ignoring webhook event ${event.type}`);
    }
    return { received: true };
  }

  private async applyPlan(
    orgId: string | undefined,
    tier: string | undefined,
    status: string | null,
    customerId: string | null,
    subscriptionId: string | null,
  ): Promise<void> {
    if (!orgId || !tier) {
      this.logger.warn('webhook event missing orgId/tier metadata; skipping');
      return;
    }
    // Webhooks arrive outside any user session; authenticity comes from the
    // signature. The write runs inside the org's tenant context (forOrg) so the
    // organizations UPDATE policy (B2) admits exactly this one org and no other.
    await forOrg(orgId, (tx) =>
      tx.organization.update({
        where: { id: orgId },
        data: {
          plan: tier as PlanTier,
          subscriptionStatus: status,
          ...(customerId ? { stripeCustomerId: customerId } : {}),
          ...(subscriptionId ? { stripeSubscriptionId: subscriptionId } : {}),
        },
      }),
    );
    this.logger.log(`org ${orgId} -> plan ${tier} (${status ?? 'cleared'})`);
  }
}
