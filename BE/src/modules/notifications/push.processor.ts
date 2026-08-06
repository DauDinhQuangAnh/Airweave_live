/**
 * Push Notification Processor — chạy bất đồng bộ trong BullMQ worker.
 * Thay vì block HTTP request chờ OneSignal phản hồi (~200-500ms),
 * job được enqueue ngay và xử lý trong background.
 */
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { fetchJson } from '../../common/cache.util';

export const PUSH_QUEUE = 'push-notifications';

export interface PushJobData {
  appId: string;
  restKey: string;
  title: string;
  message: string;
  userIds: string[];
  data?: Record<string, unknown>;
}

@Processor(PUSH_QUEUE)
export class PushProcessor extends WorkerHost {
  private readonly logger = new Logger(PushProcessor.name);

  async process(job: Job<PushJobData>): Promise<{ id?: string; recipients?: number }> {
    const { appId, restKey, title, message, userIds, data } = job.data;

    this.logger.log(`Gửi push notification cho ${userIds.length} người — job ${job.id}`);

    try {
      const result = await fetchJson<any>('https://api.onesignal.com/notifications', 12000, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${restKey}`,
        },
        body: JSON.stringify({
          app_id: appId,
          headings: { en: title, vi: title },
          contents: { en: message, vi: message },
          data: data ?? {},
          include_aliases: { external_id: userIds },
          target_channel: 'push',
        }),
      });

      this.logger.log(`Push sent — OneSignal id: ${result.id}, recipients: ${result.recipients}`);
      return { id: result.id, recipients: result.recipients };
    } catch (err) {
      this.logger.error(`Push failed — ${(err as Error).message}`);
      throw err; // BullMQ sẽ retry theo cấu hình attempts
    }
  }
}
