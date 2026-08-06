/**
 * RedisModule — Global module cung cấp IoRedis connection dùng chung.
 *
 * Graceful degradation: nếu REDIS_URL không được cấu hình hoặc Redis
 * không kết nối được, hệ thống vẫn hoạt động bình thường nhờ fallback
 * về TtlCache in-memory trong các service sử dụng.
 */
import { Global, Module, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: async (config: ConfigService): Promise<Redis | null> => {
        const logger = new Logger('RedisModule');
        const url = config.get<string>('REDIS_URL');

        if (!url) {
          logger.warn('REDIS_URL chưa được cấu hình — cache sẽ dùng in-memory (không chia sẻ giữa các instance)');
          return null;
        }

        const client = new Redis(url, {
          maxRetriesPerRequest: 3,
          enableReadyCheck: true,
          lazyConnect: true,
          connectTimeout: 5000,
          commandTimeout: 3000,
        });

        client.on('error', (err: Error) => {
          logger.error(`Redis error: ${err.message}`);
        });

        client.on('connect', () => logger.log('Redis connected'));
        client.on('ready', () => logger.log('Redis ready'));
        client.on('reconnecting', () => logger.warn('Redis reconnecting...'));

        try {
          await client.connect();
        } catch (err) {
          logger.error(`Redis connect failed: ${(err as Error).message} — fallback to in-memory cache`);
          return null;
        }

        return client;
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
