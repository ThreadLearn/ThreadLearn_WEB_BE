import { createClient } from 'redis';
import { env } from './env';
import { logger } from './logger';

interface GlobalRedis {
  client: ReturnType<typeof createClient> | null;
}

declare global {
  var redis: GlobalRedis | undefined;
}

let cached = global.redis;

if (!cached) {
  cached = global.redis = { client: null };
}

export function getRedisClient() {
  if (cached!.client) {
    return cached!.client;
  }

  logger.info('🔌 Connecting to Redis...');
  const client = createClient({
    url: env.REDIS_URL,
  });

  client.on('error', (err) => {
    logger.error('❌ Redis client error:', err);
  });

  client.on('connect', () => {
    logger.info('✅ Successfully connected to Redis.');
  });

  // Attempt async connection
  client.connect().catch((err) => {
    logger.warn('⚠️ Redis failed to connect. Rate limiting and leaderboard will fall back to local in-memory mock modes.', err);
  });

  cached!.client = client;
  return client;
}

// Lazy getter — avoids connecting during `next build` or CI where
// Redis is unavailable.  The first runtime call to getRedisClient()
// will establish the connection.
export default getRedisClient;
