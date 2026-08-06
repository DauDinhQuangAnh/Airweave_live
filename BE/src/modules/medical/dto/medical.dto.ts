import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class CreateMedicalProfileDto {
  @ApiPropertyOptional({ example: 'self', description: 'self | child | parent | spouse ...' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  relation?: string;

  @ApiProperty({ example: 'Nguyễn Văn A' })
  @IsString()
  @MaxLength(100)
  display_name: string;

  @ApiPropertyOptional({ example: 1995 })
  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  birth_year?: number;

  @ApiPropertyOptional({ example: 'O+' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  blood_type?: string;

  @ApiPropertyOptional({ example: '0901234567' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  emergency_phone?: string;

  @ApiPropertyOptional({ example: 'Nguyễn Thị B' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  emergency_name?: string;

  @ApiPropertyOptional({ example: '🧑' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  avatar_emoji?: string;
}

export class UpdateMedicalProfileDto extends CreateMedicalProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  declare display_name: string;
}

export class ConditionKeyDto {
  @ApiProperty()
  @IsUUID()
  profile_id: string;

  @ApiProperty({ example: 'respiratory' })
  @IsString()
  @MaxLength(50)
  category: string;

  @ApiProperty({ example: 'asthma' })
  @IsString()
  @MaxLength(100)
  code: string;

  @ApiPropertyOptional({ example: 'Dùng ống xịt Ventolin khi lên cơn' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
