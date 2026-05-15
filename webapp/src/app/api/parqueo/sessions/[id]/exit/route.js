import prisma from '@/lib/prisma';
import * as res from '@/lib/response';

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const dto = await request.json().catch(() => ({}));

    const session = await prisma.parkingSession.findFirst({
      where: { id, status: 'ACTIVE' },
      include: { vehicle: true, space: true },
    });
    if (!session) return res.notFound('Sesión activa no encontrada');

    const exit_time = new Date();
    const duration_minutes = Math.ceil((exit_time.getTime() - session.entry_time.getTime()) / 60000);
    const hourly_rate = 5.0;
    const amount_due = parseFloat(((duration_minutes / 60) * hourly_rate).toFixed(2));

    const [updated] = await prisma.$transaction([
      prisma.parkingSession.update({
        where: { id },
        data: { exit_time, duration_minutes, amount_due, status: 'COMPLETED', operator_exit_id: dto?.operator_id },
        include: { vehicle: true, space: true },
      }),
      prisma.parkingSpace.update({ where: { id: session.space_id }, data: { status: 'AVAILABLE' } }),
    ]);

    return res.ok(updated, 'Salida registrada');
  } catch (e) {
    return res.error(e.message);
  }
}
