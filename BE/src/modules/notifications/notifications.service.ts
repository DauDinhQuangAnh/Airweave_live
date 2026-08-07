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
import type Redis from 'ioredis';
import { fetchJson } from '../../common/cache.util';
import { PrismaService } from '../../prisma/prisma.service';
import { REDIS_CLIENT } from '../../common/redis.module';
import { SendPushDto } from './dto/notification.dto';
import { PUSH_QUEUE, PushJobData } from './push.processor';

interface OneSignalCreds {
  appId: string;
  restKey: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  /** Fallback cooldown khi không có Redis (chỉ đúng trong 1 instance). */
  private readonly localCooldown = new Map<string, number>();

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    @Optional() @InjectQueue(PUSH_QUEUE) private readonly pushQueue: Queue | null,
    @Optional() @Inject(REDIS_CLIENT) private readonly redis: Redis | null,
  ) {}

  private getOneSignalCreds(): OneSignalCreds | null {
    const appId = this.config.get<string>('ONESIGNAL_APP_ID');
    const restKey = this.config.get<string>('ONESIGNAL_REST_API_KEY');
    return appId && restKey ? { appId, restKey } : null;
  }

  async sendPush(requesterId: string, dto: SendPushDto) {
    const creds = this.getOneSignalCreds();
    if (!creds) {
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

    const deliverable = await this.filterByPreferences(recipients);
    if (deliverable.length === 0) {
      return {
        success: true,
        skipped: true,
        reason: 'Người nhận đã tắt thông báo hoặc đang trong giờ yên tĩnh',
      };
    }

    return this.dispatch(creds, deliverable, dto.title, dto.message, dto.data);
  }

  /** Gửi/enqueue thực tế tới OneSignal — dùng chung cho push người dùng & cảnh báo hệ thống. */
  private async dispatch(
    creds: OneSignalCreds,
    recipients: string[],
    title: string,
    message: string,
    data?: Record<string, unknown>,
  ) {
    const jobData: PushJobData = {
      appId: creds.appId,
      restKey: creds.restKey,
      title,
      message,
      userIds: recipients,
      data,
    };

    // ✅ BullMQ async queue (Redis available)
    if (this.pushQueue) {
      const job = await this.pushQueue.add('send-push', jobData, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
      });
      this.logger.log(`Push enqueued — jobId: ${job.id}, recipients: ${recipients.length}`);
      return { success: true, queued: true, jobId: job.id, recipientCount: recipients.length };
    }

    // ⚠️ Fallback: gọi trực tiếp khi không có Redis/BullMQ
    this.logger.warn('BullMQ unavailable — gọi OneSignal trực tiếp (fallback mode)');
    const result = await fetchJson<any>('https://api.onesignal.com/notifications', 10000, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Basic ${creds.restKey}` },
      body: JSON.stringify({
        app_id: creds.appId,
        headings: { en: title, vi: title },
        contents: { en: message, vi: message },
        data: data ?? {},
        include_aliases: { external_id: recipients },
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

  private static readonly COOLDOWN_MS = 30 * 60 * 1000; // 30 phút giữa 2 cảnh báo cùng loại/node

  async evaluateIotNodeAlerts(
    node: { id: string; name: string; organization_id: string | null; organization_name: string | null },
    telemetry: { co2?: number; uv_index?: number; aqi?: number },
  ) {
    // 1. Cảnh báo CO2 ngột ngạt (> 1200 ppm) trong phòng học / văn phòng
    if (telemetry.co2 && telemetry.co2 > 1200 && (await this.acquireAlertSlot(`co2:${node.id}`))) {
      const title = `⚠️ CẢNH BÁO THÔNG GIÓ (CO2: ${telemetry.co2} ppm)`;
      const message = `Khu vực [${node.name} - ${node.organization_name || 'Cơ quan'}] đang bị bí khí (CO2: ${telemetry.co2} ppm). Khuyến nghị mở cửa sổ thông gió ngay!`;
      await this.sendAlertToManagers(node.organization_id, title, message, { nodeId: node.id, co2: telemetry.co2 });
    }

    // 2. Cảnh báo tia UV rất cao (>= 8.0) ngoài trời
    if (telemetry.uv_index && telemetry.uv_index >= 8.0 && (await this.acquireAlertSlot(`uv:${node.id}`))) {
      const title = `☀️ CẢNH BÁO TIA UV RẤT CAO (${telemetry.uv_index})`;
      const message = `Sân trường / Khuôn viên [${node.name}] chỉ số UV ở mức Rất Cao (${telemetry.uv_index}). Khuyến nghị vào trong nhà và thoa kem chống nắng!`;
      await this.sendAlertToManagers(node.organization_id, title, message, { nodeId: node.id, uv: telemetry.uv_index });
    }
  }

  /** Gửi cảnh báo tới quản lý tổ chức của node (+ global admin theo ADMIN_EMAILS). */
  private async sendAlertToManagers(
    orgId: string | null,
    title: string,
    message: string,
    data: Record<string, unknown>,
  ) {
    const creds = this.getOneSignalCreds();
    if (!creds) {
      this.logger.warn(`Bỏ qua cảnh báo "${title}" — chưa cấu hình OneSignal`);
      return;
    }

    const recipients = await this.resolveAlertRecipients(orgId);
    if (recipients.length === 0) {
      this.logger.warn(`Không có người nhận cho cảnh báo "${title}" (org ${orgId ?? 'none'})`);
      return;
    }

    const deliverable = await this.filterByPreferences(recipients);
    if (deliverable.length === 0) return;

    try {
      await this.dispatch(creds, deliverable, title, message, data);
      this.logger.log(`📢 Đã gửi cảnh báo IoT "${title}" tới ${deliverable.length} người`);
    } catch (err) {
      this.logger.error(`Gửi cảnh báo IoT thất bại: ${(err as Error).message}`);
    }
  }

  /** Quản lý (admin/manager) của tổ chức + danh sách ADMIN_EMAILS toàn hệ thống. */
  private async resolveAlertRecipients(orgId: string | null): Promise<string[]> {
    const ids = new Set<string>();

    if (orgId) {
      const managers = await this.prisma.organizationUser.findMany({
        where: { organization_id: orgId, role: { in: ['admin', 'manager'] } },
        select: { user_id: true },
      });
      managers.forEach((m) => ids.add(m.user_id));
    }

    const adminEmails = (this.config.get<string>('ADMIN_EMAILS') ?? '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    if (adminEmails.length > 0) {
      const admins = await this.prisma.user.findMany({
        where: { email: { in: adminEmails } },
        select: { id: true },
      });
      admins.forEach((a) => ids.add(a.id));
    }

    return [...ids];
  }

  /**
   * Trả về true nếu được phép bắn cảnh báo (chưa trong cooldown) và đồng thời
   * đặt cooldown. Dùng Redis (đúng trên nhiều instance), fallback in-memory.
   */
  private async acquireAlertSlot(key: string): Promise<boolean> {
    const fullKey = `airweave:alert:${key}`;
    const ttl = NotificationsService.COOLDOWN_MS;

    if (this.redis) {
      try {
        const got = await this.redis.set(fullKey, '1', 'PX', ttl, 'NX');
        return got === 'OK';
      } catch {
        // rơi xuống fallback in-memory
      }
    }

    const now = Date.now();
    const last = this.localCooldown.get(fullKey) ?? 0;
    if (now - last < ttl) return false;
    this.localCooldown.set(fullKey, now);
    return true;
  }
}
