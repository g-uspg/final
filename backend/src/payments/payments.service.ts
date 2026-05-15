import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ResponseDto } from '../common/dto/response.dto';
import { PaymentStatus } from '@prisma/client';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: any, user_id: string) {
    const session = await this.prisma.parkingSession.findUnique({
      where: { id: dto.session_id },
      include: { payment: true },
    });
    if (!session) throw new NotFoundException('Sesión no encontrada');
    if (session.payment) throw new BadRequestException('Ya existe un pago para esta sesión');
    if (session.status === 'ACTIVE') throw new BadRequestException('La sesión aún está activa');

    const payment = await this.prisma.payment.create({
      data: {
        session_id: dto.session_id,
        user_id,
        amount: session.amount_due ?? 0,
        payment_method: dto.payment_method,
        transaction_reference: dto.transaction_reference,
        status: PaymentStatus.PENDING,
      },
    });

    return ResponseDto.created(payment, 'Pago creado');
  }

  async confirm(id: string, dto: any) {
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment) throw new NotFoundException('Pago no encontrado');
    if (payment.status !== 'PENDING') throw new BadRequestException('Solo se pueden confirmar pagos pendientes');

    const [updated] = await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id },
        data: { status: PaymentStatus.COMPLETED, transaction_reference: dto.transaction_reference, paid_at: new Date() },
      }),
      this.prisma.parkingSession.update({
        where: { id: payment.session_id },
        data: { is_paid: true },
      }),
    ]);

    return ResponseDto.ok(updated, 'Pago confirmado');
  }

  async getBySession(session_id: string) {
    const session = await this.prisma.parkingSession.findUnique({
      where: { id: session_id },
      include: { payment: true },
    });
    if (!session) throw new NotFoundException('Sesión no encontrada');
    return ResponseDto.ok({ session_id, is_paid: session.is_paid, amount_due: session.amount_due, payment: session.payment });
  }

  async getHistory(page = 1, limit = 20, user_id?: string, status?: string) {
    const where: any = {};
    if (user_id) where.user_id = user_id;
    if (status) where.status = status;

    const [total, data] = await Promise.all([
      this.prisma.payment.count({ where }),
      this.prisma.payment.findMany({
        where, skip: (page - 1) * limit, take: limit,
        include: { session: { include: { vehicle: true, space: true } }, user: { select: { id: true, first_name: true, last_name: true } } },
        orderBy: { created_at: 'desc' },
      }),
    ]);
    return ResponseDto.ok({ total, page, limit, data });
  }

  async getAll(page = 1, limit = 20, status?: string) {
    const where: any = {};
    if (status) where.status = status;
    const [total, data] = await Promise.all([
      this.prisma.payment.count({ where }),
      this.prisma.payment.findMany({
        where, skip: (page - 1) * limit, take: limit,
        include: { session: { include: { vehicle: true, space: true } }, user: { select: { id: true, first_name: true, last_name: true, email: true } } },
        orderBy: { created_at: 'desc' },
      }),
    ]);
    return ResponseDto.ok({ total, page, limit, data });
  }

  async refund(id: string, dto: any) {
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment) throw new NotFoundException('Pago no encontrado');
    if (payment.status !== 'COMPLETED') throw new BadRequestException('Solo se pueden reembolsar pagos completados');

    const updated = await this.prisma.payment.update({
      where: { id },
      data: { status: PaymentStatus.REFUNDED },
    });

    return ResponseDto.ok(updated, 'Pago reembolsado');
  }
}
