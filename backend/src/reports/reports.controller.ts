import { Controller, Get, Query, UseGuards, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ReportsService } from './reports.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.ADMIN)
@Controller('reports')
export class ReportsController {
  constructor(private svc: ReportsService) {}

  @Get('daily')
  @ApiOperation({ summary: 'Reporte diario' })
  getDaily(@Query('date') date?: string) { return this.svc.getDaily(date); }

  @Get('monthly')
  @ApiOperation({ summary: 'Reporte mensual' })
  getMonthly(
    @Query('year', new DefaultValuePipe(0), ParseIntPipe) year: number,
    @Query('month', new DefaultValuePipe(0), ParseIntPipe) month: number,
  ) { return this.svc.getMonthly(year || undefined, month || undefined); }

  @Get('revenue')
  @ApiOperation({ summary: 'Reporte de ingresos' })
  getRevenue(@Query('from') from?: string, @Query('to') to?: string) { return this.svc.getRevenue(from, to); }

  @Get('occupancy')
  @ApiOperation({ summary: 'Reporte de ocupación' })
  getOccupancy(@Query('from') from?: string, @Query('to') to?: string) { return this.svc.getOccupancy(from, to); }

  @Get('top-users')
  @ApiOperation({ summary: 'Top usuarios por sesiones' })
  getTopUsers(@Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number) { return this.svc.getTopUsers(limit); }

  @Get('prediction')
  @ApiOperation({ summary: 'Predicción de demanda' })
  getPrediction() { return this.svc.getPrediction(); }

  @Get('export')
  @ApiOperation({ summary: 'Exportar datos (sessions | payments)' })
  export(@Query('type') type: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.svc.export(type, from, to);
  }
}
