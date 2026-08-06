import { Controller, Get, Put, Delete, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { PreferencesService } from './preferences.service';
import { UpsertPreferencesDto, MarkAlertSentDto } from './dto/preferences.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtUser } from '../../common/decorators/current-user.decorator';

@ApiTags('preferences')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('preferences')
export class PreferencesController {
  constructor(private readonly preferences: PreferencesService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy tuỳ chọn cá nhân hoá (null nếu chưa onboarding)' })
  get(@CurrentUser() user: JwtUser) {
    return this.preferences.findByUser(user.id);
  }

  @Put()
  @ApiOperation({ summary: 'Tạo mới hoặc cập nhật tuỳ chọn (upsert)' })
  upsert(@CurrentUser() user: JwtUser, @Body() dto: UpsertPreferencesDto) {
    return this.preferences.upsert(user.id, dto);
  }

  @Post('mark-alert-sent')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ghi nhận vừa gửi cảnh báo AQI (chống gửi trùng)' })
  markAlertSent(@CurrentUser() user: JwtUser, @Body() dto: MarkAlertSentDto) {
    return this.preferences.markAlertSent(user.id, dto.last_alert_aqi);
  }

  @Delete()
  @ApiOperation({ summary: 'Xoá tuỳ chọn (reset onboarding)' })
  remove(@CurrentUser() user: JwtUser) {
    return this.preferences.remove(user.id);
  }
}
