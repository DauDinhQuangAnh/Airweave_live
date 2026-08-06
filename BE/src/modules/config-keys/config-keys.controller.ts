import { Controller, Get, UseGuards, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

/**
 * Cấp key của bên thứ ba cho FE (thay edge function get-windy-key).
 * Yêu cầu đăng nhập để key không bị lộ ra public.
 */
@ApiTags('config')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('config')
export class ConfigKeysController {
  constructor(private readonly config: ConfigService) {}

  @Get('windy-key')
  @ApiOperation({ summary: 'Lấy Windy API key để render bản đồ gió' })
  windyKey() {
    const key = this.config.get<string>('WINDY_API_KEY');
    if (!key) throw new ServiceUnavailableException('Chưa cấu hình WINDY_API_KEY trong .env');
    return { key };
  }

  @Get('mapbox-token')
  @ApiOperation({ summary: 'Lấy Mapbox token cho tìm kiếm địa điểm và chỉ đường' })
  mapboxToken() {
    const token = this.config.get<string>('MAPBOX_TOKEN');
    if (!token) throw new ServiceUnavailableException('Chưa cấu hình MAPBOX_TOKEN trong .env');
    return { token };
  }

  @Get('onesignal')
  @ApiOperation({ summary: 'Lấy OneSignal App ID để FE khởi tạo web push' })
  onesignal() {
    return { appId: this.config.get<string>('ONESIGNAL_APP_ID') ?? null };
  }
}
