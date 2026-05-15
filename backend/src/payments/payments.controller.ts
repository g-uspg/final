import { Controller, Get, Post, Body, Param, Query, UseGuards, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto, ConfirmPaymentDto, RefundDto } from './payments.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('payments')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private svc: PaymentsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear pago' })
  create(@Body() dto: CreatePaymentDto, @CurrentUser() user: any) { return this.svc.create(dto, user.id); }

  @Post(':id/confirm')
  @Roles(Role.ADMIN, Role.SECURITY)
  @ApiOperation({ summary: 'Confirmar pago' })
  confirm(@Param('id') id: string, @Body() dto: ConfirmPaymentDto) { return this.svc.confirm(id, dto); }

  @Get('session/:session_id')
  @ApiOperation({ summary: 'Estado de pago por sesión' })
  getBySession(@Param('session_id') session_id: string) { return this.svc.getBySession(session_id); }

  @Get('history')
  @ApiOperation({ summary: 'Historial de pagos del usuario' })
  getHistory(
    @CurrentUser() user: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: string,
  ) { return this.svc.getHistory(page, limit, user.id, status); }

  @Get('admin/all')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Todos los pagos (ADMIN)' })
  getAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: string,
  ) { return this.svc.getAll(page, limit, status); }

  @Post(':id/refund')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Reembolsar pago' })
  refund(@Param('id') id: string, @Body() dto: RefundDto) { return this.svc.refund(id, dto); }
}
