import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  UseGuards,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';

import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, RefreshDto, ChangePasswordDto } from './dto/auth.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GoogleOAuthGuard } from '../../common/guards/google-oauth.guard';
import { CurrentUser, JwtUser } from '../../common/decorators/current-user.decorator';

function meta(req: Request) {
  return {
    user_agent: req.headers['user-agent'],
    ip_address: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip,
  };
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('register')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @ApiOperation({ summary: 'Đăng ký tài khoản bằng email + mật khẩu' })
  register(@Body() dto: RegisterDto, @Req() req: Request) {
    return this.auth.register(dto, meta(req));
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @ApiOperation({ summary: 'Đăng nhập bằng email + mật khẩu' })
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.auth.login(dto, meta(req));
  }

  @Post('demo-login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng nhập tài khoản demo (tự tạo, reset onboarding)' })
  demoLogin(@Req() req: Request) {
    return this.auth.demoLogin(meta(req));
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cấp lại access token từ refresh token (có xoay vòng token)' })
  refresh(@Body() dto: RefreshDto, @Req() req: Request) {
    return this.auth.refresh(dto.refresh_token, meta(req));
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Đăng xuất — thu hồi refresh token' })
  logout(@CurrentUser() user: JwtUser, @Body() dto?: Partial<RefreshDto>) {
    return this.auth.logout(user.id, dto?.refresh_token);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Thông tin người dùng đang đăng nhập' })
  me(@CurrentUser() user: JwtUser) {
    return this.auth.getMe(user.id);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Đổi mật khẩu (thu hồi mọi phiên hiện có)' })
  changePassword(@CurrentUser() user: JwtUser, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(user.id, dto.current_password, dto.new_password);
  }

  @Get('login-history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lịch sử đăng nhập của tài khoản' })
  loginHistory(@CurrentUser() user: JwtUser, @Query('limit') limit?: number) {
    return this.auth.getLoginHistory(user.id, limit ? Number(limit) : 20);
  }

  // ---------- Google OAuth ----------

  @Get('google')
  @UseGuards(GoogleOAuthGuard)
  @ApiOperation({ summary: 'Bắt đầu luồng đăng nhập Google (redirect tới Google)' })
  google() {
    // Guard lo phần redirect sang Google, handler này không bao giờ chạy tới.
  }

  @Get('google/callback')
  @UseGuards(GoogleOAuthGuard)
  @ApiExcludeEndpoint()
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const session = await this.auth.validateGoogleUser(req.user as any, meta(req));
    const frontend = this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:8080';
    const params = new URLSearchParams({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_in: String(session.expires_in),
    });
    // FE đọc token từ hash fragment (không lọt vào server log / referrer)
    return res.redirect(`${frontend}/auth/callback#${params.toString()}`);
  }
}
