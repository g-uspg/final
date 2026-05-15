import prisma from '@/lib/prisma';
import * as res from '@/lib/response';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: { space: true, vehicle: true, user: { select: { id: true, first_name: true, last_name: true, email: true } } },
    });
    if (!reservation) return res.notFound('Reserva no encontrada');
    return res.ok(reservation);
  } catch (e) {
    return res.error(e.message);
  }
}
