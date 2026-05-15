import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ResponseDto } from '../common/dto/response.dto';
import { Zone, SpaceStatus } from '@prisma/client';

@Injectable()
export class ParkingSpacesService {
  constructor(private prisma: PrismaService) {}

  async list(zone?: Zone, type?: string, status?: SpaceStatus, campus_id?: string) {
    const where: any = {};
    if (zone) where.zone = zone;
    if (type) where.type = type;
    if (status) where.status = status;
    if (campus_id) where.campus_id = campus_id;

    const spaces = await this.prisma.parkingSpace.findMany({
      where,
      include: { campus: true, sessions: { where: { status: "ACTIVE" }, take: 1, include: { vehicle: true } } },
      orderBy: [{ zone: 'asc' }, { code: 'asc' }],
    });
    return ResponseDto.ok(spaces);
  }

  async getAvailable(zone?: Zone, type?: string, campus_id?: string) {
    const where: any = { status: 'AVAILABLE', is_active: true };
    if (zone) where.zone = zone;
    if (type) where.type = type;
    if (campus_id) where.campus_id = campus_id;

    const spaces = await this.prisma.parkingSpace.findMany({
      where,
      orderBy: [{ zone: 'asc' }, { code: 'asc' }],
    });
    return ResponseDto.ok({ count: spaces.length, spaces });
  }

  async getStatus(campus_id?: string) {
    const where: any = {};
    if (campus_id) where.campus_id = campus_id;

    const [total, available, occupied, reserved, maintenance] = await Promise.all([
      this.prisma.parkingSpace.count({ where: { ...where, is_active: true } }),
      this.prisma.parkingSpace.count({ where: { ...where, status: 'AVAILABLE', is_active: true } }),
      this.prisma.parkingSpace.count({ where: { ...where, status: 'OCCUPIED' } }),
      this.prisma.parkingSpace.count({ where: { ...where, status: 'RESERVED' } }),
      this.prisma.parkingSpace.count({ where: { ...where, status: 'MAINTENANCE' } }),
    ]);

    const byZone = await this.prisma.parkingSpace.groupBy({
      by: ['zone', 'status'],
      where,
      _count: true,
    });

    const zoneStats: Record<string, any> = {};
    for (const row of byZone) {
      if (!zoneStats[row.zone]) zoneStats[row.zone] = { total: 0, available: 0, occupied: 0 };
      zoneStats[row.zone][row.status.toLowerCase()] = row._count;
      zoneStats[row.zone].total += row._count;
    }

    return ResponseDto.ok({ total, available, occupied, reserved, maintenance, occupancy_rate: total > 0 ? Math.round((occupied / total) * 100) : 0, by_zone: zoneStats });
  }

  async getMapByZone(campus_id: string, zone: Zone) {
    const spaces = await this.prisma.parkingSpace.findMany({
      where: { campus_id, zone },
      include: { sessions: { where: { status: 'ACTIVE' }, take: 1, include: { vehicle: { select: { placa: true, color: true, brand: true } } } } },
      orderBy: { code: 'asc' },
    });
    return ResponseDto.ok({ zone, spaces });
  }

  async findOne(id: string) {
    const space = await this.prisma.parkingSpace.findUnique({
      where: { id },
      include: { campus: true, sessions: { where: { status: 'ACTIVE' }, take: 1, include: { vehicle: true, user: { select: { id: true, first_name: true, last_name: true } } } } },
    });
    if (!space) throw new NotFoundException('Espacio no encontrado');
    return ResponseDto.ok(space);
  }

  async create(dto: any) {
    const exists = await this.prisma.parkingSpace.findUnique({ where: { code: dto.code } });
    if (exists) throw new ConflictException('Código de espacio ya existe');
    const space = await this.prisma.parkingSpace.create({ data: dto });
    return ResponseDto.created(space, 'Espacio creado');
  }

  async update(id: string, dto: any) {
    await this.findOne(id);
    const space = await this.prisma.parkingSpace.update({ where: { id }, data: dto });
    return ResponseDto.ok(space, 'Espacio actualizado');
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.parkingSpace.delete({ where: { id } });
    return ResponseDto.ok(null, 'Espacio eliminado');
  }

  async sensorUpdate(dto: any, emitFn?: Function) {
    const space = await this.prisma.parkingSpace.findUnique({ where: { code: dto.space_code } });
    if (!space) throw new NotFoundException('Espacio no encontrado');

    const newStatus: SpaceStatus = dto.status === 'OCCUPIED' ? SpaceStatus.OCCUPIED : SpaceStatus.AVAILABLE;
    const updated = await this.prisma.parkingSpace.update({
      where: { id: space.id },
      data: { status: newStatus, last_sensor_update: new Date() },
    });

    if (emitFn) {
      emitFn('space:status-update', { space_id: space.id, code: space.code, zone: space.zone, status: newStatus, timestamp: new Date() });
    }

    return ResponseDto.ok(updated, 'Estado actualizado por sensor');
  }

  async updatePosition(id: string, dto: any) {
    await this.findOne(id);
    const space = await this.prisma.parkingSpace.update({ where: { id }, data: { lat: dto.lat, lng: dto.lng } });
    return ResponseDto.ok(space, 'Posición actualizada');
  }
}
