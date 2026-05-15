import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BarrierAction } from '@prisma/client';

export class BarrierCommandDto {
  @ApiProperty({ enum: BarrierAction }) @IsEnum(BarrierAction) action: BarrierAction;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
}
