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

const optionalStringList = z.preprocess((value) => {
  if (value === undefined || value === '') return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return value;
}, z.array(z.string()).default([]));

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MOCK_MODE: optionalBoolean.default(false),
  DATABASE_URL: z.string().optional(),
  MONGODB_USER: optionalNonEmptyString,
  MONGODB_PASSWORD: optionalNonEmptyString,
  MONGODB_HOST: optionalNonEmptyString,
  MONGODB_DATABASE: optionalNonEmptyString,
  DNS_SERVERS: optionalStringList,
  REDIS_URL: z.string().default('redis://localhost:6379'),
  RATE_LIMIT_LIMIT: z.coerce.number().default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  JWT_ACCESS_SECRET: z.string().min(1, 'JWT_ACCESS_SECRET is required'),
  JWT_REFRESH_SECRET: z.string().min(1, 'JWT_REFRESH_SECRET is required'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('30m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().url().optional(),
  FRONTEND_URL: z.string()
      .default('http://localhost:3001')
      .transform((v) => v.split(',').map((s) => s.trim()).filter(Boolean))
      .pipe(z.array(z.string().url()).min(1)),
  FRONTEND_AUTH_SUCCESS_REDIRECT_URL: z.string().url().optional(),
  FRONTEND_AUTH_FAILURE_REDIRECT_URL: z.string().url().optional(),
  SMTP_HOST: optionalNonEmptyString,
  SMTP_PORT: optionalPositiveNumber,
  SMTP_SECURE: optionalBoolean.default(false),
  SMTP_USER: optionalNonEmptyString,
  SMTP_PASS: optionalNonEmptyString,
  MAIL_FROM_NAME: z.string().default('ThreadLearn'),
  MAIL_FROM_EMAIL: z.preprocess((value) => (value === '' ? undefined : value), z.string().email().optional()),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  JUDGE0_API_URL: z.string().default('https://api.judge0.com'),
  JUDGE0_API_KEY: z.string().optional(),
  AI_API_URL: z.string().default('http://localhost:8001'),
  AI_API_TIMEOUT_MS: z.coerce.number().default(30000),
  UPLOAD_DIR: z.string().default('./public/uploads'),
  MAX_FILE_SIZE_MB: z.coerce.number().default(10),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Environment validation failed:', parsed.error.format());
  throw new Error('Environment validation failed');
}

const buildMongoUrl = () => {
  const { MONGODB_USER, MONGODB_PASSWORD, MONGODB_HOST, MONGODB_DATABASE } = parsed.data;
  if (!MONGODB_USER || !MONGODB_PASSWORD || !MONGODB_HOST || !MONGODB_DATABASE) {
    return undefined;
  }

  const user = encodeURIComponent(MONGODB_USER);
  const password = encodeURIComponent(MONGODB_PASSWORD);
  return `mongodb+srv://${user}:${password}@${MONGODB_HOST}/${MONGODB_DATABASE}?retryWrites=true&w=majority`;
};

const databaseUrl = buildMongoUrl() ?? parsed.data.DATABASE_URL;

if (!databaseUrl) {
  console.error('Environment validation failed: DATABASE_URL or full MONGODB_* config is required');
  throw new Error('Environment validation failed');
}

export const env = {
  ...parsed.data,
  DATABASE_URL: databaseUrl,
};
