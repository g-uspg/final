import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto, UpdateVehicleDto, BlacklistDto } from './vehicles.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('vehicles')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('vehicles')
export class VehiclesController {
  constructor(private svc: VehiclesService) {}

  @Get()
  @Roles(Role.ADMIN, Role.SECURITY)
  @ApiOperation({ summary: 'Listar vehículos' })
  list(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('blacklisted') blacklisted?: string,
    @Query('search') search?: string,
  ) { return this.svc.list(page, limit, blacklisted !== undefined ? blacklisted === 'true' : undefined, search); }

  @Get('search')
  @ApiOperation({ summary: 'Buscar por placa' })
  search(@Query('plate') plate: string) { return this.svc.searchByPlate(plate); }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de vehículo' })
  findOne(@Param('id') id: string) { return this.svc.findOne(id); }

  @Post()
  @ApiOperation({ summary: 'Registrar vehículo propio' })
  create(@CurrentUser() user: any, @Body() dto: CreateVehicleDto) { return this.svc.create(user.id, dto); }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar vehículo' })
  update(@Param('id') id: string, @Body() dto: UpdateVehicleDto) { return this.svc.update(id, dto); }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar vehículo' })
  remove(@Param('id') id: string) { return this.svc.remove(id); }

  @Post(':id/authorize')
  @Roles(Role.ADMIN, Role.SECURITY)
  @ApiOperation({ summary: 'Autorizar vehículo' })
  authorize(@Param('id') id: string) { return this.svc.authorize(id); }

  @Post(':id/unauthorize')
  @Roles(Role.ADMIN, Role.SECURITY)
  @ApiOperation({ summary: 'Desautorizar vehículo' })
  unauthorize(@Param('id') id: string) { return this.svc.unauthorize(id); }

  @Post(':id/blacklist')
  @Roles(Role.ADMIN, Role.SECURITY)
  @ApiOperation({ summary: 'Agregar a lista negra' })
  blacklist(@Param('id') id: string, @Body() dto: BlacklistDto, @CurrentUser() user: any) {
    return this.svc.addBlacklist(id, dto.reason, user.id);
  }

  @Delete(':id/blacklist')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Remover de lista negra' })
  removeBlacklist(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.removeBlacklist(id, user.id);
  }
}
