import { Controller, Get, Query, UseGuards, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { SecurityService } from './security.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('security')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.ADMIN, Role.SECURITY)
@Controller('security')
export class SecurityController {
  constructor(private svc: SecurityService) {}

  @Get('audit-logs')
  @ApiOperation({ summary: 'Logs de auditoría' })
  getAuditLogs(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('user_id') user_id?: string,
    @Query('action') action?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) { return this.svc.getAuditLogs(page, limit, user_id, action, from, to); }

  @Get('blacklist')
  @ApiOperation({ summary: 'Lista negra de vehículos' })
  getBlacklist(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('is_active') is_active?: string,
  ) { return this.svc.getBlacklist(page, limit, is_active !== undefined ? is_active === 'true' : undefined); }

  @Get('suspicious-activity')
  @ApiOperation({ summary: 'Actividad sospechosa' })
  getSuspiciousActivity(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) { return this.svc.getSuspiciousActivity(page, limit); }

  @Get('failed-attempts')
  @ApiOperation({ summary: 'Intentos fallidos de login' })
  getFailedAttempts(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) { return this.svc.getFailedAttempts(page, limit); }
}
