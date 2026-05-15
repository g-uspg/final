import prisma from '@/lib/prisma';
import * as res from '@/lib/response';

export async function GET(request, { params }) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') ?? '1');
  const limit = parseInt(searchParams.get('limit') ?? '20');

  try {
    const { id } = await params;
    const where = { user_id: id };
    const [total, sessions] = await Promise.all([
      prisma.parkingSession.count({ where }),
      prisma.parkingSession.findMany({
        where, skip: (page - 1) * limit, take: limit,
        include: { space: true, vehicle: true, payment: true },
        orderBy: { entry_time: 'desc' },
      }),
    ]);
    return res.ok({ total, page, limit, data: sessions });
  } catch (e) {
    return res.error(e.message);
  }
}
