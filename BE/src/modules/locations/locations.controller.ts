import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { LocationsService } from './locations.service';
import { UpsertLocationDto, UpdateLocationDto } from './dto/location.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtUser } from '../../common/decorators/current-user.decorator';

@ApiTags('locations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('locations')
export class LocationsController {
  constructor(private readonly locations: LocationsService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách địa điểm đã lưu (nhà / công ty / trường)' })
  findAll(@CurrentUser() user: JwtUser) {
    return this.locations.findAll(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Lưu địa điểm — ghi đè nếu đã có cùng location_type' })
  upsert(@CurrentUser() user: JwtUser, @Body() dto: UpsertLocationDto) {
    return this.locations.upsert(user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Sửa một địa điểm' })
  update(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLocationDto,
  ) {
    return this.locations.update(user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xoá một địa điểm' })
  remove(@CurrentUser() user: JwtUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.locations.remove(user.id, id);
  }
}
