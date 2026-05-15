import { Controller, Get, Post, Body, Param, Query, UseGuards, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto } from './reservations.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('reservations')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('reservations')
export class ReservationsController {
  constructor(private svc: ReservationsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear reserva' })
  create(@Body() dto: CreateReservationDto, @CurrentUser() user: any) { return this.svc.create(dto, user.id); }

  @Get('my')
  @ApiOperation({ summary: 'Mis reservas' })
  getMy(
    @CurrentUser() user: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) { return this.svc.getMy(user.id, page, limit); }

  @Get('active')
  @ApiOperation({ summary: 'Mis reservas activas' })
  getActive(@CurrentUser() user: any) { return this.svc.getActive(user.id); }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de reserva' })
  findOne(@Param('id') id: string) { return this.svc.findOne(id); }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancelar reserva' })
  cancel(@Param('id') id: string, @CurrentUser() user: any) { return this.svc.cancel(id, user.id); }
}
