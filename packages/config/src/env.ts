import { z } from 'zod';

/**
 * Single source of truth for environment variables across all services.
 * Consumers call `parseEnv()` at boot and fail fast if anything required is
 * missing or malformed. Internal package: imported as TS source by the apps
 * (Next.js via transpilePackages, NestJS via its compiler).
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  // Core data stores
  DATABASE_URL: z.string().url(), // app runtime role (aegis_app), RLS enforced
  DIRECT_URL: z.string().url().optional(), // owner/superuser role for migrations + RLS setup
  REDIS_URL: z.string().url(),

  // App URLs
  WEB_URL: z.string().url().default('http://localhost:3000'),
  API_URL: z.string().url().default('http://localhost:3001'),
  AI_SERVICE_URL: z.string().url().default('http://localhost:8000'),

  // Object storage (LocalStack S3 in dev)
  S3_ENDPOINT: z.string().url().optional(),
  S3_REGION: z.string().default('eu-central-1'),
  S3_BUCKET: z.string().default('aegis-evidence'),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),

  // Security
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 chars'),

  // Auth: WorkOS (optional in dev; a dev auth provider is used until these are set)
  WORKOS_API_KEY: z.string().optional(),
  WORKOS_CLIENT_ID: z.string().optional(),

  // AI: Anthropic (required once the AI service is wired, M9)
  ANTHROPIC_API_KEY: z.string().optional(),

  // Commercial / ops (required at their components, M14/M15)
  STRIPE_SECRET_KEY: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  POSTHOG_KEY: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Parse and validate environment variables. Throws a readable error listing
 * every problem, so a misconfigured deploy fails at boot instead of at runtime.
 */
export function parseEnv(raw: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment variables:\n${issues}`);
  }
  return parsed.data;
}
