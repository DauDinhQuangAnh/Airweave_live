import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

/** Ảnh chụp vị trí + chất lượng không khí gần nhất của user, dùng làm fallback khi mất GPS. */
export class UpsertLiveContextDto {
  @ApiPropertyOptional({ example: 'Cầu Giấy, Hà Nội' })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiProperty({ example: 21.0285 })
  @IsNumber()
  @IsLatitude()
  lat: number;

  @ApiProperty({ example: 105.8542 })
  @IsNumber()
  @IsLongitude()
  lng: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  accuracy?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  aqi?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  pm25?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  pm10?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  temperature?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  humidity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  wind_speed?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  wind_direction?: string;

  @ApiPropertyOptional({ example: 'open-meteo' })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  station?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  snapshot_updated_at?: string;
}
