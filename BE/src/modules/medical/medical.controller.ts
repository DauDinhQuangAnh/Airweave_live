import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

import { MedicalService } from './medical.service';
import {
  CreateMedicalProfileDto,
  UpdateMedicalProfileDto,
  ConditionKeyDto,
} from './dto/medical.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtUser } from '../../common/decorators/current-user.decorator';

@ApiTags('medical')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('medical')
export class MedicalController {
  constructor(private readonly medical: MedicalService) {}

  @Get('profiles')
  @ApiOperation({ summary: 'Danh sách hồ sơ y tế (bản thân + người thân)' })
  @ApiQuery({ name: 'include', required: false, example: 'conditions' })
  findProfiles(@CurrentUser() user: JwtUser, @Query('include') include?: string) {
    return include === 'conditions'
      ? this.medical.findProfilesWithConditions(user.id)
      : this.medical.findProfiles(user.id);
  }

  @Post('profiles')
  @ApiOperation({ summary: 'Tạo hồ sơ y tế mới' })
  createProfile(@CurrentUser() user: JwtUser, @Body() dto: CreateMedicalProfileDto) {
    return this.medical.createProfile(user.id, dto);
  }

  @Patch('profiles/:id')
  @ApiOperation({ summary: 'Cập nhật hồ sơ y tế' })
  updateProfile(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMedicalProfileDto,
  ) {
    return this.medical.updateProfile(user.id, id, dto);
  }

  @Delete('profiles/:id')
  @ApiOperation({ summary: 'Xoá hồ sơ y tế (kéo theo tình trạng và SOS liên quan)' })
  removeProfile(@CurrentUser() user: JwtUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.medical.removeProfile(user.id, id);
  }

  @Get('conditions')
  @ApiOperation({ summary: 'Danh sách tình trạng y tế, lọc theo profile_id nếu cần' })
  @ApiQuery({ name: 'profile_id', required: false })
  findConditions(@CurrentUser() user: JwtUser, @Query('profile_id') profileId?: string) {
    return this.medical.findConditions(user.id, profileId);
  }

  @Post('conditions/toggle')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bật/tắt một tình trạng y tế cho hồ sơ' })
  toggleCondition(@CurrentUser() user: JwtUser, @Body() dto: ConditionKeyDto) {
    return this.medical.toggleCondition(user.id, dto);
  }

  @Put('conditions/note')
  @ApiOperation({ summary: 'Ghi chú cho một tình trạng (tự tạo nếu chưa có)' })
  setConditionNote(@CurrentUser() user: JwtUser, @Body() dto: ConditionKeyDto) {
    return this.medical.setConditionNote(user.id, dto);
  }

  @Delete('conditions/:id')
  @ApiOperation({ summary: 'Xoá một tình trạng y tế' })
  removeCondition(@CurrentUser() user: JwtUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.medical.removeCondition(user.id, id);
  }
}
