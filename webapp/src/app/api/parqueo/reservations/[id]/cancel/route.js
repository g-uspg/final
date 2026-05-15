import prisma from '@/lib/prisma';
import * as res from '@/lib/response';
import { getUserFromRequest } from '@/lib/jwt';

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const user = getUserFromRequest(request);
    const reservation = await prisma.reservation.findUnique({ where: { id } });
    if (!reservation) return res.notFound('Reserva no encontrada');
    if (user && reservation.user_id !== user.sub) return res.error('No autorizado', 403);
    if (!['PENDING', 'CONFIRMED'].includes(reservation.status)) return res.error('La reserva no puede cancelarse');

    await prisma.$transaction([
      prisma.reservation.update({ where: { id }, data: { status: 'CANCELLED' } }),
      prisma.parkingSpace.update({ where: { id: reservation.space_id }, data: { status: 'AVAILABLE' } }),
    ]);

    return res.ok(null, 'Reserva cancelada');
  } catch (e) {
    return res.error(e.message);
  }
}
