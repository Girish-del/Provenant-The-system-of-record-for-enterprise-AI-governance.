import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import {
  checkoutSchema,
  setPlanSchema,
  type BillingStatusDto,
  type CheckoutInput,
  type SetPlanInput,
} from '@aegis/contracts';
import { AuthGuard } from '../auth/auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { RequireAction } from '../auth/roles.decorator.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import type { RequestWithSession } from '../auth/session.types.js';
import { BillingService } from './billing.service.js';

@Controller('billing')
@UseGuards(AuthGuard, RolesGuard)
export class BillingController {
  constructor(private readonly service: BillingService) {}

  @Get()
  @RequireAction('usecase:view')
  status(@Req() req: RequestWithSession): Promise<BillingStatusDto> {
    return this.service.status(req.session!.orgId);
  }

  @Post('checkout')
  @RequireAction('org:manage')
  checkout(
    @Req() req: RequestWithSession,
    @Body(new ZodValidationPipe(checkoutSchema)) body: CheckoutInput,
  ): { url: string; mock: boolean } {
    return this.service.checkout(req.session!.orgId, body.tier);
  }

  // Dev-only: simulates the post-checkout plan upgrade that Stripe's webhook performs
  // in production. Admin-gated; refused in production.
  @Post('dev/set-plan')
  @RequireAction('org:manage')
  setPlan(
    @Req() req: RequestWithSession,
    @Body(new ZodValidationPipe(setPlanSchema)) body: SetPlanInput,
  ): Promise<{ plan: string }> {
    return this.service.setPlan(req.session!.orgId, body.plan);
  }
}
