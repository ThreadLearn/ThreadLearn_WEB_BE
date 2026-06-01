import {
  Injectable, OnModuleInit, OnModuleDestroy, Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client!: RedisClientType;
  private warnedDown = false;

  constructor(private readonly config: ConfigService) {}

  /**
   * Connect to Redis in the background — never block Nest bootstrap.
   * If Redis isn't reachable, services using `isOpen` silently fall back
   * to their in-memory equivalents (rate-limit, AI cache).
   */
  onModuleInit() {
    const url = this.config.get<string>('redis.url');

    this.client = createClient({
      url,
      socket: {
        // Cap reconnect attempts so we don't spam the log forever in dev.
        reconnectStrategy: (retries) => {
          if (retries > 5) return new Error('Redis unreachable, giving up.');
          return Math.min(retries * 200, 2000);
        },
      },
    }) as RedisClientType;

    this.client.on('error', (err) => {
      if (!this.warnedDown) {
        this.warnedDown = true;
        this.logger.warn(
          `Redis unavailable (${err?.message ?? err}). Using in-memory fallback.`,
        );
      }
    });
    this.client.on('ready', () => {
      this.warnedDown = false;
      this.logger.log('Redis connected.');
    });

    // Fire-and-forget. Errors are reported via the 'error' event.
    this.client.connect().catch(() => { /* noop */ });
  }

  async onModuleDestroy() {
    if (this.client?.isOpen) {
      try { await this.client.disconnect(); } catch { /* noop */ }
    }
  }

  get isOpen(): boolean {
    return this.client?.isOpen === true && this.client?.isReady === true;
  }

  async get(key: string): Promise<string | null> {
    if (!this.isOpen) return null;
    try { return await this.client.get(key); } catch { return null; }
  }

  async set(key: string, value: string): Promise<void> {
    if (!this.isOpen) return;
    try { await this.client.set(key, value); } catch { /* noop */ }
  }

  async setEx(key: string, ttl: number, value: string): Promise<void> {
    if (!this.isOpen) return;
    try { await this.client.setEx(key, ttl, value); } catch { /* noop */ }
  }

  async incr(key: string): Promise<number> {
    if (!this.isOpen) return 0;
    try { return await this.client.incr(key); } catch { return 0; }
  }

  async expire(key: string, ttl: number): Promise<void> {
    if (!this.isOpen) return;
    try { await this.client.expire(key, ttl); } catch { /* noop */ }
  }
}
