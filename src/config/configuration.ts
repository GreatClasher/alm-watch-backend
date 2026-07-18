import { z } from 'zod';

/**
 * Zod schema for all environment variables.
 * Validated at application startup — fails fast with a clear error message on bad config.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production', 'test']),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  JWT_PRIVATE_KEY_PATH: z.string(),
  JWT_PUBLIC_KEY_PATH: z.string(),
  JWT_EXPIRES_IN: z.coerce.number().default(86400),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error']).default('info'),
});

export type AppConfig = z.infer<typeof envSchema>;

/**
 * Parsed and validated configuration singleton.
 * Import this object anywhere you need env config — never read process.env directly.
 */
export const config: AppConfig = envSchema.parse(process.env);

export { envSchema };
