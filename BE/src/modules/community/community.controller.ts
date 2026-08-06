import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { CommunityService } from './community.service';
import { CreateReportDto, UpdateReportDto, QueryReportsDto } from './dto/community.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtUser } from '../../common/decorators/current-user.decorator';

@ApiTags('community-reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('community-reports')
export class CommunityController {
  constructor(private readonly community: CommunityService) {}

  @Get()
  @ApiOperation({ summary: 'Báo cáo cộng đồng còn hiệu lực (lọc theo bbox nếu có)' })
  findActive(@Query() query: QueryReportsDto) {
    return this.community.findActive(query);
  }

  @Get('mine')
  @ApiOperation({ summary: 'Báo cáo do tôi gửi' })
  findMine(@CurrentUser() user: JwtUser) {
    return this.community.findMine(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Gửi báo cáo ô nhiễm (phát realtime qua WebSocket /community)' })
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateReportDto) {
    return this.community.create(user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Sửa báo cáo của tôi' })
  update(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReportDto,
  ) {
    return this.community.update(user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Gỡ báo cáo của tôi' })
  remove(@CurrentUser() user: JwtUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.community.remove(user.id, id);
  }
}
