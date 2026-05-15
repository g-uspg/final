import { Injectable, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ResponseDto } from '../common/dto/response.dto';
import * as QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class QrAccessService {
  constructor(private prisma: PrismaService) {}

  async scan(dto: any, emitFn?: Function) {
    const { qr_code, space_id, operator_id } = dto;

    const user = await this.prisma.user.findFirst({
      where: { qr_code, deleted_at: null, is_active: true },
      include: { vehicles: { where: { deleted_at: null, is_authorized: true } } },
    });

    if (user) {
      if (emitFn) emitFn('qr:scanned', { type: 'USER', user_id: user.id, name: `${user.first_name} ${user.last_name}`, timestamp: new Date() });
      return ResponseDto.ok({ type: 'USER', valid: true, user: { id: user.id, name: `${user.first_name} ${user.last_name}`, role: user.role }, vehicles: user.vehicles });
    }

    const visitorQr = await this.prisma.visitorQR.findFirst({
      where: { qr_code, is_used: false, expires_at: { gt: new Date() } },
    });

    if (visitorQr) {
      await this.prisma.visitorQR.update({ where: { id: visitorQr.id }, data: { is_used: true, used_at: new Date() } });
      if (emitFn) emitFn('qr:scanned', { type: 'VISITOR', visitor_name: visitorQr.visitor_name, timestamp: new Date() });
      return ResponseDto.ok({ type: 'VISITOR', valid: true, visitor: { name: visitorQr.visitor_name, plate: visitorQr.vehicle_plate, purpose: visitorQr.purpose } });
    }

    throw new UnauthorizedException('QR inválido o expirado');
  }

  async generateVisitorQr(dto: any, generatedByUserId: string) {
    const valid_hours = dto.valid_hours ?? 24;
    const qr_code = `VIS-${uuidv4()}`;
    const expires_at = new Date(Date.now() + valid_hours * 3600 * 1000);

    const qr_image = await QRCode.toDataURL(qr_code, { width: 300, margin: 2 });

    const visitor = await this.prisma.visitorQR.create({
      data: {
        qr_code,
        visitor_name: dto.visitor_name,
        vehicle_plate: dto.vehicle_plate.toUpperCase(),
        purpose: dto.purpose,
        expires_at,
        generated_by_user_id: generatedByUserId,
      },
    });

    return ResponseDto.created({ ...visitor, qr_image }, 'QR de visitante generado');
  }

  async regenerate(user_id: string) {
    const user = await this.prisma.user.findFirst({ where: { id: user_id, deleted_at: null } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const new_qr_code = uuidv4();
    const qr_image = await QRCode.toDataURL(new_qr_code, { width: 300, margin: 2 });

    await this.prisma.user.update({ where: { id: user_id }, data: { qr_code: new_qr_code } });

    return ResponseDto.ok({ qr_code: new_qr_code, qr_image }, 'QR regenerado');
  }

  async validate(qr_code: string) {
    const user = await this.prisma.user.findFirst({ where: { qr_code, deleted_at: null, is_active: true } });
    if (user) return ResponseDto.ok({ valid: true, type: 'USER', name: `${user.first_name} ${user.last_name}`, role: user.role });

    const visitor = await this.prisma.visitorQR.findFirst({
      where: { qr_code, is_used: false, expires_at: { gt: new Date() } },
    });
    if (visitor) return ResponseDto.ok({ valid: true, type: 'VISITOR', visitor_name: visitor.visitor_name, expires_at: visitor.expires_at });

    return ResponseDto.ok({ valid: false });
  }

  async listVisitorQrs(page = 1, limit = 20) {
    const [total, data] = await Promise.all([
      this.prisma.visitorQR.count(),
      this.prisma.visitorQR.findMany({
        skip: (page - 1) * limit, take: limit,
        include: { generated_by: { select: { id: true, first_name: true, last_name: true } } },
        orderBy: { created_at: 'desc' },
      }),
    ]);
    return ResponseDto.ok({ total, page, limit, data });
  }
}
