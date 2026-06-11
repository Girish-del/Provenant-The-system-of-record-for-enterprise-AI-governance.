// Runs before test files import anything (vitest setupFiles), so env is in
// place when @aegis/config's parseEnv evaluates at module import time.
process.env.DATABASE_URL ??= 'postgresql://aegis_app:aegis_app@localhost:5432/aegis';
process.env.DIRECT_URL ??= 'postgresql://aegis:aegis@localhost:5432/aegis';
process.env.REDIS_URL ??= 'redis://localhost:6379';
process.env.SESSION_SECRET ??= 'dev-only-insecure-change-me-0123456789abcd';
process.env.API_URL ??= 'http://localhost:3001';
process.env.WEB_URL ??= 'http://localhost:3000';
// Stripe placeholders: constructEvent/generateTestHeaderString are pure HMAC —
// no Stripe API call is made with these.
process.env.STRIPE_SECRET_KEY ??= 'sk_test_placeholder';
process.env.STRIPE_WEBHOOK_SECRET ??= 'whsec_test_placeholder';
// Point the AI proxy at a dead port to test its 503 mapping.
process.env.AI_SERVICE_URL = 'http://localhost:59999';
