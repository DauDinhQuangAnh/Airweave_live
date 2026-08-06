import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

/**
 * Thay thế Supabase Realtime cho bảng community_reports.
 * FE kết nối tới namespace /community và nghe 2 sự kiện: report:new, report:deleted.
 */
@WebSocketGateway({
  namespace: '/community',
  cors: { origin: true, credentials: true },
})
export class CommunityGateway {
  private readonly logger = new Logger(CommunityGateway.name);

  @WebSocketServer()
  server: Server;

  /** Cho phép client chỉ nhận báo cáo trong một khu vực (room theo ô lưới ~0.1 độ). */
  @SubscribeMessage('subscribe:area')
  handleSubscribeArea(
    @MessageBody() body: { lat: number; lng: number },
    @ConnectedSocket() client: Socket,
  ) {
    if (typeof body?.lat !== 'number' || typeof body?.lng !== 'number') return { ok: false };
    const room = CommunityGateway.areaRoom(body.lat, body.lng);
    void client.join(room);
    return { ok: true, room };
  }

  static areaRoom(lat: number, lng: number) {
    return `area:${Math.floor(lat * 10)}:${Math.floor(lng * 10)}`;
  }

  emitNewReport(report: Record<string, unknown>) {
    const room = CommunityGateway.areaRoom(report.lat as number, report.lng as number);
    this.server?.emit('report:new', report);
    this.server?.to(room).emit('report:new:area', report);
  }

  emitDeletedReport(id: string) {
    this.server?.emit('report:deleted', { id });
  }
}
