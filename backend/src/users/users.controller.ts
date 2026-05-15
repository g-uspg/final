import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, AssignNfcDto } from './users.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private svc: UsersService) {}

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Listar usuarios (ADMIN)' })
  list(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('role') role?: Role,
    @Query('is_active') is_active?: string,
  ) {
    return this.svc.list(page, limit, role, is_active !== undefined ? is_active === 'true' : undefined);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.SECURITY)
  @ApiOperation({ summary: 'Detalle de usuario' })
  findOne(@Param('id') id: string) { return this.svc.findOne(id); }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Crear usuario' })
  create(@Body() dto: CreateUserDto) { return this.svc.create(dto); }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Actualizar usuario' })
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) { return this.svc.update(id, dto); }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Eliminar usuario (soft delete)' })
  remove(@Param('id') id: string) { return this.svc.remove(id); }

  @Post(':id/regenerate-qr')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Regenerar QR de usuario' })
  regenerateQR(@Param('id') id: string) { return this.svc.regenerateQR(id); }

  @Post(':id/assign-nfc')
  @Roles(Role.ADMIN, Role.SECURITY)
  @ApiOperation({ summary: 'Asignar tarjeta NFC' })
  assignNfc(@Param('id') id: string, @Body() dto: AssignNfcDto) { return this.svc.assignNfc(id, dto.nfc_card_id); }

  @Patch(':id/toggle-active')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Activar/desactivar usuario' })
  toggleActive(@Param('id') id: string) { return this.svc.toggleActive(id); }

  @Get(':id/vehicles')
  @Roles(Role.ADMIN, Role.SECURITY)
  @ApiOperation({ summary: 'Vehículos del usuario' })
  getVehicles(@Param('id') id: string) { return this.svc.getVehicles(id); }

  @Get(':id/sessions')
  @Roles(Role.ADMIN, Role.SECURITY)
  @ApiOperation({ summary: 'Historial de sesiones del usuario' })
  getSessions(
    @Param('id') id: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) { return this.svc.getSessions(id, page, limit); }
}
