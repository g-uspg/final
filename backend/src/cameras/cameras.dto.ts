import { IsString, IsOptional, IsBoolean, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCameraDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsString() location: string;
  @ApiPropertyOptional() @IsOptional() @IsString() stream_url?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() has_lpr?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() lat?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() lng?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() campus_id?: string;
}

export class UpdateCameraDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() location?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() stream_url?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() is_active?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() has_lpr?: boolean;
}

export class LprEventDto {
  @ApiProperty() @IsString() camera_id: string;
  @ApiProperty() @IsString() plate: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() confidence?: number;
}
