import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ResponseDto } from '../common/dto/response.dto';

@Injectable()
export class VehiclesService {
  constructor(private prisma: PrismaService) {}

  async list(page = 1, limit = 20, blacklisted?: boolean, search?: string) {
    const where: any = { deleted_at: null };
    if (blacklisted !== undefined) where.blacklisted = blacklisted;
    if (search) where.placa = { contains: search.toUpperCase() };

    const [total, vehicles] = await Promise.all([
      this.prisma.vehicle.count({ where }),
      this.prisma.vehicle.findMany({
        where, skip: (page - 1) * limit, take: limit,
        include: { user: { select: { id: true, first_name: true, last_name: true, email: true, role: true } } },
        orderBy: { created_at: 'desc' },
      }),
    ]);
    return ResponseDto.ok({ total, page, limit, data: vehicles });
  }

  async findOne(id: string) {
    const v = await this.prisma.vehicle.findFirst({
      where: { id, deleted_at: null },
      include: { user: { select: { id: true, first_name: true, last_name: true, email: true, role: true } } },
    });
    if (!v) throw new NotFoundException('Vehículo no encontrado');
    return ResponseDto.ok(v);
  }

  async searchByPlate(plate: string) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { placa: { contains: plate.toUpperCase() }, deleted_at: null },
      include: {
        user: { select: { id: true, first_name: true, last_name: true, email: true, role: true } },
        sessions: { where: { status: 'ACTIVE' }, take: 1, include: { space: true } },
      },
    });
    if (!vehicle) throw new NotFoundException('Vehículo no encontrado');
    return ResponseDto.ok({
      ...vehicle,
      active_session: vehicle.sessions[0] ?? null,
    });
  }

  async create(userId: string, dto: any) {
    const placa = dto.placa.toUpperCase().replace(/\s/g, '');
    const exists = await this.prisma.vehicle.findUnique({ where: { placa } });
    if (exists) throw new ConflictException('Placa ya registrada');

    const vehicle = await this.prisma.vehicle.create({
      data: { ...dto, placa, user_id: userId },
    });
    return ResponseDto.created(vehicle, 'Vehículo registrado');
  }

  async update(id: string, dto: any) {
    await this.findOne(id);
    const vehicle = await this.prisma.vehicle.update({ where: { id }, data: dto });
    return ResponseDto.ok(vehicle, 'Vehículo actualizado');
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.vehicle.update({ where: { id }, data: { deleted_at: new Date() } });
    return ResponseDto.ok(null, 'Vehículo eliminado');
  }

  async authorize(id: string) {
    await this.prisma.vehicle.update({ where: { id }, data: { is_authorized: true } });
    return ResponseDto.ok(null, 'Vehículo autorizado');
  }

  async unauthorize(id: string) {
    await this.prisma.vehicle.update({ where: { id }, data: { is_authorized: false } });
    return ResponseDto.ok(null, 'Vehículo desautorizado');
  }

  async addBlacklist(id: string, reason: string, addedByUserId: string, emitFn?: Function) {
    const vehicle = await this.prisma.vehicle.findFirst({ where: { id, deleted_at: null } });
    if (!vehicle) throw new NotFoundException('Vehículo no encontrado');

    await this.prisma.$transaction([
      this.prisma.vehicle.update({ where: { id }, data: { blacklisted: true, blacklist_reason: reason } }),
      this.prisma.blacklist.create({ data: { vehicle_id: id, reason, added_by_user_id: addedByUserId } }),
    ]);

    if (emitFn) emitFn('parking:alert', {
      type: 'BLACKLIST', message: `Vehículo ${vehicle.placa} agregado a lista negra`,
      metadata: { vehicle_id: id, placa: vehicle.placa, reason },
      severity: 'HIGH', timestamp: new Date(),
    });

    return ResponseDto.ok(null, 'Vehículo en lista negra');
  }

  async removeBlacklist(id: string, removedByUserId: string) {
    const entry = await this.prisma.blacklist.findFirst({
      where: { vehicle_id: id, is_active: true },
    });
    if (!entry) throw new NotFoundException('Entrada en blacklist no encontrada');

    await this.prisma.$transaction([
      this.prisma.blacklist.update({
        where: { id: entry.id },
        data: { is_active: false, removed_at: new Date(), removed_by_user_id: removedByUserId },
      }),
      this.prisma.vehicle.update({ where: { id }, data: { blacklisted: false, blacklist_reason: null } }),
    ]);

    return ResponseDto.ok(null, 'Vehículo removido de lista negra');
  }
}
