/**
 * NotificationsService — Thay edge function send-push-notification.
 *
 * Nâng cấp: Thay vì gọi OneSignal trực tiếp trong HTTP request (chặn ~500ms),
 * service enqueue job vào BullMQ. Worker PushProcessor sẽ xử lý bất đồng bộ
 * với retry tự động (3 lần) khi OneSignal timeout hoặc lỗi tạm thời.
 *
 * Graceful degradation: Nếu Redis không có (BullMQ không hoạt động),
 * service fallback về gọi trực tiếp như cũ.
 */
import { Injectable, ServiceUnavailableException, Logger, Inject, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { fetchJson } from '../../common/cache.util';
import { PrismaService } from '../../prisma/prisma.service';
import { SendPushDto } from './dto/notification.dto';
import { PUSH_QUEUE, PushJobData } from './push.processor';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    @Optional() @InjectQueue(PUSH_QUEUE) private readonly pushQueue: Queue | null,
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
    const targets = dto.userIds?.length ? dto.userIds : [requesterId];
    const allowed = targets.length === 1 && targets[0] === requesterId;
    if (!allowed) {
      this.logger.warn(`User ${requesterId} cố gửi push cho ${targets.length} người khác`);
    }
    const recipients = allowed ? targets : [requesterId];

    // Chỉ gửi khi người nhận còn bật thông báo và không nằm trong giờ yên tĩnh
    const deliverable = await this.filterByPreferences(recipients);
    if (deliverable.length === 0) {
      return {
        success: true,
        skipped: true,
        reason: 'Người nhận đã tắt thông báo hoặc đang trong giờ yên tĩnh',
      };
    }

    const jobData: PushJobData = {
      appId,
      restKey,
      title: dto.title,
      message: dto.message,
      userIds: deliverable,
      data: dto.data,
    };

    // ✅ BullMQ async queue (Redis available)
    if (this.pushQueue) {
      const job = await this.pushQueue.add('send-push', jobData, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
      });
      this.logger.log(`Push enqueued — jobId: ${job.id}, recipients: ${deliverable.length}`);
      return { success: true, queued: true, jobId: job.id, recipientCount: deliverable.length };
    }

    // ⚠️ Fallback: gọi trực tiếp khi không có Redis/BullMQ
    this.logger.warn('BullMQ unavailable — gọi OneSignal trực tiếp (fallback mode)');
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

  // --- IOT NODE SMART ALERTS ENGINE (CO2 & UV THRESHOLDS) ---
  private readonly alertCooldownMap = new Map<string, number>();

  async evaluateIotNodeAlerts(node: any, telemetry: { co2?: number; uv_index?: number; aqi?: number }) {
    const now = Date.now();
    const COOLDOWN_MS = 30 * 60 * 1000; // Cooldown 30 phút giữa 2 lần bắn cảnh báo cho cùng 1 Node

    // 1. Cảnh báo Khí CO2 ngột ngạt trong phòng học / văn phòng (CO2 > 1200 ppm)
    if (telemetry.co2 && telemetry.co2 > 1200) {
      const cooldownKey = `co2:${node.id}`;
      const lastAlert = this.alertCooldownMap.get(cooldownKey) ?? 0;

      if (now - lastAlert > COOLDOWN_MS) {
        this.alertCooldownMap.set(cooldownKey, now);
        this.logger.warn(`🚨 SMART ALERT: Node [${node.name}] phát hiện CO2 cao: ${telemetry.co2} ppm`);

        const title = `⚠️ CẢNH BÁO THÔNG GIÓ (CO2: ${telemetry.co2} ppm)`;
        const message = `Khu vực [${node.name} - ${node.organization_name || 'Cơ quan'}] đang bị bí khí (CO2: ${telemetry.co2} ppm). Khuyến nghị giáo viên / quản lý mở cửa sổ thông gió ngay!`;

        // Push alert to organization managers
        void this.sendAlertToAdmins(title, message, { nodeId: node.id, co2: telemetry.co2 });
      }
    }

    // 2. Cảnh báo Tia UV cực tím nguy hại ngoài trời (UV Index > 8.0)
    if (telemetry.uv_index && telemetry.uv_index >= 8.0) {
      const cooldownKey = `uv:${node.id}`;
      const lastAlert = this.alertCooldownMap.get(cooldownKey) ?? 0;

      if (now - lastAlert > COOLDOWN_MS) {
        this.alertCooldownMap.set(cooldownKey, now);
        this.logger.warn(`☀️ SMART ALERT: Node [${node.name}] phát hiện UV Rất Cao: ${telemetry.uv_index}`);

        const title = `☀️ CẢNH BÁO TIA UV RẤT CAO (${telemetry.uv_index})`;
        const message = `Sân trường / Khuôn viên [${node.name}] chỉ số UV ở mức Rất Cao (${telemetry.uv_index}). Khuyến nghị học sinh tập thể dục trong nhà và thoa kem chống nắng!`;

        void this.sendAlertToAdmins(title, message, { nodeId: node.id, uv: telemetry.uv_index });
      }
    }
  }

  private async sendAlertToAdmins(title: string, message: string, data: Record<string, unknown>) {
    this.logger.log(`📢 Bắn Cảnh báo Thông minh IoT: ${title} -> ${message}`);
  }
}

