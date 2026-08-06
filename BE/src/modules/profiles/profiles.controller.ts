import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';

import { ProfilesService } from './profiles.service';
import { UpdateProfileDto } from './dto/profile.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtUser } from '../../common/decorators/current-user.decorator';

const ALLOWED_IMAGE = /^image\/(jpeg|png|webp|gif)$/;

@ApiTags('profiles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profiles: ProfilesService) {}

  @Get('me')
  @ApiOperation({ summary: 'Lấy hồ sơ của tôi' })
  me(@CurrentUser() user: JwtUser) {
    return this.profiles.findByUser(user.id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Cập nhật hồ sơ (tên, SĐT, ngày sinh, gói tài khoản...)' })
  update(@CurrentUser() user: JwtUser, @Body() dto: UpdateProfileDto) {
    return this.profiles.update(user.id, dto);
  }

  @Post('me/complete-onboarding')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đánh dấu đã hoàn tất onboarding' })
  completeOnboarding(@CurrentUser() user: JwtUser) {
    return this.profiles.completeOnboarding(user.id);
  }

  @Post('me/avatar')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Tải ảnh đại diện (thay Supabase Storage bucket avatars)' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/avatars',
        filename: (_req, file, cb) => cb(null, `${randomUUID()}${extname(file.originalname)}`),
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) =>
        ALLOWED_IMAGE.test(file.mimetype)
          ? cb(null, true)
          : cb(new Error('Chỉ chấp nhận ảnh JPEG/PNG/WEBP/GIF'), false),
    }),
  )
  uploadAvatar(@CurrentUser() user: JwtUser, @UploadedFile() file: Express.Multer.File) {
    return this.profiles.setAvatar(user.id, file);
  }

  @Delete('me')
  @ApiOperation({ summary: 'Xoá tài khoản và toàn bộ dữ liệu liên quan' })
  deleteAccount(@CurrentUser() user: JwtUser) {
    return this.profiles.deleteAccount(user.id);
  }
}
