import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { PushProcessor, PUSH_QUEUE } from './push.processor';

@Module({
  imports: [
    // Đăng ký BullMQ queue — kết nối Redis tự động qua RedisModule global.
    // Nếu Redis không có, module này sẽ bị disable gracefully.
    BullModule.registerQueue({
      name: PUSH_QUEUE,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
      },
    }),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, PushProcessor],
  exports: [NotificationsService],
})
export class NotificationsModule {}
