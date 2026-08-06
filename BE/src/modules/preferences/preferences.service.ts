import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpsertPreferencesDto } from './dto/preferences.dto';

@Injectable()
export class PreferencesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Trả null nếu chưa có (FE dùng để biết cần chạy onboarding). */
  findByUser(userId: string) {
    return this.prisma.userPreference.findUnique({ where: { user_id: userId } });
  }

  upsert(userId: string, dto: UpsertPreferencesDto) {
    return this.prisma.userPreference.upsert({
      where: { user_id: userId },
      create: { user_id: userId, ...dto },
      update: dto,
    });
  }

  async remove(userId: string) {
    await this.prisma.userPreference.deleteMany({ where: { user_id: userId } });
    return { success: true };
  }

  /** Ghi mốc đã gửi cảnh báo để tránh spam thông báo cùng ngưỡng AQI. */
  markAlertSent(userId: string, aqi?: number) {
    return this.prisma.userPreference.update({
      where: { user_id: userId },
      data: { last_alert_aqi: aqi ?? null, last_alert_at: new Date() },
    });
  }
}
