import { Controller, Get, Put, Delete, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { LiveContextService } from './live-context.service';
import { UpsertLiveContextDto } from './dto/live-context.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtUser } from '../../common/decorators/current-user.decorator';

@ApiTags('live-context')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('live-context')
export class LiveContextController {
  constructor(private readonly liveContext: LiveContextService) {}

  @Get()
  @ApiOperation({ summary: 'Snapshot vị trí + không khí gần nhất (fallback khi mất GPS)' })
  get(@CurrentUser() user: JwtUser) {
    return this.liveContext.findByUser(user.id);
  }

  @Put()
  @ApiOperation({ summary: 'Đồng bộ snapshot vị trí + không khí hiện tại' })
  upsert(@CurrentUser() user: JwtUser, @Body() dto: UpsertLiveContextDto) {
    return this.liveContext.upsert(user.id, dto);
  }

  @Delete()
  @ApiOperation({ summary: 'Xoá snapshot đã lưu' })
  remove(@CurrentUser() user: JwtUser) {
    return this.liveContext.remove(user.id);
  }
}
