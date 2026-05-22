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

export async function rateLimiter(ip: string): Promise<void> {
  const windowMs = env.RATE_LIMIT_WINDOW_MS;
  const limit = env.RATE_LIMIT_LIMIT;
  const key = `rate-limit:${ip}`;

  const redis = getRedisClient();
  if (redis.isOpen) {
    try {
      const hits = await redis.incr(key);
      if (hits === 1) {
        await redis.expire(key, Math.floor(windowMs / 1000));
      }

      if (hits > limit) {
        logger.warn(`🚫 Rate limit exceeded for IP: ${ip} (Redis count: ${hits}/${limit})`);
        throw new TooManyRequestsError();
      }
      return;
    } catch (err) {
      if (err instanceof TooManyRequestsError) throw err;
      logger.error('⚠️ Redis rate limit counting error. Defaulting to local memory tracker.', err);
    }
  }

  const now = Date.now();
  const record = localStore.get(ip);

  if (!record || now > record.resetTime) {
    localStore.set(ip, {
      count: 1,
      resetTime: now + windowMs,
    });
    return;
  }

  record.count++;
  if (record.count > limit) {
    logger.warn(`🚫 Rate limit exceeded for IP: ${ip} (In-Memory count: ${record.count}/${limit})`);
    throw new TooManyRequestsError();
  }
}
