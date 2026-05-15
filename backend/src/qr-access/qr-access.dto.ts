import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ScanQrDto {
  @ApiProperty() @IsString() qr_code: string;
  @ApiPropertyOptional() @IsOptional() @IsString() space_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() operator_id?: string;
}

export class GenerateVisitorQrDto {
  @ApiProperty() @IsString() visitor_name: string;
  @ApiProperty() @IsString() vehicle_plate: string;
  @ApiPropertyOptional() @IsOptional() @IsString() purpose?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(72) valid_hours?: number;
}
