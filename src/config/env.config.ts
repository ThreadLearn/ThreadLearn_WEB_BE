import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  port:       parseInt(process.env.PORT ?? '5000', 10),
  nodeEnv:    process.env.NODE_ENV ?? 'development',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
}));

export const dbConfig = registerAs('db', () => ({
  uri: process.env.DATABASE_URL ?? '',
}));

export const jwtConfig = registerAs('jwt', () => ({
  accessSecret:    process.env.JWT_ACCESS_SECRET   ?? 'access_secret_change_me',
  refreshSecret:   process.env.JWT_REFRESH_SECRET  ?? 'refresh_secret_change_me',
  accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN  ?? '15m',
  refreshExpiresIn:process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
}));

export const redisConfig = registerAs('redis', () => ({
  url: process.env.REDIS_URL ?? 'redis://localhost:6379',
}));

export const judge0Config = registerAs('judge0', () => ({
  apiUrl:       process.env.JUDGE0_API_URL       ?? 'https://judge0-ce.p.rapidapi.com',
  rapidApiKey:  process.env.JUDGE0_RAPIDAPI_KEY  ?? '',
  rapidApiHost: process.env.JUDGE0_RAPIDAPI_HOST ?? 'judge0-ce.p.rapidapi.com',
  timeoutMs:    parseInt(process.env.JUDGE0_TIMEOUT_MS ?? '10000', 10),
}));

export const openaiConfig = registerAs('openai', () => ({
  apiKey: process.env.OPENAI_API_KEY ?? '',
}));
