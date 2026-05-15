import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Role, Zone, SpaceStatus } from '@prisma/client';
import { ParkingSpacesService } from './parking-spaces.service';
import { CreateSpaceDto, UpdateSpaceDto, SensorUpdateDto, PositionUpdateDto } from './parking-spaces.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('parking-spaces')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('parking-spaces')
export class ParkingSpacesController {
  constructor(private svc: ParkingSpacesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar espacios' })
  list(
    @Query('zone') zone?: Zone,
    @Query('type') type?: string,
    @Query('status') status?: SpaceStatus,
    @Query('campus_id') campus_id?: string,
  ) { return this.svc.list(zone, type, status, campus_id); }

  @Get('available')
  @ApiOperation({ summary: 'Espacios disponibles' })
  available(
    @Query('zone') zone?: Zone,
    @Query('type') type?: string,
    @Query('campus_id') campus_id?: string,
  ) { return this.svc.getAvailable(zone, type, campus_id); }

  @Get('status')
  @ApiOperation({ summary: 'Estado general del parqueo' })
  status(@Query('campus_id') campus_id?: string) { return this.svc.getStatus(campus_id); }

  @Get('map/:campus_id/zone/:zone')
  @ApiOperation({ summary: 'Mapa de zona' })
  mapByZone(@Param('campus_id') campus_id: string, @Param('zone') zone: Zone) {
    return this.svc.getMapByZone(campus_id, zone);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de espacio' })
  findOne(@Param('id') id: string) { return this.svc.findOne(id); }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Crear espacio' })
  create(@Body() dto: CreateSpaceDto) { return this.svc.create(dto); }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.SECURITY)
  @ApiOperation({ summary: 'Actualizar espacio' })
  update(@Param('id') id: string, @Body() dto: UpdateSpaceDto) { return this.svc.update(id, dto); }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Eliminar espacio' })
  remove(@Param('id') id: string) { return this.svc.remove(id); }

  @Post('sensor-update')
  @ApiOperation({ summary: 'Actualizar estado por sensor IoT' })
  sensorUpdate(@Body() dto: SensorUpdateDto) { return this.svc.sensorUpdate(dto); }

  @Patch(':id/position')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Actualizar posición GPS del espacio' })
  updatePosition(@Param('id') id: string, @Body() dto: PositionUpdateDto) {
    return this.svc.updatePosition(id, dto);
  }
}
