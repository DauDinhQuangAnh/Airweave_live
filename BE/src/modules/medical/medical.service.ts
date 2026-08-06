import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateMedicalProfileDto,
  UpdateMedicalProfileDto,
  ConditionKeyDto,
} from './dto/medical.dto';

@Injectable()
export class MedicalService {
  constructor(private readonly prisma: PrismaService) {}

  /** Chặn thao tác lên hồ sơ y tế của người khác. */
  private async assertOwnsProfile(userId: string, profileId: string) {
    const profile = await this.prisma.medicalProfile.findUnique({ where: { id: profileId } });
    if (!profile) throw new NotFoundException('Không tìm thấy hồ sơ y tế');
    if (profile.user_id !== userId) throw new ForbiddenException('Không có quyền với hồ sơ này');
    return profile;
  }

  // ---------- hồ sơ y tế ----------

  findProfiles(userId: string) {
    return this.prisma.medicalProfile.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'asc' },
    });
  }

  /** Trả kèm danh sách bệnh nền — tiện cho màn hình Medical ID. */
  findProfilesWithConditions(userId: string) {
    return this.prisma.medicalProfile.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'asc' },
      include: { conditions: { orderBy: { created_at: 'asc' } } },
    });
  }

  createProfile(userId: string, dto: CreateMedicalProfileDto) {
    return this.prisma.medicalProfile.create({ data: { user_id: userId, ...dto } });
  }

  async updateProfile(userId: string, id: string, dto: UpdateMedicalProfileDto) {
    await this.assertOwnsProfile(userId, id);
    return this.prisma.medicalProfile.update({ where: { id }, data: dto });
  }

  async removeProfile(userId: string, id: string) {
    await this.assertOwnsProfile(userId, id);
    await this.prisma.medicalProfile.delete({ where: { id } }); // conditions + sos_events cascade
    return { success: true };
  }

  // ---------- bệnh nền / tình trạng ----------

  findConditions(userId: string, profileId?: string) {
    return this.prisma.medicalCondition.findMany({
      where: { user_id: userId, ...(profileId ? { profile_id: profileId } : {}) },
      orderBy: { created_at: 'asc' },
    });
  }

  /** Bật/tắt một tình trạng: chưa có thì thêm, đã có thì xoá. */
  async toggleCondition(userId: string, dto: ConditionKeyDto) {
    await this.assertOwnsProfile(userId, dto.profile_id);

    const existing = await this.prisma.medicalCondition.findUnique({
      where: {
        profile_id_category_code: {
          profile_id: dto.profile_id,
          category: dto.category,
          code: dto.code,
        },
      },
    });

    if (existing) {
      await this.prisma.medicalCondition.delete({ where: { id: existing.id } });
      return { action: 'removed' as const, condition: existing };
    }

    const created = await this.prisma.medicalCondition.create({
      data: {
        profile_id: dto.profile_id,
        user_id: userId,
        category: dto.category,
        code: dto.code,
        note: dto.note ?? null,
      },
    });
    return { action: 'added' as const, condition: created };
  }

  /** Ghi chú cho một tình trạng — tự tạo nếu chưa tồn tại. */
  async setConditionNote(userId: string, dto: ConditionKeyDto) {
    await this.assertOwnsProfile(userId, dto.profile_id);

    return this.prisma.medicalCondition.upsert({
      where: {
        profile_id_category_code: {
          profile_id: dto.profile_id,
          category: dto.category,
          code: dto.code,
        },
      },
      create: {
        profile_id: dto.profile_id,
        user_id: userId,
        category: dto.category,
        code: dto.code,
        note: dto.note ?? null,
      },
      update: { note: dto.note ?? null },
    });
  }

  async removeCondition(userId: string, id: string) {
    const result = await this.prisma.medicalCondition.deleteMany({
      where: { id, user_id: userId },
    });
    if (result.count === 0) throw new NotFoundException('Không tìm thấy tình trạng y tế');
    return { success: true };
  }
}
