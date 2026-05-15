import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ResponseDto } from '../common/dto/response.dto';

@Injectable()
export class SecurityService {
  constructor(private prisma: PrismaService) {}

  async getAuditLogs(page = 1, limit = 20, user_id?: string, action?: string, from?: string, to?: string) {
    const where: any = {};
    if (user_id) where.user_id = user_id;
    if (action) where.action = { contains: action };
    if (from || to) {
      where.created_at = {};
      if (from) where.created_at.gte = new Date(from);
      if (to) where.created_at.lte = new Date(to);
    }

    const [total, data] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where, skip: (page - 1) * limit, take: limit,
        include: { user: { select: { id: true, first_name: true, last_name: true, email: true, role: true } } },
        orderBy: { created_at: 'desc' },
      }),
    ]);
    return ResponseDto.ok({ total, page, limit, data });
  }

  async getBlacklist(page = 1, limit = 20, is_active?: boolean) {
    const where: any = {};
    if (is_active !== undefined) where.is_active = is_active;

    const [total, data] = await Promise.all([
      this.prisma.blacklist.count({ where }),
      this.prisma.blacklist.findMany({
        where, skip: (page - 1) * limit, take: limit,
        include: {
          vehicle: true,
          added_by: { select: { id: true, first_name: true, last_name: true } },
          removed_by: { select: { id: true, first_name: true, last_name: true } },
        },
        orderBy: { created_at: 'desc' },
      }),
    ]);
    return ResponseDto.ok({ total, page, limit, data });
  }

  async getSuspiciousActivity(page = 1, limit = 20) {
    const [blacklistedSessions, longSessions, failedEntries] = await Promise.all([
      this.prisma.parkingSession.findMany({
        where: { vehicle: { blacklisted: true } },
        take: 10,
        include: { vehicle: true, space: true },
        orderBy: { entry_time: 'desc' },
      }),
      this.prisma.parkingSession.findMany({
        where: { status: 'ACTIVE', entry_time: { lt: new Date(Date.now() - 24 * 3600 * 1000) } },
        take: 10,
        include: { vehicle: true, space: true },
        orderBy: { entry_time: 'asc' },
      }),
      this.prisma.auditLog.findMany({
        where: { action: 'LOGIN_FAILED' },
        take: 10,
        include: { user: { select: { id: true, first_name: true, last_name: true, email: true } } },
        orderBy: { created_at: 'desc' },
      }),
    ]);

    return ResponseDto.ok({ blacklisted_sessions: blacklistedSessions, long_sessions: longSessions, failed_entries: failedEntries });
  }

  async getFailedAttempts(page = 1, limit = 20) {
    const where = { action: 'LOGIN_FAILED' };
    const [total, data] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where, skip: (page - 1) * limit, take: limit,
        include: { user: { select: { id: true, first_name: true, last_name: true, email: true } } },
        orderBy: { created_at: 'desc' },
      }),
    ]);
    return ResponseDto.ok({ total, page, limit, data });
  }
}
