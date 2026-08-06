import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  GoneException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSosEventDto } from './dto/sos.dto';

@Injectable()
export class SosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async create(userId: string, dto: CreateSosEventDto) {
    const profile = await this.prisma.medicalProfile.findUnique({
      where: { id: dto.profile_id },
    });
    if (!profile) throw new NotFoundException('Không tìm thấy hồ sơ y tế');
    if (profile.user_id !== userId) throw new ForbiddenException('Không có quyền với hồ sơ này');

    const ttlHours = dto.ttl_hours && dto.ttl_hours > 0 ? Math.min(dto.ttl_hours, 72) : 24;

    const event = await this.prisma.sosEvent.create({
      data: {
        user_id: userId,
        profile_id: dto.profile_id,
        lat: dto.lat ?? null,
        lng: dto.lng ?? null,
        aqi: dto.aqi ?? null,
        pm25: dto.pm25 ?? null,
        expires_at: new Date(Date.now() + ttlHours * 3_600_000),
      },
    });

    const frontend = this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:8080';
    return { ...event, share_url: `${frontend}/medical-qr?token=${event.share_token}` };
  }

  findAll(userId: string) {
    return this.prisma.sosEvent.findMany({
      where: { user_id: userId },
      orderBy: { triggered_at: 'desc' },
      take: 50,
      include: { profile: { select: { display_name: true, avatar_emoji: true } } },
    });
  }

  async remove(userId: string, id: string) {
    const result = await this.prisma.sosEvent.deleteMany({ where: { id, user_id: userId } });
    if (result.count === 0) throw new NotFoundException('Không tìm thấy sự kiện SOS');
    return { success: true };
  }

  /**
   * Endpoint công khai thay cho edge function `medical-qr`.
   * Chỉ trả dữ liệu y tế tối thiểu, và chỉ khi token còn hạn.
   */
  async findByShareToken(token: string) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) {
      throw new BadRequestException('Token không hợp lệ');
    }

    const event = await this.prisma.sosEvent.findUnique({
      where: { share_token: token },
      include: {
        profile: {
          select: {
            display_name: true,
            relation: true,
            birth_year: true,
            blood_type: true,
            emergency_phone: true,
            emergency_name: true,
            avatar_emoji: true,
            conditions: { select: { category: true, code: true, note: true } },
          },
        },
      },
    });

    if (!event) throw new NotFoundException('Không tìm thấy thông tin SOS');
    if (event.expires_at.getTime() < Date.now()) {
      throw new GoneException('Link chia sẻ đã hết hạn');
    }

    const { conditions, ...profile } = event.profile;
    return {
      event: {
        lat: event.lat,
        lng: event.lng,
        aqi: event.aqi,
        pm25: event.pm25,
        triggered_at: event.triggered_at,
        expires_at: event.expires_at,
      },
      profile,
      conditions,
    };
  }
}
