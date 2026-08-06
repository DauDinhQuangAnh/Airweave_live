import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpsertLiveContextDto } from './dto/live-context.dto';

@Injectable()
export class LiveContextService {
  constructor(private readonly prisma: PrismaService) {}

  findByUser(userId: string) {
    return this.prisma.userLiveContext.findUnique({ where: { user_id: userId } });
  }

  upsert(userId: string, dto: UpsertLiveContextDto) {
    const data = {
      ...dto,
      snapshot_updated_at: dto.snapshot_updated_at
        ? new Date(dto.snapshot_updated_at)
        : new Date(),
    };
    return this.prisma.userLiveContext.upsert({
      where: { user_id: userId },
      create: { user_id: userId, ...data },
      update: data,
    });
  }

  async remove(userId: string) {
    await this.prisma.userLiveContext.deleteMany({ where: { user_id: userId } });
    return { success: true };
  }
}
