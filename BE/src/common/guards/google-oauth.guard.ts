import { ExecutionContext, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';

/**
 * Bọc AuthGuard('google') để báo lỗi rõ ràng khi chưa cấu hình OAuth,
 * thay vì redirect sang Google rồi nhận màn hình lỗi invalid_client.
 */
@Injectable()
export class GoogleOAuthGuard extends AuthGuard('google') {
  constructor(private readonly config: ConfigService) {
    super();
  }

  canActivate(context: ExecutionContext) {
    if (!this.config.get<string>('GOOGLE_CLIENT_ID') || !this.config.get<string>('GOOGLE_CLIENT_SECRET')) {
      throw new ServiceUnavailableException(
        'Đăng nhập Google chưa khả dụng: thiếu GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET trong .env',
      );
    }
    return super.canActivate(context);
  }
}
