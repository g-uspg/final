import { Controller, Get, Post, Body, Param, Query, UseGuards, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { QrAccessService } from './qr-access.service';
import { ScanQrDto, GenerateVisitorQrDto } from './qr-access.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('qr-access')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('qr-access')
export class QrAccessController {
  constructor(private svc: QrAccessService) {}

  @Post('scan')
  @Roles(Role.ADMIN, Role.SECURITY)
  @ApiOperation({ summary: 'Escanear QR' })
  scan(@Body() dto: ScanQrDto) { return this.svc.scan(dto); }

  @Post('generate-visitor')
  @Roles(Role.ADMIN, Role.SECURITY)
  @ApiOperation({ summary: 'Generar QR para visitante' })
  generateVisitor(@Body() dto: GenerateVisitorQrDto, @CurrentUser() user: any) {
    return this.svc.generateVisitorQr(dto, user.id);
  }

  @Post('regenerate/:user_id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Regenerar QR de usuario' })
  regenerate(@Param('user_id') user_id: string) { return this.svc.regenerate(user_id); }

  @Get('validate')
  @ApiOperation({ summary: 'Validar QR' })
  validate(@Query('qr_code') qr_code: string) { return this.svc.validate(qr_code); }

  @Get('visitor-qrs')
  @Roles(Role.ADMIN, Role.SECURITY)
  @ApiOperation({ summary: 'Listar QRs de visitantes' })
  listVisitorQrs(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) { return this.svc.listVisitorQrs(page, limit); }
}
