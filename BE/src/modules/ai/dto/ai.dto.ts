import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class ChatMessageDto {
  @ApiProperty({ enum: ['user', 'assistant'] })
  @IsIn(['user', 'assistant'])
  role: 'user' | 'assistant';

  @ApiProperty()
  @IsString()
  @MaxLength(4000)
  content: string;
}

export class AiContextDto {
  @ApiPropertyOptional({ example: 'Cầu Giấy, Hà Nội' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ example: 168 })
  @IsOptional()
  @IsNumber()
  aqi?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  pm25?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  temperature?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  humidity?: number;

  @ApiPropertyOptional({ example: 'người có bệnh hô hấp' })
  @IsOptional()
  @IsString()
  riskGroup?: string;
}

export class ChatDto {
  @ApiPropertyOptional({ enum: ['vi', 'en'], default: 'vi' })
  @IsOptional()
  @IsIn(['vi', 'en'])
  lang?: 'vi' | 'en';

  @ApiProperty({ type: [ChatMessageDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages: ChatMessageDto[];

  @ApiPropertyOptional({ type: AiContextDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AiContextDto)
  context?: AiContextDto;
}

export class InsightDto {
  @ApiPropertyOptional({ enum: ['vi', 'en'], default: 'vi' })
  @IsOptional()
  @IsIn(['vi', 'en'])
  lang?: 'vi' | 'en';

  @ApiPropertyOptional({ example: { label: 'Cầu Giấy, Hà Nội' } })
  @IsOptional()
  @IsObject()
  location?: { label?: string };

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  weather?: {
    aqi?: number;
    pm25?: number;
    temperature?: number;
    humidity?: number;
    windSpeed?: number;
    windDirection?: string;
  };

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  preferences?: {
    health_tier?: string[];
    commute_type?: string[];
    high_exposure?: boolean;
    sensitive_group?: string;
  };
}
