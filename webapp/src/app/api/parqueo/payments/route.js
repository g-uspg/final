import prisma from '@/lib/prisma';
import * as res from '@/lib/response';
import { getUserFromRequest } from '@/lib/jwt';

export async function POST(request) {
  try {
    const user = getUserFromRequest(request);
    const dto = await request.json();
    const user_id = dto.user_id ?? user?.sub;

    const session = await prisma.parkingSession.findUnique({
      where: { id: dto.session_id },
      include: { payment: true },
    });
    if (!session) return res.notFound('Sesión no encontrada');
    if (session.payment) return res.error('Ya existe un pago para esta sesión');
    if (session.status === 'ACTIVE') return res.error('La sesión aún está activa');

    const payment = await prisma.payment.create({
      data: {
        session_id: dto.session_id,
        user_id,
        amount: session.amount_due ?? 0,
        payment_method: dto.payment_method,
        transaction_reference: dto.transaction_reference,
        status: 'PENDING',
      },
    });

    return res.created(payment, 'Pago creado');
  } catch (e) {
    return res.error(e.message);
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') ?? '1');
  const limit = parseInt(searchParams.get('limit') ?? '20');
  const user_id = searchParams.get('user_id');
  const status = searchParams.get('status');

  try {
    const where = {};
    if (user_id) where.user_id = user_id;
    if (status) where.status = status;

    const [total, data] = await Promise.all([
      prisma.payment.count({ where }),
      prisma.payment.findMany({
        where, skip: (page - 1) * limit, take: limit,
        include: { session: { include: { vehicle: true, space: true } }, user: { select: { id: true, first_name: true, last_name: true, email: true } } },
        orderBy: { created_at: 'desc' },
      }),
    ]);
    return res.ok({ total, page, limit, data });
  } catch (e) {
    return res.error(e.message);
  }
}
