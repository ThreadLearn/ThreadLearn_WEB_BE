import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { getRedisClient } from '../configs/redis';
import { env } from '../configs/env';
import { logger } from '../configs/logger';
import { AppError } from '../common/custom-error';

const localStore = new Map<string, { count: number; resetTime: number }>();

export class TooManyRequestsError extends AppError {
  constructor(message = 'Too many requests. Please try again later.') {
    super(message, 429);
  }
}

export async function rateLimiter(scope: string): Promise<void> {
  const windowMs = env.RATE_LIMIT_WINDOW_MS;
  const limit = env.RATE_LIMIT_LIMIT;
  const key = `rate-limit:${scope}`;

  const redis = getRedisClient();
  if (redis.isOpen) {
    try {
      const hits = await redis.incr(key);
      if (hits === 1) {
        await redis.expire(key, Math.floor(windowMs / 1000));
      }

      if (hits > limit) {
        logger.warn(`🚫 Rate limit exceeded for ${scope} (Redis count: ${hits}/${limit})`);
        throw new TooManyRequestsError();
      }
      return;
    } catch (err) {
      if (err instanceof TooManyRequestsError) throw err;
      logger.error('⚠️ Redis rate limit counting error. Defaulting to local memory tracker.', err);
    }
  }

  const now = Date.now();
  const record = localStore.get(scope);

  if (!record || now > record.resetTime) {
    localStore.set(scope, {
      count: 1,
      resetTime: now + windowMs,
    });
    return;
  }

  record.count++;
  if (record.count > limit) {
    logger.warn(`🚫 Rate limit exceeded for ${scope} (In-Memory count: ${record.count}/${limit})`);
    throw new TooManyRequestsError();
  }
}

const extractUserIdFromAuth = (auth: string | undefined): string | undefined => {
  if (!auth?.startsWith('Bearer ')) return undefined;
  try {
    const payload = jwt.verify(auth.split(' ')[1], env.JWT_ACCESS_SECRET) as { id?: string };
    return payload.id;
  } catch {
    return undefined;
  }
};

const normalizeIp = (value: string | undefined) =>
  (value ?? '127.0.0.1').split(',')[0].trim().replace(/^::ffff:/, '');

const isLoopbackIp = (ip: string) =>
  ip === '127.0.0.1' || ip === '::1' || ip === 'localhost';

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  async use(req: Request, _res: Response, next: NextFunction) {
    const forwardedFor = req.headers['x-forwarded-for'];
    const ip = normalizeIp(
      Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor || req.ip
    );

    // Local development generates many parallel API calls during hot reloads
    // and should never lock the developer out of the application.
    if (env.NODE_ENV === 'development' && isLoopbackIp(ip)) {
      next();
      return;
    }

    const userId = extractUserIdFromAuth(req.headers.authorization as string | undefined);

    // Authenticated requests use a per-user bucket. Anonymous traffic uses the
    // client IP, so users behind the same NAT do not consume both quotas.
    await rateLimiter(userId ? `user:${userId}` : `ip:${ip}`);

    next();
  }
}
