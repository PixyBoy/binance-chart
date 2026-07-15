import { z } from 'zod';

/**
 * Single source of truth for every environment variable the app needs.
 * If a required value is missing or malformed, the app refuses to start
 * instead of failing later with a confusing runtime error.
 */
export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  APP_PORT: z.coerce.number().int().positive().default(3000),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  REDIS_HOST: z.string().min(1),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  REDIS_PASSWORD: z.string().optional().default(''),

  BINANCE_API_KEY: z.string().optional().default(''),
  BINANCE_API_SECRET: z.string().optional().default(''),
  BINANCE_WS_BASE_URL: z.string().url(),
  BINANCE_REST_BASE_URL: z.string().url(),
});

export type EnvConfig = z.infer<typeof envSchema>;

/**
 * Passed as `validate` to ConfigModule.forRoot(). Throws on startup if the
 * environment is invalid, with a readable list of what's wrong.
 */
export function validateEnv(rawConfig: Record<string, unknown>): EnvConfig {
  const result = envSchema.safeParse(rawConfig);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  return result.data;
}
