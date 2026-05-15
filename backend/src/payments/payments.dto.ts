import { IsString, IsOptional, IsEnum, IsNumber, IsPositive } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';

export class CreatePaymentDto {
  @ApiProperty() @IsString() session_id: string;
  @ApiProperty({ enum: PaymentMethod }) @IsEnum(PaymentMethod) payment_method: PaymentMethod;
  @ApiPropertyOptional() @IsOptional() @IsString() transaction_reference?: string;
}

export class ConfirmPaymentDto {
  @ApiProperty() @IsString() transaction_reference: string;
}

export class RefundDto {
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
}
