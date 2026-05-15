import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ResponseDto } from '../common/dto/response.dto';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ReservationStatus, ReservationType } from '@prisma/client';

@Injectable()
export class ReservationsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: any, user_id: string) {
    const start = new Date(dto.start_time);
    const end = new Date(dto.end_time);
    if (end <= start) throw new BadRequestException('La hora de fin debe ser posterior al inicio');
    if (start < new Date()) throw new BadRequestException('No se puede reservar en el pasado');

    const space = await this.prisma.parkingSpace.findUnique({ where: { id: dto.space_id } });
    if (!space) throw new NotFoundException('Espacio no encontrado');
    if (!space.is_active) throw new BadRequestException('Espacio inactivo');

    const conflict = await this.prisma.reservation.findFirst({
      where: {
        space_id: dto.space_id,
        status: { in: ['PENDING', 'CONFIRMED'] },
        OR: [
          { start_time: { lt: end }, end_time: { gt: start } },
        ],
      },
    });
    if (conflict) throw new ConflictException('Espacio ya reservado en ese horario');

    const vehicle = await this.prisma.vehicle.findFirst({ where: { id: dto.vehicle_id, deleted_at: null } });
    if (!vehicle) throw new NotFoundException('Vehículo no encontrado');

    const reservation = await this.prisma.reservation.create({
      data: {
        user_id,
        vehicle_id: dto.vehicle_id,
        space_id: dto.space_id,
        start_time: start,
        end_time: end,
        type: dto.type ?? ReservationType.STANDARD,
        notes: dto.notes,
        status: ReservationStatus.CONFIRMED,
      },
      include: { space: true, vehicle: true },
    });

    await this.prisma.parkingSpace.update({ where: { id: dto.space_id }, data: { status: 'RESERVED' } });

    return ResponseDto.created(reservation, 'Reserva creada');
  }

  async getMy(user_id: string, page = 1, limit = 20) {
    const where = { user_id };
    const [total, data] = await Promise.all([
      this.prisma.reservation.count({ where }),
      this.prisma.reservation.findMany({
        where, skip: (page - 1) * limit, take: limit,
        include: { space: true, vehicle: true },
        orderBy: { start_time: 'desc' },
      }),
    ]);
    return ResponseDto.ok({ total, page, limit, data });
  }

  async getActive(user_id: string) {
    const reservations = await this.prisma.reservation.findMany({
      where: { user_id, status: { in: ['PENDING', 'CONFIRMED'] }, end_time: { gt: new Date() } },
      include: { space: true, vehicle: true },
      orderBy: { start_time: 'asc' },
    });
    return ResponseDto.ok(reservations);
  }

  async findOne(id: string) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      include: { space: true, vehicle: true, user: { select: { id: true, first_name: true, last_name: true, email: true } } },
    });
    if (!reservation) throw new NotFoundException('Reserva no encontrada');
    return ResponseDto.ok(reservation);
  }

  async cancel(id: string, user_id: string) {
    const reservation = await this.prisma.reservation.findUnique({ where: { id } });
    if (!reservation) throw new NotFoundException('Reserva no encontrada');
    if (reservation.user_id !== user_id) throw new BadRequestException('No autorizado');
    if (!['PENDING', 'CONFIRMED'].includes(reservation.status)) throw new BadRequestException('La reserva no puede cancelarse');

    await this.prisma.$transaction([
      this.prisma.reservation.update({ where: { id }, data: { status: ReservationStatus.CANCELLED } }),
      this.prisma.parkingSpace.update({ where: { id: reservation.space_id }, data: { status: 'AVAILABLE' } }),
    ]);

    return ResponseDto.ok(null, 'Reserva cancelada');
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async autoExpire() {
    const expired = await this.prisma.reservation.findMany({
      where: { status: { in: ['PENDING', 'CONFIRMED'] }, end_time: { lt: new Date() } },
    });

    for (const r of expired) {
      await this.prisma.$transaction([
        this.prisma.reservation.update({ where: { id: r.id }, data: { status: ReservationStatus.EXPIRED } }),
        this.prisma.parkingSpace.update({ where: { id: r.space_id }, data: { status: 'AVAILABLE' } }),
      ]);
    }
  }
}
