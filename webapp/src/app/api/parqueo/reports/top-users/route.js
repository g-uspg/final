import prisma from '@/lib/prisma';
import * as res from '@/lib/response';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') ?? '10');

  try {
    const users = await prisma.parkingSession.groupBy({
      by: ['user_id'],
      _count: { id: true },
      _sum: { amount_due: true },
      orderBy: { _count: { id: 'desc' } },
      take: limit,
    });

    const detailed = await Promise.all(users.map(async (u) => {
      const user = await prisma.user.findUnique({
        where: { id: u.user_id },
        select: { id: true, first_name: true, last_name: true, email: true, role: true },
      });
      return { user, session_count: u._count.id, total_spent: u._sum.amount_due ?? 0 };
    }));

    return res.ok(detailed);
  } catch (e) {
    return res.error(e.message);
  }
}
