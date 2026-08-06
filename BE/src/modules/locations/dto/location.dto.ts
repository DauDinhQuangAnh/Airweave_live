import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsLatitude, IsLongitude, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export const LOCATION_TYPES = ['home', 'work', 'school'];

export class UpsertLocationDto {
  @ApiProperty({ enum: LOCATION_TYPES })
  @IsIn(LOCATION_TYPES, { message: `location_type phải thuộc: ${LOCATION_TYPES.join(', ')}` })
  location_type: string;

  @ApiProperty({ example: 'Nhà riêng — Cầu Giấy, Hà Nội' })
  @IsString()
  @MaxLength(200)
  label: string;

  @ApiProperty({ example: 21.0285 })
  @IsNumber()
  @IsLatitude()
  lat: number;

  @ApiProperty({ example: 105.8542 })
  @IsNumber()
  @IsLongitude()
  lng: number;
}

export class UpdateLocationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  label?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @IsLatitude()
  lat?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @IsLongitude()
  lng?: number;
}
