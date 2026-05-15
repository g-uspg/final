import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReservationType } from '@prisma/client';

export class CreateReservationDto {
  @ApiProperty() @IsString() vehicle_id: string;
  @ApiProperty() @IsString() space_id: string;
  @ApiProperty() @IsDateString() start_time: string;
  @ApiProperty() @IsDateString() end_time: string;
  @ApiPropertyOptional({ enum: ReservationType }) @IsOptional() @IsEnum(ReservationType) type?: ReservationType;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
