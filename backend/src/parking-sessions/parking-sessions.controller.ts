import { Controller, Get, Post, Body, Param, Query, UseGuards, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ParkingSessionsService } from './parking-sessions.service';
import { EntryDto, ExitDto } from './parking-sessions.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('parking-sessions')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('parking-sessions')
export class ParkingSessionsController {
  constructor(private svc: ParkingSessionsService) {}

  @Post('entry')
  @Roles(Role.ADMIN, Role.SECURITY)
  @ApiOperation({ summary: 'Registrar entrada' })
  entry(@Body() dto: EntryDto) { return this.svc.entry(dto); }

  @Post(':id/exit')
  @Roles(Role.ADMIN, Role.SECURITY)
  @ApiOperation({ summary: 'Registrar salida' })
  exit(@Param('id') id: string, @Body() dto: ExitDto) { return this.svc.exit(id, dto); }

  @Get('active')
  @Roles(Role.ADMIN, Role.SECURITY)
  @ApiOperation({ summary: 'Sesiones activas' })
  getActive(@Query('campus_id') campus_id?: string) { return this.svc.getActive(campus_id); }

  @Get('history')
  @Roles(Role.ADMIN, Role.SECURITY)
  @ApiOperation({ summary: 'Historial de sesiones' })
  getHistory(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('vehicle_id') vehicle_id?: string,
    @Query('user_id') user_id?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) { return this.svc.getHistory(page, limit, vehicle_id, user_id, from, to); }

  @Get('my')
  @ApiOperation({ summary: 'Mis sesiones' })
  getMySessions(
    @CurrentUser() user: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) { return this.svc.getMySessions(user.id, page, limit); }

  @Get(':id/ticket')
  @ApiOperation({ summary: 'Obtener ticket de sesión' })
  getTicket(@Param('id') id: string) { return this.svc.getTicket(id); }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de sesión' })
  findOne(@Param('id') id: string) { return this.svc.findOne(id); }
}
