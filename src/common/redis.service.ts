import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private redisClient: Redis;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const host = this.configService.get<string>('REDIS_HOST', '127.0.0.1');
    const port = this.configService.get<number>('REDIS_PORT', 6379);

    this.redisClient = new Redis({
      host,
      port,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      retryStrategy: (times) => {
        if (times > 3) return null; // Stop retrying after 3 attempts if Redis is down
        return Math.min(times * 200, 1000);
      },
      lazyConnect: true,
    });

    this.redisClient.on('connect', () => {
      this.logger.log(`Connected to Redis at ${host}:${port}`);
    });

    this.redisClient.on('error', (err) => {
      this.logger.warn(`Redis Connection Warning: ${err.message}`);
    });

    this.redisClient.connect().catch((err) => {
      this.logger.warn(`Could not connect to Redis: ${err.message}. Falling back gracefully.`);
    });
  }

  async onModuleDestroy() {
    if (this.redisClient) {
      await this.redisClient.quit();
    }
  }

  // --- KEY VALUE CACHING ---
  async get<T>(key: string): Promise<T | null> {
    if (!this.redisClient || this.redisClient.status !== 'ready') return null;
    try {
      const data = await this.redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds: number = 60): Promise<void> {
    if (!this.redisClient || this.redisClient.status !== 'ready') return;
    try {
      await this.redisClient.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (err) {
      this.logger.warn(`Redis set error for key ${key}: ${err.message}`);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.redisClient || this.redisClient.status !== 'ready') return;
    try {
      await this.redisClient.del(key);
    } catch {}
  }

  // --- SORTED SETS FOR LEADERBOARDS ---
  async addLeaderboardScore(gameName: string, userId: string, score: number): Promise<void> {
    if (!this.redisClient || this.redisClient.status !== 'ready') return;
    try {
      await this.redisClient.zadd(`leaderboard:${gameName}`, score, userId);
    } catch (err) {
      this.logger.warn(`Redis ZADD error for game ${gameName}: ${err.message}`);
    }
  }

  async getTopLeaderboard(gameName: string, topN: number = 10): Promise<{ userId: string; score: number }[]> {
    if (!this.redisClient || this.redisClient.status !== 'ready') return [];
    try {
      const result = await this.redisClient.zrevrange(`leaderboard:${gameName}`, 0, topN - 1, 'WITHSCORES');
      const leaderboard: { userId: string; score: number }[] = [];
      for (let i = 0; i < result.length; i += 2) {
        leaderboard.push({
          userId: result[i],
          score: parseFloat(result[i + 1]),
        });
      }
      return leaderboard;
    } catch {
      return [];
    }
  }
}
