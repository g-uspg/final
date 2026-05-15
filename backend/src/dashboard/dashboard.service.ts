import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ResponseDto } from '../common/dto/response.dto';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const today_start = new Date(); today_start.setHours(0, 0, 0, 0);
    const today_end = new Date(); today_end.setHours(23, 59, 59, 999);

    const [total_spaces, available_spaces, occupied_spaces, active_sessions, today_entries, today_revenue, total_users, blacklisted_vehicles] = await Promise.all([
      this.prisma.parkingSpace.count({ where: { is_active: true } }),
      this.prisma.parkingSpace.count({ where: { status: 'AVAILABLE', is_active: true } }),
      this.prisma.parkingSpace.count({ where: { status: 'OCCUPIED' } }),
      this.prisma.parkingSession.count({ where: { status: 'ACTIVE' } }),
      this.prisma.parkingSession.count({ where: { entry_time: { gte: today_start, lte: today_end } } }),
      this.prisma.payment.aggregate({ where: { created_at: { gte: today_start, lte: today_end }, status: 'COMPLETED' }, _sum: { amount: true } }),
      this.prisma.user.count({ where: { deleted_at: null, is_active: true } }),
      this.prisma.vehicle.count({ where: { blacklisted: true, deleted_at: null } }),
    ]);

    const occupancy_rate = total_spaces > 0 ? parseFloat(((occupied_spaces / total_spaces) * 100).toFixed(1)) : 0;

    return ResponseDto.ok({
      spaces: { total: total_spaces, available: available_spaces, occupied: occupied_spaces, occupancy_rate },
      sessions: { active: active_sessions, today_entries },
      revenue: { today: today_revenue._sum.amount ?? 0 },
      users: { total: total_users },
      alerts: { blacklisted_vehicles },
    });
  }

  async getRecentActivity(limit = 20) {
    const [recent_sessions, recent_payments, recent_notifications] = await Promise.all([
      this.prisma.parkingSession.findMany({
        take: limit,
        orderBy: { entry_time: 'desc' },
        include: { vehicle: true, space: true, user: { select: { first_name: true, last_name: true } } },
      }),
      this.prisma.payment.findMany({
        take: 10,
        orderBy: { created_at: 'desc' },
        include: { user: { select: { first_name: true, last_name: true } } },
      }),
      this.prisma.notification.findMany({
        take: 10,
        orderBy: { created_at: 'desc' },
        include: { user: { select: { first_name: true, last_name: true } } },
      }),
    ]);

    return ResponseDto.ok({ recent_sessions, recent_payments, recent_notifications });
  }

  async getHourlyTraffic(date?: string) {
    const target = date ? new Date(date) : new Date();
    const start = new Date(target); start.setHours(0, 0, 0, 0);
    const end = new Date(target); end.setHours(23, 59, 59, 999);

    const sessions = await this.prisma.parkingSession.findMany({
      where: { entry_time: { gte: start, lte: end } },
      select: { entry_time: true, exit_time: true },
    });

    const hourly: number[] = new Array(24).fill(0);
    for (const s of sessions) {
      const hour = s.entry_time.getHours();
      hourly[hour]++;
    }

    return ResponseDto.ok({ date: target.toISOString().split('T')[0], hourly_entries: hourly });
  }

  async getAlerts() {
    const [blacklisted_active, long_sessions, low_spaces] = await Promise.all([
      this.prisma.parkingSession.findMany({
        where: { status: 'ACTIVE', vehicle: { blacklisted: true } },
        include: { vehicle: true, space: true },
        take: 10,
      }),
      this.prisma.parkingSession.findMany({
        where: { status: 'ACTIVE', entry_time: { lt: new Date(Date.now() - 8 * 3600000) } },
        include: { vehicle: true, space: true, user: { select: { first_name: true, last_name: true } } },
        take: 10,
        orderBy: { entry_time: 'asc' },
      }),
      this.prisma.parkingSpace.count({ where: { status: 'AVAILABLE', is_active: true } }),
    ]);

    const alerts = [];
    if (blacklisted_active.length > 0) alerts.push({ type: 'BLACKLIST', severity: 'CRITICAL', message: `${blacklisted_active.length} vehículo(s) en lista negra activos`, data: blacklisted_active });
    if (long_sessions.length > 0) alerts.push({ type: 'LONG_SESSION', severity: 'WARNING', message: `${long_sessions.length} sesión(es) de más de 8 horas`, data: long_sessions });
    if (low_spaces < 10) alerts.push({ type: 'LOW_AVAILABILITY', severity: low_spaces < 5 ? 'CRITICAL' : 'WARNING', message: `Solo ${low_spaces} espacio(s) disponible(s)` });

    return ResponseDto.ok({ alert_count: alerts.length, alerts });
  }
}
