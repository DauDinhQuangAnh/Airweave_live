import { IsString, IsNotEmpty, IsOptional, IsNumber, IsEnum, Min, Max } from 'class-validator';

export class CreateOrganizationDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsOptional()
  type?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsNumber()
  @IsOptional()
  lat?: number;

  @IsNumber()
  @IsOptional()
  lng?: number;

  @IsString()
  @IsOptional()
  contact_name?: string;

  @IsString()
  @IsOptional()
  contact_phone?: string;
}

export class CreateIotNodeDto {
  @IsString()
  @IsNotEmpty()
  chip_id: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  organization_id?: string;

  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;

  @IsString()
  @IsOptional()
  location_name?: string;

  @IsString()
  @IsOptional()
  hardware_ver?: string;
}

export class IngestTelemetryDto {
  @IsString()
  @IsNotEmpty()
  chip_id: string;

  @IsNumber()
  @Min(0)
  pm25: number;

  @IsNumber()
  @Min(0)
  pm10: number;

  @IsNumber()
  @IsOptional()
  temperature?: number;

  @IsNumber()
  @IsOptional()
  humidity?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  uv_index?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  co2?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  voc_index?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  battery?: number;



  @IsNumber()
  @IsOptional()
  rssi?: number;
}

export class AssignUserToOrgDto {
  @IsString()
  @IsNotEmpty()
  organization_id: string;

  @IsString()
  @IsNotEmpty()
  user_id: string;

  @IsString()
  @IsOptional()
  role?: string;
}

export class AutoDiscoverNodeDto {
  @IsString()
  @IsNotEmpty()
  chip_id: string;

  @IsString()
  @IsOptional()
  hardware_ver?: string;

  @IsString()
  @IsOptional()
  edition?: string;

  @IsString()
  @IsOptional()
  mac?: string;

  @IsNumber()
  @IsOptional()
  lat?: number;

  @IsNumber()
  @IsOptional()
  lng?: number;
}

