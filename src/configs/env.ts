import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const optionalNonEmptyString = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().optional()
);

const optionalPositiveNumber = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.coerce.number().int().positive().optional()
);

const optionalBoolean = z.preprocess((value) => {
  if (value === undefined || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return value;
}, z.boolean().optional());

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  RATE_LIMIT_LIMIT: z.coerce.number().default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  JWT_ACCESS_SECRET: z.string().min(1, 'JWT_ACCESS_SECRET is required'),
  JWT_REFRESH_SECRET: z.string().min(1, 'JWT_REFRESH_SECRET is required'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().url().optional(),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  FRONTEND_AUTH_SUCCESS_REDIRECT_URL: z.string().url().optional(),
  FRONTEND_AUTH_FAILURE_REDIRECT_URL: z.string().url().optional(),
  SMTP_HOST: optionalNonEmptyString,
  SMTP_PORT: optionalPositiveNumber,
  SMTP_SECURE: optionalBoolean.default(false),
  SMTP_USER: optionalNonEmptyString,
  SMTP_PASS: optionalNonEmptyString,
  MAIL_FROM_NAME: z.string().default('ThreadLearn'),
  MAIL_FROM_EMAIL: z.preprocess((value) => (value === '' ? undefined : value), z.string().email().optional()),
  JUDGE0_API_URL: z.string().default('https://api.judge0.com'),
  JUDGE0_API_KEY: z.string().optional(),
  UPLOAD_DIR: z.string().default('./public/uploads'),
  MAX_FILE_SIZE_MB: z.coerce.number().default(10),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Environment validation failed:', parsed.error.format());
  throw new Error('Environment validation failed');
}

export const env = parsed.data;
