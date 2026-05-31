import {
  Injectable, OnModuleInit, OnModuleDestroy, Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client!: RedisClientType;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    this.client = createClient({
      url: this.config.get<string>('redis.url'),
    }) as RedisClientType;

    this.client.on('error', (err) =>
      this.logger.warn('Redis connection error', err),
    );

    try {
      await this.client.connect();
      this.logger.log('Redis connected.');
    } catch {
      this.logger.warn(
        'Redis unavailable — rate limits will use in-memory fallback.',
      );
    }
  }

  async onModuleDestroy() {
    if (this.client?.isOpen) await this.client.disconnect();
  }

  get isOpen(): boolean {
    return this.client?.isOpen ?? false;
  }

  async get(key: string): Promise<string | null> {
    if (!this.isOpen) return null;
    return this.client.get(key);
  }

  async set(key: string, value: string): Promise<void> {
    if (!this.isOpen) return;
    await this.client.set(key, value);
  }

  async setEx(key: string, ttl: number, value: string): Promise<void> {
    if (!this.isOpen) return;
    await this.client.setEx(key, ttl, value);
  }

  async incr(key: string): Promise<number> {
    if (!this.isOpen) return 0;
    return this.client.incr(key);
  }

  async expire(key: string, ttl: number): Promise<void> {
    if (!this.isOpen) return;
    await this.client.expire(key, ttl);
  }
}
