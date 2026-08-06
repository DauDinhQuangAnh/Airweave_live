import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { AirService } from './air.service';
import { GeoPointDto, BoundsDto, HistoryQueryDto } from './dto/air.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('air')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('air')
export class AirController {
  constructor(private readonly air: AirService) {}

  @Post('waqi')
  @ApiOperation({ summary: 'Chỉ số AQI từ trạm WAQI gần nhất (thay edge function get-waqi-data)' })
  waqi(@Body() dto: GeoPointDto) {
    return this.air.waqiByPoint(dto);
  }

  @Post('waqi/bounds')
  @ApiOperation({ summary: 'Danh sách trạm WAQI trong khung nhìn bản đồ' })
  waqiBounds(@Body() dto: BoundsDto) {
    return this.air.waqiByBounds(dto);
  }

  @Get('current')
  @ApiOperation({ summary: 'Thời tiết + AQI hiện tại (WAQI ưu tiên, fallback Open-Meteo)' })
  current(@Query() dto: GeoPointDto) {
    return this.air.currentConditions(dto);
  }

  @Get('history')
  @ApiOperation({ summary: 'PM2.5 lịch sử theo ngày/giờ' })
  history(@Query() dto: HistoryQueryDto) {
    return this.air.history(dto);
  }

  @Get('ranking')
  @ApiOperation({ summary: 'Xếp hạng AQI các thành phố' })
  ranking() {
    return this.air.ranking();
  }
}
