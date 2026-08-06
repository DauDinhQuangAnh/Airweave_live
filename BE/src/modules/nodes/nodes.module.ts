import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { NodesService } from './nodes.service';
import { NodesController } from './nodes.controller';

@Module({
  imports: [NotificationsModule],
  controllers: [NodesController],
  providers: [NodesService],
  exports: [NodesService],
})
export class NodesModule {}

