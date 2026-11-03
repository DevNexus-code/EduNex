import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(5000),
  HOST: z.string().default('0.0.0.0'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  DATABASE_URL: z
    .string()
    .optional()
    .default('postgresql://nexdesk_user:nexdesk_dev_password@localhost:5432/nexdesk_dev?schema=public'),
  SESSION_SECRET: z
    .string()
    .min(16)
    .default('dev_insecure_session_secret_replace_in_production_min_32_chars'),
  COOKIE_DOMAIN: z.string().default('localhost'),
  COOKIE_SECURE: z.coerce.boolean().default(false),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_SECURE: z.coerce.boolean().optional().default(false),
  EMAIL_FROM: z.string().optional().default('EDUNEX Academic Platform <noreply@edunex.edu>'),
  APP_URL: z.string().optional().default('http://localhost:5173')
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  // Output validation errors cleanly on startup
  console.error('Invalid environment configuration:', parsedEnv.error.format());
  throw new Error('Invalid environment configuration');
}

export const config = parsedEnv.data;
