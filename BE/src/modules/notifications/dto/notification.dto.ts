import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class SendPushDto {
  @ApiProperty({ example: 'Cảnh báo AQI' })
  @IsString()
  @MaxLength(120)
  title: string;

  @ApiProperty({ example: 'AQI khu vực của bạn đang ở mức 168 — hạn chế ra ngoài.' })
  @IsString()
  @MaxLength(500)
  message: string;

  @ApiPropertyOptional({
    description: 'Danh sách user_id nhận thông báo. Bỏ trống = chỉ gửi cho chính mình.',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  userIds?: string[];

  @ApiPropertyOptional({ description: 'Dữ liệu kèm theo để FE xử lý khi mở thông báo' })
  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;
}
