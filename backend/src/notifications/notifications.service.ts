import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ResponseDto } from '../common/dto/response.dto';
import { NotificationType } from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async getMy(user_id: string, page = 1, limit = 20) {
    const where = { user_id };
    const [total, unread, data] = await Promise.all([
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { ...where, is_read: false } }),
      this.prisma.notification.findMany({
        where, skip: (page - 1) * limit, take: limit,
        orderBy: { created_at: 'desc' },
      }),
    ]);
    return ResponseDto.ok({ total, unread, page, limit, data });
  }

  async markRead(id: string, user_id: string) {
    const notif = await this.prisma.notification.findFirst({ where: { id, user_id } });
    if (!notif) throw new NotFoundException('Notificación no encontrada');
    await this.prisma.notification.update({ where: { id }, data: { is_read: true, read_at: new Date() } });
    return ResponseDto.ok(null, 'Notificación marcada como leída');
  }

  async markAllRead(user_id: string) {
    await this.prisma.notification.updateMany({
      where: { user_id, is_read: false },
      data: { is_read: true, read_at: new Date() },
    });
    return ResponseDto.ok(null, 'Todas las notificaciones marcadas como leídas');
  }

  async send(dto: any, emitFn?: Function) {
    const notification = await this.prisma.notification.create({
      data: {
        user_id: dto.user_id,
        type: dto.type,
        title: dto.title,
        message: dto.message,
        metadata: dto.metadata,
      },
    });

    if (emitFn) {
      emitFn(`notification:${dto.user_id}`, notification);
    }

    return ResponseDto.created(notification, 'Notificación enviada');
  }

  async sendToUser(user_id: string, type: NotificationType, title: string, message: string, metadata?: any) {
    return this.prisma.notification.create({
      data: { user_id, type, title, message, metadata },
    });
  }
}
