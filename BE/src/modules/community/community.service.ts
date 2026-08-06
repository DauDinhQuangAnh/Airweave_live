import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { CommunityGateway } from './community.gateway';
import { CreateReportDto, UpdateReportDto, QueryReportsDto } from './dto/community.dto';

/** Không lộ user_id ra ngoài — giống REVOKE SELECT(user_id) ở bản Supabase. */
const PUBLIC_FIELDS = {
  id: true,
  lat: true,
  lng: true,
  kind: true,
  text: true,
  created_at: true,
  expires_at: true,
} as const;

@Injectable()
export class CommunityService {
  private readonly logger = new Logger(CommunityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: CommunityGateway,
  ) {}

  /** Chỉ trả báo cáo còn hiệu lực, có thể giới hạn theo khung nhìn bản đồ. */
  findActive(query: QueryReportsDto) {
    const bbox =
      query.lat1 != null && query.lng1 != null && query.lat2 != null && query.lng2 != null
        ? {
            lat: { gte: Math.min(query.lat1, query.lat2), lte: Math.max(query.lat1, query.lat2) },
            lng: { gte: Math.min(query.lng1, query.lng2), lte: Math.max(query.lng1, query.lng2) },
          }
        : {};

    return this.prisma.communityReport.findMany({
      where: { expires_at: { gt: new Date() }, ...bbox },
      select: PUBLIC_FIELDS,
      orderBy: { created_at: 'desc' },
      take: query.limit ?? 200,
    });
  }

  /** Báo cáo do chính user gửi — ở đây mới trả về đủ để user tự quản lý. */
  findMine(userId: string) {
    return this.prisma.communityReport.findMany({
      where: { user_id: userId },
      select: PUBLIC_FIELDS,
      orderBy: { created_at: 'desc' },
      take: 100,
    });
  }

  async create(userId: string, dto: CreateReportDto) {
    const ttl = dto.ttl_minutes ?? 60;
    const report = await this.prisma.communityReport.create({
      data: {
        user_id: userId,
        lat: dto.lat,
        lng: dto.lng,
        kind: dto.kind ?? 'smoke',
        text: dto.text?.slice(0, 280) ?? null,
        expires_at: new Date(Date.now() + ttl * 60_000),
      },
      select: PUBLIC_FIELDS,
    });

    this.gateway.emitNewReport(report as unknown as Record<string, unknown>);
    return report;
  }

  async update(userId: string, id: string, dto: UpdateReportDto) {
    const result = await this.prisma.communityReport.updateMany({
      where: { id, user_id: userId },
      data: dto,
    });
    if (result.count === 0) throw new NotFoundException('Không tìm thấy báo cáo của bạn');
    return this.prisma.communityReport.findUnique({ where: { id }, select: PUBLIC_FIELDS });
  }

  async remove(userId: string, id: string) {
    const result = await this.prisma.communityReport.deleteMany({ where: { id, user_id: userId } });
    if (result.count === 0) throw new NotFoundException('Không tìm thấy báo cáo của bạn');
    this.gateway.emitDeletedReport(id);
    return { success: true };
  }

  /** Dọn báo cáo hết hạn mỗi giờ — bản Supabase chỉ lọc lúc đọc, ở đây xoá hẳn. */
  @Cron(CronExpression.EVERY_HOUR)
  async purgeExpired() {
    const { count } = await this.prisma.communityReport.deleteMany({
      where: { expires_at: { lt: new Date() } },
    });
    if (count > 0) this.logger.log(`Đã dọn ${count} báo cáo cộng đồng hết hạn`);
  }
}
