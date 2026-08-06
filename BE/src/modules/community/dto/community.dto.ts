import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const REPORT_KINDS = ['smoke', 'dust', 'burning', 'traffic', 'odor', 'other'];

export class CreateReportDto {
  @ApiProperty({ example: 21.0285 })
  @IsNumber()
  @IsLatitude()
  lat: number;

  @ApiProperty({ example: 105.8542 })
  @IsNumber()
  @IsLongitude()
  lng: number;

  @ApiPropertyOptional({ enum: REPORT_KINDS, default: 'smoke' })
  @IsOptional()
  @IsIn(REPORT_KINDS)
  kind?: string;

  @ApiPropertyOptional({ example: 'Đốt rác ven đường, khói dày' })
  @IsOptional()
  @IsString()
  @MaxLength(280)
  text?: string;

  @ApiPropertyOptional({ example: 60, description: 'Số phút báo cáo còn hiển thị' })
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(1440)
  ttl_minutes?: number;
}

export class UpdateReportDto {
  @ApiPropertyOptional({ enum: REPORT_KINDS })
  @IsOptional()
  @IsIn(REPORT_KINDS)
  kind?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(280)
  text?: string;
}

export class QueryReportsDto {
  @ApiPropertyOptional({ description: 'Giới hạn theo khung nhìn bản đồ' })
  @IsOptional()
  @IsNumber()
  @IsLatitude()
  lat1?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @IsLongitude()
  lng1?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @IsLatitude()
  lat2?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @IsLongitude()
  lng2?: number;

  @ApiPropertyOptional({ default: 200 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;
}
