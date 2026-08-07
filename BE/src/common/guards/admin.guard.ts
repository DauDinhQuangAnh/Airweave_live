import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { JwtUser } from '../decorators/current-user.decorator';

/**
 * AdminGuard — chặn các endpoint quản trị (admin dashboard, tạo tổ chức/node...).
 *
 * Phải đặt SAU JwtAuthGuard để `req.user` đã có sẵn:
 *   @UseGuards(JwtAuthGuard, AdminGuard)
 *
 * Cơ chế phân quyền tối giản dựa trên danh sách email trong biến môi trường
 * ADMIN_EMAILS (ngăn cách bằng dấu phẩy). Nếu chưa cấu hình thì cho phép mọi
 * người dùng đã đăng nhập (giữ đúng triết lý graceful degradation, chạy được
 * ngay khi dev) nhưng ghi log cảnh báo để nhắc siết lại trước khi lên production.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  private readonly logger = new Logger(AdminGuard.name);

  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest().user as JwtUser | undefined;
    if (!user) throw new UnauthorizedException('Yêu cầu đăng nhập');

    const allowlist = (this.config.get<string>('ADMIN_EMAILS') ?? '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    if (allowlist.length === 0) {
      this.logger.warn(
        `ADMIN_EMAILS chưa cấu hình — mọi tài khoản đăng nhập đang được coi là admin. ` +
          `Hãy đặt ADMIN_EMAILS trước khi lên production.`,
      );
      return true;
    }

    if (!allowlist.includes(user.email.toLowerCase())) {
      throw new ForbiddenException('Bạn không có quyền quản trị');
    }
    return true;
  }
}
