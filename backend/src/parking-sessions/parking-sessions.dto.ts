import { IsString, IsOptional, IsEnum, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EntryMethod } from '@prisma/client';

export class EntryDto {
  @ApiProperty() @IsString() vehicle_id: string;
  @ApiProperty() @IsString() space_id: string;
  @ApiPropertyOptional({ enum: EntryMethod }) @IsOptional() @IsEnum(EntryMethod) entry_method?: EntryMethod;
  @ApiPropertyOptional() @IsOptional() @IsString() operator_id?: string;
}

export class ExitDto {
  @ApiPropertyOptional() @IsOptional() @IsString() operator_id?: string;
}
