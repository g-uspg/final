import { Controller, Get, Post, Body, Param, Query, UseGuards, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Role, BarrierAction } from '@prisma/client';
import { BarriersService } from './barriers.service';
import { BarrierCommandDto } from './barriers.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('barriers')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('barriers')
export class BarriersController {
  constructor(private svc: BarriersService) {}

  @Get('status')
  @Roles(Role.ADMIN, Role.SECURITY)
  @ApiOperation({ summary: 'Estado de barreras' })
  getStatus(@Query('barrier_id') barrier_id?: string) { return this.svc.getStatus(barrier_id); }

  @Post(':barrier_id/open')
  @Roles(Role.ADMIN, Role.SECURITY)
  @ApiOperation({ summary: 'Abrir barrera' })
  open(@Param('barrier_id') barrier_id: string, @Body() dto: BarrierCommandDto, @CurrentUser() user: any) {
    return this.svc.command(barrier_id, BarrierAction.OPEN, user.id, dto.reason);
  }

  @Post(':barrier_id/close')
  @Roles(Role.ADMIN, Role.SECURITY)
  @ApiOperation({ summary: 'Cerrar barrera' })
  close(@Param('barrier_id') barrier_id: string, @Body() dto: BarrierCommandDto, @CurrentUser() user: any) {
    return this.svc.command(barrier_id, BarrierAction.CLOSE, user.id, dto.reason);
  }

  @Post(':barrier_id/block')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Bloquear barrera' })
  block(@Param('barrier_id') barrier_id: string, @Body() dto: BarrierCommandDto, @CurrentUser() user: any) {
    return this.svc.command(barrier_id, BarrierAction.BLOCK, user.id, dto.reason);
  }

  @Get('logs')
  @Roles(Role.ADMIN, Role.SECURITY)
  @ApiOperation({ summary: 'Logs de barreras' })
  getLogs(
    @Query('barrier_id') barrier_id?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number = 20,
  ) { return this.svc.getLogs(barrier_id, page, limit); }
}
