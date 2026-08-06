import { Module } from '@nestjs/common';
import { LiveContextService } from './live-context.service';
import { LiveContextController } from './live-context.controller';

@Module({
  controllers: [LiveContextController],
  providers: [LiveContextService],
  exports: [LiveContextService],
})
export class LiveContextModule {}
