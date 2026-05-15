import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ResponseDto } from '../common/dto/response.dto';

const CAMPUS_CONFIG = {
  name: 'USPG Campus Central',
  lat: 14.5847,
  lng: -90.5085,
  zoom: 18,
  zones: ['A', 'B', 'C', 'D'],
};

@Injectable()
export class MapService {
  constructor(private prisma: PrismaService) {}

  async getCampusData(campus_id?: string) {
    if (campus_id) {
      const campus = await this.prisma.campus.findUnique({ where: { id: campus_id } });
      if (!campus) throw new NotFoundException('Campus no encontrado');
      return ResponseDto.ok(campus);
    }
    const campuses = await this.prisma.campus.findMany();
    return ResponseDto.ok({ config: CAMPUS_CONFIG, campuses });
  }

  async getZoneLayout(zone: string, campus_id?: string) {
    const where: any = { zone };
    if (campus_id) where.campus_id = campus_id;

    const spaces = await this.prisma.parkingSpace.findMany({
      where,
      include: { sessions: { where: { status: 'ACTIVE' }, take: 1, include: { vehicle: { select: { placa: true, color: true, brand: true } } } } },
      orderBy: { code: 'asc' },
    });

    const stats = { total: spaces.length, available: 0, occupied: 0, reserved: 0, maintenance: 0 };
    for (const s of spaces) {
      if (s.status === 'AVAILABLE') stats.available++;
      else if (s.status === 'OCCUPIED') stats.occupied++;
      else if (s.status === 'RESERVED') stats.reserved++;
      else if (s.status === 'MAINTENANCE') stats.maintenance++;
    }

    return ResponseDto.ok({ zone, stats, spaces });
  }

  async getRealtimeSnapshot(campus_id?: string) {
    const where: any = {};
    if (campus_id) where.campus_id = campus_id;

    const [spaces, active_sessions, active_barriers] = await Promise.all([
      this.prisma.parkingSpace.findMany({ where, select: { id: true, code: true, zone: true, status: true, lat: true, lng: true } }),
      this.prisma.parkingSession.count({ where: { status: 'ACTIVE' } }),
      0,
    ]);

    const by_zone: Record<string, { total: number; available: number; occupied: number }> = {};
    for (const s of spaces) {
      if (!by_zone[s.zone]) by_zone[s.zone] = { total: 0, available: 0, occupied: 0 };
      by_zone[s.zone].total++;
      if (s.status === 'AVAILABLE') by_zone[s.zone].available++;
      else if (s.status === 'OCCUPIED') by_zone[s.zone].occupied++;
    }

    return ResponseDto.ok({ timestamp: new Date(), total_spaces: spaces.length, active_sessions, by_zone, spaces });
  }

  async updateSpacePosition(space_id: string, lat: number, lng: number) {
    const space = await this.prisma.parkingSpace.findUnique({ where: { id: space_id } });
    if (!space) throw new NotFoundException('Espacio no encontrado');
    const updated = await this.prisma.parkingSpace.update({ where: { id: space_id }, data: { lat, lng } });
    return ResponseDto.ok(updated, 'Posición actualizada');
  }
}
