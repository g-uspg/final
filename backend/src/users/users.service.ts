import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as QRCode from 'qrcode';
import { v4 as uuid } from 'uuid';
import { ResponseDto } from '../common/dto/response.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  private async generateQR(userId: string): Promise<{ qr_code: string; qr_image: string }> {
    const qr_code = `USP-QR-${uuid()}-${Date.now()}`;
    const qr_image = await QRCode.toDataURL(qr_code);
    return { qr_code, qr_image };
  }

  private sanitize(user: any) {
    const { password_hash, ...data } = user;
    return data;
  }

  async list(pagina = 1, limite = 20, role?: Role, is_active?: boolean) {
    const where: any = { deleted_at: null };
    if (role) where.role = role;
    if (is_active !== undefined) where.is_active = is_active;

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where, skip: (pagina - 1) * limite, take: limite,
        select: {
          id: true, email: true, first_name: true, last_name: true,
          role: true, carnet: true, phone: true, is_active: true,
          last_login_at: true, created_at: true,
        },
        orderBy: { created_at: 'desc' },
      }),
    ]);
    return ResponseDto.ok({ total, page: pagina, limit: limite, data: users });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findFirst({ where: { id, deleted_at: null } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return ResponseDto.ok(this.sanitize(user));
  }

  async create(dto: any) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('El correo ya está registrado');

    const password_hash = await bcrypt.hash(dto.password, 12);
    const { qr_code } = await this.generateQR('new');

    const { password, ...rest } = dto;
    const user = await this.prisma.user.create({
      data: { ...rest, password_hash, qr_code },
    });
    return ResponseDto.created(this.sanitize(user), 'Usuario creado');
  }

  async update(id: string, dto: any) {
    await this.findOne(id);
    const { password, ...rest } = dto;
    const data: any = { ...rest };
    if (password) data.password_hash = await bcrypt.hash(password, 12);
    const user = await this.prisma.user.update({ where: { id }, data });
    return ResponseDto.ok(this.sanitize(user), 'Usuario actualizado');
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.user.update({ where: { id }, data: { deleted_at: new Date(), is_active: false } });
    return ResponseDto.ok(null, 'Usuario eliminado');
  }

  async regenerateQR(id: string) {
    await this.findOne(id);
    const { qr_code, qr_image } = await this.generateQR(id);
    await this.prisma.user.update({ where: { id }, data: { qr_code } });
    return ResponseDto.ok({ qr_code, qr_image }, 'QR regenerado');
  }

  async assignNfc(id: string, nfc_card_id: string) {
    const existing = await this.prisma.user.findUnique({ where: { nfc_card_id } });
    if (existing && existing.id !== id) throw new ConflictException('NFC ya asignada a otro usuario');
    await this.prisma.user.update({ where: { id }, data: { nfc_card_id } });
    return ResponseDto.ok(null, 'NFC asignada');
  }

  async toggleActive(id: string) {
    const user = await this.prisma.user.findFirst({ where: { id, deleted_at: null } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    const updated = await this.prisma.user.update({ where: { id }, data: { is_active: !user.is_active } });
    return ResponseDto.ok({ is_active: updated.is_active }, `Usuario ${updated.is_active ? 'activado' : 'desactivado'}`);
  }

  async getVehicles(id: string) {
    await this.findOne(id);
    const vehicles = await this.prisma.vehicle.findMany({ where: { user_id: id, deleted_at: null } });
    return ResponseDto.ok(vehicles);
  }

  async getSessions(id: string, pagina = 1, limite = 20) {
    await this.findOne(id);
    const [total, sessions] = await Promise.all([
      this.prisma.parkingSession.count({ where: { user_id: id } }),
      this.prisma.parkingSession.findMany({
        where: { user_id: id },
        skip: (pagina - 1) * limite, take: limite,
        include: { space: true, vehicle: true, payment: true },
        orderBy: { entry_time: 'desc' },
      }),
    ]);
    return ResponseDto.ok({ total, page: pagina, limit: limite, data: sessions });
  }
}
