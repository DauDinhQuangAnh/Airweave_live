import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService) {
    const appUrl = config.get<string>('APP_URL') ?? 'http://localhost:3000';
    super({
      // Giá trị rỗng sẽ làm passport ném lỗi khi khởi tạo — dùng placeholder
      // để app vẫn chạy được khi chưa cấu hình Google; route sẽ báo 503.
      clientID: config.get<string>('GOOGLE_CLIENT_ID') || 'google-client-id-chua-cau-hinh',
      clientSecret:
        config.get<string>('GOOGLE_CLIENT_SECRET') || 'google-client-secret-chua-cau-hinh',
      callbackURL: `${appUrl}/api/auth/google/callback`,
      scope: ['email', 'profile'],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): void {
    done(null, {
      google_id: profile.id,
      email: profile.emails?.[0]?.value,
      display_name: profile.displayName,
      avatar_url: profile.photos?.[0]?.value,
    });
  }
}
