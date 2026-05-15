import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ResponseDto } from '../common/dto/response.dto';
import { BarrierAction, TriggerSource } from '@prisma/client';

export interface BarrierState {
  id: string;
  name: string;
  location: string;
  is_open: boolean;
  is_blocked: boolean;
  last_action: BarrierAction | null;
  last_action_at: Date | null;
}

const barriers: Map<string, BarrierState> = new Map([
  ['barrier-entrada-a', { id: 'barrier-entrada-a', name: 'Entrada Zona A', location: 'Zona A Norte', is_open: false, is_blocked: false, last_action: null, last_action_at: null }],
  ['barrier-salida-a', { id: 'barrier-salida-a', name: 'Salida Zona A', location: 'Zona A Sur', is_open: false, is_blocked: false, last_action: null, last_action_at: null }],
  ['barrier-entrada-b', { id: 'barrier-entrada-b', name: 'Entrada Zona B', location: 'Zona B Norte', is_open: false, is_blocked: false, last_action: null, last_action_at: null }],
  ['barrier-salida-b', { id: 'barrier-salida-b', name: 'Salida Zona B', location: 'Zona B Sur', is_open: false, is_blocked: false, last_action: null, last_action_at: null }],
]);

@Injectable()
export class BarriersService {
  constructor(private prisma: PrismaService) {}

  async getStatus(barrier_id?: string) {
    if (barrier_id) {
      const b = barriers.get(barrier_id);
      if (!b) return ResponseDto.error('Barrera no encontrada', 404);
      return ResponseDto.ok(b);
    }
    return ResponseDto.ok(Array.from(barriers.values()));
  }

  async command(barrier_id: string, action: BarrierAction, operator_id: string, reason?: string, emitFn?: Function) {
    const barrier = barriers.get(barrier_id);
    if (!barrier) return ResponseDto.error('Barrera no encontrada', 404);

    if (action === BarrierAction.OPEN) { barrier.is_open = true; barrier.is_blocked = false; }
    else if (action === BarrierAction.CLOSE) { barrier.is_open = false; }
    else if (action === BarrierAction.BLOCK) { barrier.is_open = false; barrier.is_blocked = true; }

    barrier.last_action = action;
    barrier.last_action_at = new Date();

    await this.prisma.barrierLog.create({
      data: {
        barrier_id,
        action,
        trigger_source: TriggerSource.MANUAL,
        operator_id,
        notes: reason,
      },
    });

    if (emitFn) {
      emitFn('barrier:status-change', { barrier_id, action, is_open: barrier.is_open, is_blocked: barrier.is_blocked, timestamp: new Date() });
    }

    return ResponseDto.ok(barrier, `Barrera ${action.toLowerCase()}`);
  }

  async getLogs(barrier_id?: string, page = 1, limit = 20) {
    const where: any = {};
    if (barrier_id) where.barrier_id = barrier_id;

    const [total, data] = await Promise.all([
      this.prisma.barrierLog.count({ where }),
      this.prisma.barrierLog.findMany({
        where, skip: (page - 1) * limit, take: limit,
        include: { operator: { select: { id: true, first_name: true, last_name: true } } },
        orderBy: { created_at: 'desc' },
      }),
    ]);
    return ResponseDto.ok({ total, page, limit, data });
  }
}
