import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ResponseDto } from '../common/dto/response.dto';
import { EntryMethod } from '@prisma/client';

@Injectable()
export class ParkingSessionsService {
  constructor(private prisma: PrismaService) {}

  async entry(dto: any, emitFn?: Function) {
    const vehicle = await this.prisma.vehicle.findFirst({ where: { id: dto.vehicle_id, deleted_at: null } });
    if (!vehicle) throw new NotFoundException('Vehículo no encontrado');
    if (vehicle.blacklisted) throw new BadRequestException('Vehículo en lista negra');

    const space = await this.prisma.parkingSpace.findUnique({ where: { id: dto.space_id } });
    if (!space) throw new NotFoundException('Espacio no encontrado');
    if (space.status !== 'AVAILABLE') throw new BadRequestException('Espacio no disponible');

    const existing = await this.prisma.parkingSession.findFirst({
      where: { vehicle_id: dto.vehicle_id, status: 'ACTIVE' },
    });
    if (existing) throw new BadRequestException('El vehículo ya tiene una sesión activa');

    const [session] = await this.prisma.$transaction([
      this.prisma.parkingSession.create({
        data: {
          vehicle_id: dto.vehicle_id,
          space_id: dto.space_id,
          user_id: vehicle.user_id,
          entry_method: dto.entry_method ?? EntryMethod.MANUAL,
          operator_entry_id: dto.operator_id,
          status: 'ACTIVE',
        },
        include: { vehicle: true, space: true, user: { select: { id: true, first_name: true, last_name: true } } },
      }),
      this.prisma.parkingSpace.update({ where: { id: dto.space_id }, data: { status: 'OCCUPIED' } }),
    ]);

    if (emitFn) {
      emitFn('session:started', { session_id: session.id, vehicle: vehicle.placa, space: space.code, timestamp: new Date() });
    }

    return ResponseDto.created(session, 'Entrada registrada');
  }

  async exit(id: string, dto: any, emitFn?: Function) {
    const session = await this.prisma.parkingSession.findFirst({
      where: { id, status: 'ACTIVE' },
      include: { vehicle: true, space: true },
    });
    if (!session) throw new NotFoundException('Sesión activa no encontrada');

    const exit_time = new Date();
    const duration_minutes = Math.ceil((exit_time.getTime() - session.entry_time.getTime()) / 60000);
    const hourly_rate = 5.0;
    const amount_due = parseFloat(((duration_minutes / 60) * hourly_rate).toFixed(2));

    const [updated] = await this.prisma.$transaction([
      this.prisma.parkingSession.update({
        where: { id },
        data: { exit_time, duration_minutes, amount_due, status: 'COMPLETED', operator_exit_id: dto?.operator_id },
        include: { vehicle: true, space: true },
      }),
      this.prisma.parkingSpace.update({ where: { id: session.space_id }, data: { status: 'AVAILABLE' } }),
    ]);

    if (emitFn) {
      emitFn('session:ended', { session_id: id, vehicle: session.vehicle.placa, space: session.space.code, duration_minutes, amount_due, timestamp: exit_time });
    }

    return ResponseDto.ok(updated, 'Salida registrada');
  }

  async getActive(campus_id?: string) {
    const sessions = await this.prisma.parkingSession.findMany({
      where: { status: 'ACTIVE' },
      include: {
        vehicle: true,
        space: true,
        user: { select: { id: true, first_name: true, last_name: true, role: true } },
      },
      orderBy: { entry_time: 'asc' },
    });
    return ResponseDto.ok({ count: sessions.length, sessions });
  }

  async getHistory(page = 1, limit = 20, vehicle_id?: string, user_id?: string, from?: string, to?: string) {
    const where: any = { status: { not: 'ACTIVE' } };
    if (vehicle_id) where.vehicle_id = vehicle_id;
    if (user_id) where.user_id = user_id;
    if (from || to) {
      where.entry_time = {};
      if (from) where.entry_time.gte = new Date(from);
      if (to) where.entry_time.lte = new Date(to);
    }

    const [total, sessions] = await Promise.all([
      this.prisma.parkingSession.count({ where }),
      this.prisma.parkingSession.findMany({
        where, skip: (page - 1) * limit, take: limit,
        include: { vehicle: true, space: true, user: { select: { id: true, first_name: true, last_name: true } } },
        orderBy: { entry_time: 'desc' },
      }),
    ]);
    return ResponseDto.ok({ total, page, limit, data: sessions });
  }

  async findOne(id: string) {
    const session = await this.prisma.parkingSession.findUnique({
      where: { id },
      include: {
        vehicle: true, space: true,
        user: { select: { id: true, first_name: true, last_name: true, email: true } },
        payment: true,
      },
    });
    if (!session) throw new NotFoundException('Sesión no encontrada');
    return ResponseDto.ok(session);
  }

  async getTicket(id: string) {
    const session = await this.prisma.parkingSession.findUnique({
      where: { id },
      include: { vehicle: true, space: { include: { campus: true } }, user: { select: { first_name: true, last_name: true } }, payment: true },
    });
    if (!session) throw new NotFoundException('Sesión no encontrada');

    return ResponseDto.ok({
      ticket_number: `TKT-${session.id.slice(0, 8).toUpperCase()}`,
      entry_time: session.entry_time,
      exit_time: session.exit_time,
      duration_minutes: session.duration_minutes,
      amount_due: session.amount_due,
      paid: session.is_paid,
      vehicle: { placa: session.vehicle.placa, brand: session.vehicle.brand, color: session.vehicle.color },
      space: { code: session.space.code, zone: session.space.zone, campus: session.space.campus?.name },
      user: session.user,
    });
  }

  async getMySessions(user_id: string, page = 1, limit = 20) {
    const where = { user_id };
    const [total, sessions] = await Promise.all([
      this.prisma.parkingSession.count({ where }),
      this.prisma.parkingSession.findMany({
        where, skip: (page - 1) * limit, take: limit,
        include: { vehicle: true, space: true, payment: true },
        orderBy: { entry_time: 'desc' },
      }),
    ]);
    return ResponseDto.ok({ total, page, limit, data: sessions });
  }
}
