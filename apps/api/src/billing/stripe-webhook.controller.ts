import {
  BadRequestException,
  Controller,
  Headers,
  Post,
  Req,
  type RawBodyRequest,
} from '@nestjs/common';
import type { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { StripeService } from './stripe.service.js';

/**
 * Stripe webhook receiver. Deliberately unauthenticated (Stripe cannot log in);
 * authenticity comes from the signature check against STRIPE_WEBHOOK_SECRET,
 * which is the only way plan state ever changes outside dev.
 */
@Controller('billing/webhook')
export class StripeWebhookController {
  constructor(private readonly stripe: StripeService) {}

  @Post()
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  handle(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string | undefined,
  ): Promise<{ received: true }> {
    if (!req.rawBody) {
      throw new BadRequestException('raw body unavailable');
    }
    return this.stripe.handleWebhook(req.rawBody, signature);
  }
}
