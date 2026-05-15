import { Controller, Get, Query, UseGuards, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { DashboardService } from './dashboard.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.ADMIN, Role.SECURITY)
@Controller('dashboard')
export class DashboardController {
  constructor(private svc: DashboardService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Estadísticas generales' })
  getStats() { return this.svc.getStats(); }

  @Get('recent-activity')
  @ApiOperation({ summary: 'Actividad reciente' })
  getRecentActivity(@Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number) {
    return this.svc.getRecentActivity(limit);
  }

  @Get('hourly-traffic')
  @ApiOperation({ summary: 'Tráfico por hora del día' })
  getHourlyTraffic(@Query('date') date?: string) { return this.svc.getHourlyTraffic(date); }

  @Get('alerts')
  @ApiOperation({ summary: 'Alertas activas' })
  getAlerts() { return this.svc.getAlerts(); }
}
