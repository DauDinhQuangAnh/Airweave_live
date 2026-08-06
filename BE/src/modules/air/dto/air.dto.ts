import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsLatitude, IsLongitude, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class GeoPointDto {
  @ApiProperty({ example: 21.0285 })
  @IsNumber()
  @IsLatitude()
  lat: number;

  @ApiProperty({ example: 105.8542 })
  @IsNumber()
  @IsLongitude()
  lng: number;
}

export class BoundsDto {
  @ApiProperty({ example: 20.9 })
  @IsNumber()
  @IsLatitude()
  lat1: number;

  @ApiProperty({ example: 105.7 })
  @IsNumber()
  @IsLongitude()
  lng1: number;

  @ApiProperty({ example: 21.1 })
  @IsNumber()
  @IsLatitude()
  lat2: number;

  @ApiProperty({ example: 106.0 })
  @IsNumber()
  @IsLongitude()
  lng2: number;
}

export class HistoryQueryDto extends GeoPointDto {
  @ApiPropertyOptional({ example: 7, description: 'Số ngày quá khứ (1-92)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(92)
  days?: number;
}
