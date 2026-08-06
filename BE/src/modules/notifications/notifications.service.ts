import { Injectable, ServiceUnavailableException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { fetchJson } from '../../common/cache.util';
import { PrismaService } from '../../prisma/prisma.service';
import { SendPushDto } from './dto/notification.dto';

/** Thay edge function send-push-notification. */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async sendPush(requesterId: string, dto: SendPushDto) {
    const appId = this.config.get<string>('ONESIGNAL_APP_ID');
    const restKey = this.config.get<string>('ONESIGNAL_REST_API_KEY');
    if (!appId || !restKey) {
      throw new ServiceUnavailableException(
        'Chưa cấu hình ONESIGNAL_APP_ID / ONESIGNAL_REST_API_KEY trong .env',
      );
    }

    // Người dùng thường chỉ được gửi cho chính mình — chặn spam người khác.
    // Muốn broadcast thì gọi từ job nội bộ với danh sách userIds đã kiểm duyệt.
    const targets = dto.userIds?.length ? dto.userIds : [requesterId];
    const allowed = targets.length === 1 && targets[0] === requesterId;
    if (!allowed) {
      this.logger.warn(`User ${requesterId} cố gửi push cho ${targets.length} người khác`);
    }
    const recipients = allowed ? targets : [requesterId];

    // Chỉ gửi khi người nhận còn bật thông báo và không nằm trong giờ yên tĩnh
    const deliverable = await this.filterByPreferences(recipients);
    if (deliverable.length === 0) {
      return { success: true, skipped: true, reason: 'Người nhận đã tắt thông báo hoặc đang trong giờ yên tĩnh' };
    }

    const result = await fetchJson<any>('https://api.onesignal.com/notifications', 10000, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${restKey}`,
      },
      body: JSON.stringify({
        app_id: appId,
        headings: { en: dto.title, vi: dto.title },
        contents: { en: dto.message, vi: dto.message },
        data: dto.data ?? {},
        include_aliases: { external_id: deliverable },
        target_channel: 'push',
      }),
    });

    return { success: true, id: result.id, recipients: result.recipients };
  }

  /** Tôn trọng notify_enabled + quiet_hours của từng người nhận. */
  private async filterByPreferences(userIds: string[]) {
    const prefs = await this.prisma.userPreference.findMany({
      where: { user_id: { in: userIds } },
      select: {
        user_id: true,
        notify_enabled: true,
        quiet_hours_start: true,
        quiet_hours_end: true,
      },
    });

    const hour = new Date().getHours();
    const prefByUser = new Map(prefs.map((p) => [p.user_id, p]));

    return userIds.filter((id) => {
      const p = prefByUser.get(id);
      if (!p) return true; // chưa onboarding thì mặc định cho nhận
      if (!p.notify_enabled) return false;

      const { quiet_hours_start: start, quiet_hours_end: end } = p;
      const inQuietHours =
        start <= end ? hour >= start && hour < end : hour >= start || hour < end;
      return !inQuietHours;
    });
  }
}
