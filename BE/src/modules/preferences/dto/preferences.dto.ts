import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

const SENSITIVE_GROUPS = ['none', 'child', 'elderly', 'respiratory', 'pregnant'];

export class UpsertPreferencesDto {
  @ApiPropertyOptional({ example: ['self', 'child'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  health_tier?: string[];

  @ApiPropertyOptional({ example: ['morning_rush'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  active_hours?: string[];

  @ApiPropertyOptional({ example: ['motorbike'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  commute_type?: string[];

  @ApiPropertyOptional({ example: ['asthma'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  medical_history?: string[];

  @ApiPropertyOptional({ example: 'not_interested' })
  @IsOptional()
  @IsString()
  purifier_status?: string;

  @ApiPropertyOptional({ example: 'balanced' })
  @IsOptional()
  @IsString()
  route_priority?: string;

  @ApiPropertyOptional({ example: 'always' })
  @IsOptional()
  @IsString()
  alert_mode?: string;

  @ApiPropertyOptional({ enum: SENSITIVE_GROUPS })
  @IsOptional()
  @IsIn(SENSITIVE_GROUPS, { message: `sensitive_group phải thuộc: ${SENSITIVE_GROUPS.join(', ')}` })
  sensitive_group?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  custom_sensitivity_note?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  not_sure?: boolean;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(500)
  alert_threshold?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  high_exposure?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  affiliate_target?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  notify_enabled?: boolean;

  @ApiPropertyOptional({ example: 22 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  quiet_hours_start?: number;

  @ApiPropertyOptional({ example: 6 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  quiet_hours_end?: number;
}

export class MarkAlertSentDto {
  @ApiPropertyOptional({ example: 168 })
  @IsOptional()
  @IsInt()
  last_alert_aqi?: number;
}
