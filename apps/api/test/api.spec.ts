// API integration tests (backlog B4): boot the real AppModule against the live
// Postgres and exercise auth, tenancy, billing caps, Stripe webhook signatures,
// and the AI proxy's failure mapping over HTTP. Env comes from test/setup-env.ts
// (vitest setupFiles), which runs before these imports evaluate.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import Stripe from 'stripe';
import { AppModule } from '../src/app.module.js';

let app: INestApplication;
let http: ReturnType<INestApplication['getHttpServer']>;

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication({ rawBody: true });
  app.use(cookieParser());
  await app.init();
  http = app.getHttpServer();
});

afterAll(async () => {
  await app.close();
});

const EMAIL = `it-${Date.now()}@test.dev`;

async function login(): Promise<string> {
  const res = await request(http).post('/auth/dev/login').send({ email: EMAIL }).expect(201);
  const cookie = (res.headers['set-cookie'] as unknown as string[])[0]!.split(';')[0]!;
  return cookie;
}

describe('auth + tenancy over HTTP', () => {
  it('rejects unauthenticated requests', async () => {
    await request(http).get('/use-cases').expect(401);
  });

  it('logs in and returns the session identity', async () => {
    const cookie = await login();
    const me = await request(http).get('/auth/me').set('Cookie', cookie).expect(200);
    expect(me.body.email).toBe(EMAIL);
    expect(me.body.role).toBe('ADMIN');
  });
});

describe('billing cap (M14) over HTTP', () => {
  it('enforces the FREE plan cap with 402 and lifts it after upgrade', async () => {
    const cookie = await login();
    for (let i = 1; i <= 3; i++) {
      await request(http)
        .post('/use-cases')
        .set('Cookie', cookie)
        .send({ name: `Cap UC ${i}` })
        .expect(201);
    }
    await request(http).post('/use-cases').set('Cookie', cookie).send({ name: 'Over cap' }).expect(402);
    await request(http).post('/billing/dev/set-plan').set('Cookie', cookie).send({ plan: 'TEAM' }).expect(201);
    await request(http).post('/use-cases').set('Cookie', cookie).send({ name: 'After upgrade' }).expect(201);
  });
});

describe('lifecycle guard over HTTP', () => {
  it('rejects an illegal lifecycle jump with 400', async () => {
    const cookie = await login();
    const uc = await request(http)
      .post('/use-cases')
      .set('Cookie', cookie)
      .send({ name: 'Lifecycle UC' })
      .expect(201);
    await request(http)
      .post(`/use-cases/${uc.body.id}/transition`)
      .set('Cookie', cookie)
      .send({ to: 'IN_PRODUCTION' })
      .expect(400);
  });
});

describe('Stripe webhook (B8) signature verification', () => {
  const stripe = new Stripe('sk_test_placeholder');

  it('rejects a bad signature with 400', async () => {
    await request(http)
      .post('/billing/webhook')
      .set('stripe-signature', 't=1,v1=deadbeef')
      .set('content-type', 'application/json')
      .send('{"type":"checkout.session.completed"}')
      .expect(400);
  });

  it('accepts a correctly signed event and applies the plan', async () => {
    const cookie = await login();
    const me = await request(http).get('/auth/me').set('Cookie', cookie).expect(200);
    const orgId = me.body.orgId as string;

    const payload = JSON.stringify({
      id: 'evt_test_1',
      object: 'event',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_1',
          object: 'checkout.session',
          customer: 'cus_test_1',
          subscription: 'sub_test_1',
          metadata: { orgId, tier: 'BUSINESS' },
        },
      },
    });
    const signature = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: process.env.STRIPE_WEBHOOK_SECRET!,
    });
    await request(http)
      .post('/billing/webhook')
      .set('stripe-signature', signature)
      .set('content-type', 'application/json')
      .send(payload)
      .expect(201);

    const billing = await request(http).get('/billing').set('Cookie', cookie).expect(200);
    expect(billing.body.plan).toBe('BUSINESS');
    expect(billing.body.meter.limit).toBe(100);
  });
});

describe('AI proxy (B5) failure mapping', () => {
  it('maps an unreachable AI service to 503', async () => {
    const cookie = await login();
    const uc = await request(http)
      .post('/use-cases')
      .set('Cookie', cookie)
      .send({ name: 'AI UC' })
      .expect(201);
    await request(http)
      .post(`/use-cases/${uc.body.id}/ai/draft`)
      .set('Cookie', cookie)
      .send({ kind: 'fria' })
      .expect(503);
  });
});
