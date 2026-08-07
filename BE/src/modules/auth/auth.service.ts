import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { createHash, randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';

export interface GoogleProfilePayload {
  google_id: string;
  email: string;
  display_name?: string;
  avatar_url?: string;
}

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: 'Bearer';
  user: {
    id: string;
    email: string;
    provider: string;
    display_name: string | null;
    avatar_url: string | null;
    onboarding_completed: boolean;
  };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  // ---------- helpers ----------

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private parseDuration(value: string, fallbackMs: number): number {
    const m = /^(\d+)([smhd])$/.exec(value ?? '');
    if (!m) return fallbackMs;
    const n = Number(m[1]);
    const unit = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[m[2]];
    return n * unit;
  }

  /** Tạo profile mặc định — thay cho trigger handle_new_user() của Supabase. */
  private async ensureProfile(
    userId: string,
    email: string,
    displayName?: string,
    avatarUrl?: string,
  ) {
    const fallbackName = displayName?.trim() || email.split('@')[0];
    const existing = await this.prisma.profile.findUnique({ where: { user_id: userId } });

    if (!existing) {
      return this.prisma.profile.create({
        data: { user_id: userId, display_name: fallbackName, avatar_url: avatarUrl ?? null },
      });
    }

    // Chỉ điền vào chỗ còn trống, không ghi đè dữ liệu người dùng đã tự sửa
    // (tương đương COALESCE trong trigger handle_new_user cũ).
    const patch: { display_name?: string; avatar_url?: string } = {};
    if (!existing.display_name && fallbackName) patch.display_name = fallbackName;
    if (!existing.avatar_url && avatarUrl) patch.avatar_url = avatarUrl;
    if (Object.keys(patch).length === 0) return existing;

    return this.prisma.profile.update({ where: { user_id: userId }, data: patch });
  }

  private async issueSession(
    userId: string,
    email: string,
    meta?: { user_agent?: string; ip_address?: string },
  ): Promise<AuthSession> {
    const accessExpires = this.config.get<string>('JWT_ACCESS_EXPIRES') ?? '15m';
    const refreshExpires = this.config.get<string>('JWT_REFRESH_EXPIRES') ?? '30d';

    const access_token = await this.jwt.signAsync(
      { sub: userId, email },
      {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: accessExpires,
      },
    );

    const jti = randomUUID();
    const refresh_token = await this.jwt.signAsync(
      { sub: userId, email, jti },
      {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: refreshExpires,
      },
    );

    await this.prisma.refreshToken.create({
      data: {
        user_id: userId,
        token_hash: this.hashToken(refresh_token),
        user_agent: meta?.user_agent ?? null,
        ip_address: meta?.ip_address ?? null,
        expires_at: new Date(Date.now() + this.parseDuration(refreshExpires, 30 * 86_400_000)),
      },
    });

    // Một truy vấn duy nhất lấy cả user + profile (thay vì 2 lần findUnique tuần tự).
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });
    const profile = user?.profile;

    return {
      access_token,
      refresh_token,
      token_type: 'Bearer',
      expires_in: Math.floor(this.parseDuration(accessExpires, 900_000) / 1000),
      user: {
        id: userId,
        email,
        provider: user?.provider ?? 'email',
        display_name: profile?.display_name ?? null,
        avatar_url: profile?.avatar_url ?? null,
        onboarding_completed: profile?.onboarding_completed ?? false,
      },
    };
  }

  /** Ghi lại lần đăng nhập — thay cho FE insert thẳng vào login_history. */
  private async recordLogin(userId: string, user_agent?: string, ip_address?: string) {
    await this.prisma.$transaction([
      this.prisma.loginHistory.create({
        data: { user_id: userId, user_agent: user_agent ?? null, ip_address: ip_address ?? null },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { last_login_at: new Date() },
      }),
    ]);
  }

  // ---------- public API ----------

  async register(dto: RegisterDto, meta?: { user_agent?: string; ip_address?: string }) {
    const email = dto.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Email này đã được đăng ký');

    const user = await this.prisma.user.create({
      data: {
        email,
        password_hash: await bcrypt.hash(dto.password, 12),
        provider: 'email',
        email_verified: true, // bật luồng xác minh email tại đây nếu cần
      },
    });

    await this.ensureProfile(user.id, email, dto.display_name);
    await this.recordLogin(user.id, meta?.user_agent, meta?.ip_address);
    return this.issueSession(user.id, email, meta);
  }

  async login(dto: LoginDto, meta?: { user_agent?: string; ip_address?: string }) {
    const email = dto.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || !user.password_hash) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }
    if (!user.is_active) throw new UnauthorizedException('Tài khoản đã bị vô hiệu hóa');

    const ok = await bcrypt.compare(dto.password, user.password_hash);
    if (!ok) throw new UnauthorizedException('Email hoặc mật khẩu không đúng');

    await this.ensureProfile(user.id, email);
    await this.recordLogin(user.id, meta?.user_agent, meta?.ip_address);
    return this.issueSession(user.id, email, meta);
  }

  /** Đăng nhập/đăng ký qua Google — được GoogleStrategy gọi. */
  async validateGoogleUser(
    payload: GoogleProfilePayload,
    meta?: { user_agent?: string; ip_address?: string },
  ) {
    const email = payload.email.toLowerCase().trim();

    let user = await this.prisma.user.findFirst({
      where: { OR: [{ google_id: payload.google_id }, { email }] },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email,
          google_id: payload.google_id,
          provider: 'google',
          email_verified: true,
        },
      });
    } else if (!user.google_id) {
      // Liên kết tài khoản email sẵn có với Google
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { google_id: payload.google_id },
      });
    }

    await this.ensureProfile(user.id, email, payload.display_name, payload.avatar_url);
    await this.recordLogin(user.id, meta?.user_agent, meta?.ip_address);
    return this.issueSession(user.id, email, meta);
  }

  async refresh(refreshToken: string, meta?: { user_agent?: string; ip_address?: string }) {
    let decoded: { sub: string; email: string };
    try {
      decoded = await this.jwt.verifyAsync(refreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn');
    }

    const stored = await this.prisma.refreshToken.findUnique({
      where: { token_hash: this.hashToken(refreshToken) },
    });

    if (!stored) {
      throw new UnauthorizedException('Refresh token không hợp lệ');
    }

    // ⚠️ Phát hiện tái sử dụng (reuse detection): token này ĐÃ bị xoay vòng/thu hồi
    // nhưng lại được dùng để refresh — dấu hiệu điển hình của token bị đánh cắp.
    // Phản ứng: thu hồi TOÀN BỘ phiên còn hoạt động của user (huỷ cả token family),
    // buộc cả kẻ tấn công lẫn người dùng thật phải đăng nhập lại.
    if (stored.revoked_at) {
      this.logger.warn(
        `Phát hiện tái sử dụng refresh token của user ${stored.user_id} — thu hồi mọi phiên`,
      );
      await this.prisma.refreshToken.updateMany({
        where: { user_id: stored.user_id, revoked_at: null },
        data: { revoked_at: new Date() },
      });
      throw new UnauthorizedException(
        'Phát hiện tái sử dụng refresh token — mọi phiên đã bị thu hồi, vui lòng đăng nhập lại',
      );
    }

    if (stored.expires_at < new Date()) {
      throw new UnauthorizedException('Refresh token đã hết hạn');
    }

    // Xoay vòng token: thu hồi token hiện tại, cấp cặp mới
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revoked_at: new Date() },
    });

    return this.issueSession(decoded.sub, decoded.email, meta);
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      await this.prisma.refreshToken.updateMany({
        where: { user_id: userId, token_hash: this.hashToken(refreshToken) },
        data: { revoked_at: new Date() },
      });
    } else {
      await this.prisma.refreshToken.updateMany({
        where: { user_id: userId, revoked_at: null },
        data: { revoked_at: new Date() },
      });
    }
    return { success: true };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });
    if (!user) throw new UnauthorizedException('Không tìm thấy người dùng');

    return {
      id: user.id,
      email: user.email,
      provider: user.provider,
      email_verified: user.email_verified,
      created_at: user.created_at,
      last_login_at: user.last_login_at,
      profile: user.profile,
      // tương thích với code FE cũ đọc user.user_metadata
      user_metadata: {
        display_name: user.profile?.display_name ?? null,
        avatar_url: user.profile?.avatar_url ?? null,
      },
    };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.password_hash) {
      throw new BadRequestException(
        'Tài khoản đăng nhập bằng Google, chưa có mật khẩu để đổi',
      );
    }
    const ok = await bcrypt.compare(currentPassword, user.password_hash);
    if (!ok) throw new UnauthorizedException('Mật khẩu hiện tại không đúng');

    await this.prisma.user.update({
      where: { id: userId },
      data: { password_hash: await bcrypt.hash(newPassword, 12) },
    });
    // Thu hồi mọi phiên sau khi đổi mật khẩu
    await this.prisma.refreshToken.updateMany({
      where: { user_id: userId, revoked_at: null },
      data: { revoked_at: new Date() },
    });
    return { success: true };
  }

  /**
   * Tài khoản demo: tự tạo nếu chưa có, và reset onboarding + preferences
   * để luôn thấy lại luồng cá nhân hoá (giữ đúng hành vi bản Supabase).
   */
  async demoLogin(meta?: { user_agent?: string; ip_address?: string }) {
    const email = (this.config.get<string>('DEMO_EMAIL') ?? 'demo@airweave.vn').toLowerCase();
    const password = this.config.get<string>('DEMO_PASSWORD') ?? 'AirWeave#Demo2026!';

    let user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email,
          password_hash: await bcrypt.hash(password, 12),
          provider: 'email',
          email_verified: true,
        },
      });
      await this.ensureProfile(user.id, email, 'Nguyễn Văn A');
    }

    await this.prisma.profile.upsert({
      where: { user_id: user.id },
      create: { user_id: user.id, display_name: 'Nguyễn Văn A', onboarding_completed: false },
      update: { onboarding_completed: false },
    });
    await this.prisma.userPreference.deleteMany({ where: { user_id: user.id } });

    await this.recordLogin(user.id, meta?.user_agent, meta?.ip_address);
    return this.issueSession(user.id, email, meta);
  }

  async getLoginHistory(userId: string, limit = 20) {
    return this.prisma.loginHistory.findMany({
      where: { user_id: userId },
      orderBy: { login_at: 'desc' },
      take: Math.min(limit, 100),
    });
  }
}
