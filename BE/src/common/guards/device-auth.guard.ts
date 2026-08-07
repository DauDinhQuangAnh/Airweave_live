import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';

/**
 * DeviceAuthGuard — bảo vệ các endpoint dành cho thiết bị phần cứng (ESP32):
 * nhận telemetry và tự khai báo node (autodiscover). Đây KHÔNG phải người dùng
 * nên không dùng JWT — thiết bị gửi kèm header `x-device-token`.
 *
 * Token khai báo qua biến môi trường DEVICE_INGEST_TOKEN. Nếu chưa cấu hình,
 * guard từ chối (không mở toang cổng ingest) — an toàn theo mặc định.
 */
@Injectable()
export class DeviceAuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.config.get<string>('DEVICE_INGEST_TOKEN');
    if (!expected) {
      throw new ServiceUnavailableException(
        'Chưa cấu hình DEVICE_INGEST_TOKEN — endpoint thiết bị đang bị khoá',
      );
    }

    const req = context.switchToHttp().getRequest();
    const provided =
      (req.headers['x-device-token'] as string | undefined) ??
      (req.headers['authorization'] as string | undefined)?.replace(/^Bearer\s+/i, '');

    if (!provided || !this.safeEqual(provided, expected)) {
      throw new UnauthorizedException('Device token không hợp lệ');
    }
    return true;
  }

  /** So sánh chống timing attack; độ dài lệch coi như không khớp. */
  private safeEqual(a: string, b: string): boolean {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
  }
}
