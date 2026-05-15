import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CamerasService } from './cameras.service';
import { CreateCameraDto, UpdateCameraDto, LprEventDto } from './cameras.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('cameras')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('cameras')
export class CamerasController {
  constructor(private svc: CamerasService) {}

  @Post('lpr-event')
  @Roles(Role.ADMIN, Role.SECURITY)
  @ApiOperation({ summary: 'Evento LPR de cámara' })
  lprEvent(@Body() dto: LprEventDto) { return this.svc.lprEvent(dto); }

  @Get()
  @Roles(Role.ADMIN, Role.SECURITY)
  @ApiOperation({ summary: 'Listar cámaras' })
  list(@Query('campus_id') campus_id?: string) { return this.svc.list(campus_id); }

  @Get(':id')
  @Roles(Role.ADMIN, Role.SECURITY)
  @ApiOperation({ summary: 'Detalle de cámara' })
  findOne(@Param('id') id: string) { return this.svc.findOne(id); }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Registrar cámara' })
  create(@Body() dto: CreateCameraDto) { return this.svc.create(dto); }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Actualizar cámara' })
  update(@Param('id') id: string, @Body() dto: UpdateCameraDto) { return this.svc.update(id, dto); }

  @Post(':id/facial-recognition')
  @Roles(Role.ADMIN, Role.SECURITY)
  @ApiOperation({ summary: 'Reconocimiento facial (stub)' })
  facialRecognition(@Param('id') id: string, @Body('image_data') image_data: string) {
    return this.svc.facialRecognition(id, image_data);
  }
}
