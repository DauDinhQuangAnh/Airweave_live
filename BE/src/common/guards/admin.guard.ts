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
 * ADMIN_EMAILS (ngăn cách bằng dấu phẩy). Từ chối truy cập nếu allowlist
 * chưa cấu hình; chế độ demo trên frontend không gọi API quản trị thật.
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
      this.logger.error('ADMIN_EMAILS chưa cấu hình — từ chối truy cập quản trị.');
      throw new ForbiddenException('Chưa cấu hình quyền quản trị');
    }

    if (!allowlist.includes(user.email.toLowerCase())) {
      throw new ForbiddenException('Bạn không có quyền quản trị');
    }
    return true;
  }
}
