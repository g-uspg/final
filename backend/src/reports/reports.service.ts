import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ResponseDto } from '../common/dto/response.dto';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getDaily(date?: string) {
    const target = date ? new Date(date) : new Date();
    const start = new Date(target); start.setHours(0, 0, 0, 0);
    const end = new Date(target); end.setHours(23, 59, 59, 999);

    const [total_sessions, completed_sessions, revenue, avg_duration] = await Promise.all([
      this.prisma.parkingSession.count({ where: { entry_time: { gte: start, lte: end } } }),
      this.prisma.parkingSession.count({ where: { entry_time: { gte: start, lte: end }, status: 'COMPLETED' } }),
      this.prisma.payment.aggregate({ where: { created_at: { gte: start, lte: end }, status: 'COMPLETED' }, _sum: { amount: true } }),
      this.prisma.parkingSession.aggregate({ where: { entry_time: { gte: start, lte: end }, duration_minutes: { not: null } }, _avg: { duration_minutes: true } }),
    ]);

    return ResponseDto.ok({ date: target.toISOString().split('T')[0], total_sessions, completed_sessions, revenue: revenue._sum.amount ?? 0, avg_duration_minutes: Math.round(avg_duration._avg.duration_minutes ?? 0) });
  }

  async getMonthly(year?: number, month?: number) {
    const now = new Date();
    const y = year ?? now.getFullYear();
    const m = (month ?? now.getMonth() + 1) - 1;
    const start = new Date(y, m, 1);
    const end = new Date(y, m + 1, 0, 23, 59, 59, 999);

    const sessions = await this.prisma.parkingSession.findMany({
      where: { entry_time: { gte: start, lte: end } },
      select: { entry_time: true, duration_minutes: true, amount_due: true, is_paid: true, status: true },
    });

    const revenue = await this.prisma.payment.aggregate({
      where: { created_at: { gte: start, lte: end }, status: 'COMPLETED' },
      _sum: { amount: true },
    });

    const dailyMap: Record<string, number> = {};
    for (const s of sessions) {
      const day = s.entry_time.toISOString().split('T')[0];
      dailyMap[day] = (dailyMap[day] ?? 0) + 1;
    }

    return ResponseDto.ok({ year: y, month: m + 1, total_sessions: sessions.length, revenue: revenue._sum.amount ?? 0, daily_breakdown: dailyMap });
  }

  async getRevenue(from?: string, to?: string) {
    const start = from ? new Date(from) : new Date(Date.now() - 30 * 86400000);
    const end = to ? new Date(to) : new Date();

    const payments = await this.prisma.payment.findMany({
      where: { created_at: { gte: start, lte: end }, status: 'COMPLETED' },
      select: { amount: true, payment_method: true, created_at: true },
    });

    const total = payments.reduce((s, p) => s + Number(p.amount), 0);
    const byMethod: Record<string, number> = {};
    for (const p of payments) {
      byMethod[p.payment_method] = (byMethod[p.payment_method] ?? 0) + Number(p.amount);
    }

    return ResponseDto.ok({ from: start, to: end, total_revenue: parseFloat(total.toFixed(2)), by_method: byMethod, transaction_count: payments.length });
  }

  async getOccupancy(from?: string, to?: string) {
    const start = from ? new Date(from) : new Date(Date.now() - 7 * 86400000);
    const end = to ? new Date(to) : new Date();
    const total_spaces = await this.prisma.parkingSpace.count({ where: { is_active: true } });
    const sessions = await this.prisma.parkingSession.count({ where: { entry_time: { gte: start, lte: end } } });

    return ResponseDto.ok({ from: start, to: end, total_spaces, total_sessions: sessions, avg_daily_sessions: Math.round(sessions / Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000))) });
  }

  async getTopUsers(limit = 10) {
    const users = await this.prisma.parkingSession.groupBy({
      by: ['user_id'],
      _count: { id: true },
      _sum: { amount_due: true },
      orderBy: { _count: { id: 'desc' } },
      take: limit,
    });

    const detailed = await Promise.all(users.map(async (u) => {
      const user = await this.prisma.user.findUnique({ where: { id: u.user_id! }, select: { id: true, first_name: true, last_name: true, email: true, role: true } });
      return { user, session_count: u._count.id, total_spent: u._sum.amount_due ?? 0 };
    }));

    return ResponseDto.ok(detailed);
  }

  async getPrediction() {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const peak_hours = [7, 8, 9, 12, 13, 17, 18, 19];
    const is_peak = peak_hours.includes(hour);

    const total_spaces = await this.prisma.parkingSpace.count({ where: { is_active: true } });
    const current_occupancy = await this.prisma.parkingSpace.count({ where: { status: 'OCCUPIED' } });
    const occupancy_rate = total_spaces > 0 ? current_occupancy / total_spaces : 0;

    let predicted_next_hour = Math.round(occupancy_rate * total_spaces);
    if (is_peak && !isWeekend) predicted_next_hour = Math.min(total_spaces, Math.round(predicted_next_hour * 1.2));
    if (isWeekend) predicted_next_hour = Math.round(predicted_next_hour * 0.7);

    return ResponseDto.ok({
      current_occupancy, total_spaces, occupancy_rate: parseFloat((occupancy_rate * 100).toFixed(1)),
      is_peak_hour: is_peak, is_weekend: isWeekend,
      predicted_next_hour, predicted_occupancy_rate: parseFloat(((predicted_next_hour / total_spaces) * 100).toFixed(1)),
      recommendation: occupancy_rate > 0.85 ? 'ALTA_DEMANDA' : occupancy_rate > 0.6 ? 'DEMANDA_MODERADA' : 'BAJA_DEMANDA',
    });
  }

  async export(type: string, from?: string, to?: string) {
    const start = from ? new Date(from) : new Date(Date.now() - 30 * 86400000);
    const end = to ? new Date(to) : new Date();

    if (type === 'sessions') {
      const data = await this.prisma.parkingSession.findMany({
        where: { entry_time: { gte: start, lte: end } },
        include: { vehicle: true, space: true, user: { select: { first_name: true, last_name: true, email: true } } },
        orderBy: { entry_time: 'desc' },
      });
      return ResponseDto.ok({ type, from: start, to: end, count: data.length, data });
    }

    if (type === 'payments') {
      const data = await this.prisma.payment.findMany({
        where: { created_at: { gte: start, lte: end } },
        include: { user: { select: { first_name: true, last_name: true, email: true } } },
        orderBy: { created_at: 'desc' },
      });
      return ResponseDto.ok({ type, from: start, to: end, count: data.length, data });
    }

    return ResponseDto.error('Tipo de exportación no soportado', 400);
  }
}
