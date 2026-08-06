import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateProfileDto } from './dto/profile.dto';

@Injectable()
export class ProfilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async findByUser(userId: string) {
    const profile = await this.prisma.profile.findUnique({ where: { user_id: userId } });
    if (!profile) throw new NotFoundException('Không tìm thấy hồ sơ người dùng');
    return profile;
  }

  async update(userId: string, dto: UpdateProfileDto) {
    const data: Record<string, unknown> = { ...dto };
    if (dto.date_of_birth) data.date_of_birth = new Date(dto.date_of_birth);

    return this.prisma.profile.upsert({
      where: { user_id: userId },
      create: { user_id: userId, ...(data as any) },
      update: data,
    });
  }

  /** Đánh dấu hoàn tất onboarding — dùng ở cuối luồng cá nhân hoá. */
  async completeOnboarding(userId: string) {
    return this.prisma.profile.upsert({
      where: { user_id: userId },
      create: { user_id: userId, onboarding_completed: true },
      update: { onboarding_completed: true },
    });
  }

  async setAvatar(userId: string, file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Chưa chọn file ảnh');

    const appUrl = this.config.get<string>('APP_URL') ?? 'http://localhost:3000';
    const publicUrl = `${appUrl}/api/uploads/avatars/${file.filename}`;

    const current = await this.prisma.profile.findUnique({ where: { user_id: userId } });
    const updated = await this.prisma.profile.upsert({
      where: { user_id: userId },
      create: { user_id: userId, avatar_url: publicUrl },
      update: { avatar_url: publicUrl },
    });

    // Dọn file cũ do chính app lưu (bỏ qua avatar từ Google)
    const old = current?.avatar_url;
    if (old?.startsWith(`${appUrl}/api/uploads/avatars/`)) {
      const oldName = old.split('/').pop();
      if (oldName && oldName !== file.filename) {
        await unlink(join(process.cwd(), 'uploads', 'avatars', oldName)).catch(() => undefined);
      }
    }

    return { avatar_url: publicUrl, profile: updated };
  }

  /** Xoá tài khoản: các bảng con đều ON DELETE CASCADE. */
  async deleteAccount(userId: string) {
    await this.prisma.user.delete({ where: { id: userId } });
    return { success: true };
  }
}
