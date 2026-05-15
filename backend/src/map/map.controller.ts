import { Controller, Get, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { MapService } from './map.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('map')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('map')
export class MapController {
  constructor(private svc: MapService) {}

  @Get('campus')
  @ApiOperation({ summary: 'Datos del campus' })
  getCampusData(@Query('campus_id') campus_id?: string) { return this.svc.getCampusData(campus_id); }

  @Get('zone/:zone')
  @ApiOperation({ summary: 'Layout de zona' })
  getZoneLayout(@Param('zone') zone: string, @Query('campus_id') campus_id?: string) {
    return this.svc.getZoneLayout(zone.toUpperCase(), campus_id);
  }

  @Get('realtime')
  @ApiOperation({ summary: 'Snapshot en tiempo real' })
  getRealtimeSnapshot(@Query('campus_id') campus_id?: string) { return this.svc.getRealtimeSnapshot(campus_id); }

  @Patch('spaces/:id/position')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Actualizar posición de espacio' })
  updateSpacePosition(
    @Param('id') id: string,
    @Body('lat') lat: number,
    @Body('lng') lng: number,
  ) { return this.svc.updateSpacePosition(id, lat, lng); }
}
