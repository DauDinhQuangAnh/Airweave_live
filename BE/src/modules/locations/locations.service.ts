import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpsertLocationDto, UpdateLocationDto } from './dto/location.dto';

@Injectable()
export class LocationsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(userId: string) {
    return this.prisma.userLocation.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'asc' },
    });
  }

  /** Mỗi user chỉ có 1 địa điểm cho mỗi loại → upsert theo (user_id, location_type). */
  upsert(userId: string, dto: UpsertLocationDto) {
    return this.prisma.userLocation.upsert({
      where: { user_id_location_type: { user_id: userId, location_type: dto.location_type } },
      create: { user_id: userId, ...dto },
      update: { label: dto.label, lat: dto.lat, lng: dto.lng },
    });
  }

  async update(userId: string, id: string, dto: UpdateLocationDto) {
    const result = await this.prisma.userLocation.updateMany({
      where: { id, user_id: userId },
      data: dto,
    });
    if (result.count === 0) throw new NotFoundException('Không tìm thấy địa điểm');
    return this.prisma.userLocation.findUnique({ where: { id } });
  }

  async remove(userId: string, id: string) {
    const result = await this.prisma.userLocation.deleteMany({ where: { id, user_id: userId } });
    if (result.count === 0) throw new NotFoundException('Không tìm thấy địa điểm');
    return { success: true };
  }
}
