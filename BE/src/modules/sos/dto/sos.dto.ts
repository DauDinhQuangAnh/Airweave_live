import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsLatitude, IsLongitude, IsNumber, IsOptional, IsUUID } from 'class-validator';

export class CreateSosEventDto {
  @ApiProperty({ description: 'Hồ sơ y tế được chia sẻ kèm tín hiệu SOS' })
  @IsUUID()
  profile_id: string;

  @ApiPropertyOptional({ example: 21.0285 })
  @IsOptional()
  @IsNumber()
  @IsLatitude()
  lat?: number;

  @ApiPropertyOptional({ example: 105.8542 })
  @IsOptional()
  @IsNumber()
  @IsLongitude()
  lng?: number;

  @ApiPropertyOptional({ example: 168 })
  @IsOptional()
  @IsInt()
  aqi?: number;

  @ApiPropertyOptional({ example: 82.4 })
  @IsOptional()
  @IsNumber()
  pm25?: number;

  @ApiPropertyOptional({ example: 24, description: 'Số giờ link chia sẻ còn hiệu lực' })
  @IsOptional()
  @IsInt()
  ttl_hours?: number;
}
