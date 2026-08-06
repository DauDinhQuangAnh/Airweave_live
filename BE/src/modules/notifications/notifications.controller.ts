import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { NotificationsService } from './notifications.service';
import { SendPushDto } from './dto/notification.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtUser } from '../../common/decorators/current-user.decorator';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Post('push')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @ApiOperation({
    summary: 'Gửi push notification (thay edge function send-push-notification)',
    description:
      'Tôn trọng notify_enabled và quiet_hours của người nhận. Người dùng chỉ gửi được cho chính mình.',
  })
  sendPush(@CurrentUser() user: JwtUser, @Body() dto: SendPushDto) {
    return this.notifications.sendPush(user.id, dto);
  }
}
