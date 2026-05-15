import { IsString, IsOptional, IsInt, IsEnum, IsNumber, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Zone, SpaceType, SpaceStatus } from '@prisma/client';

export class CreateSpaceDto {
  @ApiProperty() @IsString() code: string;
  @ApiProperty({ enum: Zone }) @IsEnum(Zone) zone: Zone;
  @ApiProperty({ enum: SpaceType }) @IsEnum(SpaceType) type: SpaceType;
  @ApiPropertyOptional() @IsOptional() @IsInt() floor?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() lat?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() lng?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() campus_id?: string;
}

export class UpdateSpaceDto {
  @ApiPropertyOptional({ enum: SpaceStatus }) @IsOptional() @IsEnum(SpaceStatus) status?: SpaceStatus;
  @ApiPropertyOptional({ enum: SpaceType }) @IsOptional() @IsEnum(SpaceType) type?: SpaceType;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() is_active?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() lat?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() lng?: number;
}

export class SensorUpdateDto {
  @ApiProperty() @IsString() space_code: string;
  @ApiProperty({ enum: ['OCCUPIED', 'AVAILABLE'] }) @IsString() status: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sensor_id?: string;
}

export class PositionUpdateDto {
  @ApiProperty() @IsNumber() lat: number;
  @ApiProperty() @IsNumber() lng: number;
}
