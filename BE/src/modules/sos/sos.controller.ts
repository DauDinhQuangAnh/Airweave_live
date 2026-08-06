import { Controller, Get, Post, Delete, Body, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { SosService } from './sos.service';
import { CreateSosEventDto } from './dto/sos.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtUser } from '../../common/decorators/current-user.decorator';

@ApiTags('sos')
@Controller('sos')
export class SosController {
  constructor(private readonly sos: SosService) {}

  @Post('events')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Kích hoạt SOS — tạo link chia sẻ Medical ID có hạn' })
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateSosEventDto) {
    return this.sos.create(user.id, dto);
  }

  @Get('events')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lịch sử các lần kích hoạt SOS' })
  findAll(@CurrentUser() user: JwtUser) {
    return this.sos.findAll(user.id);
  }

  @Delete('events/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Thu hồi một sự kiện SOS (vô hiệu link chia sẻ)' })
  remove(@CurrentUser() user: JwtUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.sos.remove(user.id, id);
  }

  @Get('share/:token')
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @ApiOperation({
    summary: 'CÔNG KHAI — xem Medical ID qua token QR (thay edge function medical-qr)',
  })
  findByToken(@Param('token') token: string) {
    return this.sos.findByShareToken(token);
  }
}
