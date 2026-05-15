import prisma from '@/lib/prisma';
import * as res from '@/lib/response';

export async function POST(request) {
  try {
    const dto = await request.json();

    const vehicle = await prisma.vehicle.findFirst({ where: { id: dto.vehicle_id, deleted_at: null } });
    if (!vehicle) return res.notFound('Vehículo no encontrado');
    if (vehicle.blacklisted) return res.error('Vehículo en lista negra');

    const space = await prisma.parkingSpace.findUnique({ where: { id: dto.space_id } });
    if (!space) return res.notFound('Espacio no encontrado');
    if (space.status !== 'AVAILABLE') return res.error('Espacio no disponible');

    const existing = await prisma.parkingSession.findFirst({
      where: { vehicle_id: dto.vehicle_id, status: 'ACTIVE' },
    });
    if (existing) return res.error('El vehículo ya tiene una sesión activa');

    const [session] = await prisma.$transaction([
      prisma.parkingSession.create({
        data: {
          vehicle_id: dto.vehicle_id,
          space_id: dto.space_id,
          user_id: vehicle.user_id,
          entry_method: dto.entry_method ?? 'MANUAL',
          operator_entry_id: dto.operator_id,
          status: 'ACTIVE',
        },
        include: { vehicle: true, space: true, user: { select: { id: true, first_name: true, last_name: true } } },
      }),
      prisma.parkingSpace.update({ where: { id: dto.space_id }, data: { status: 'OCCUPIED' } }),
    ]);

    return res.created(session, 'Entrada registrada');
  } catch (e) {
    return res.error(e.message);
  }
}
