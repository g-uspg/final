import prisma from '@/lib/prisma';
import * as res from '@/lib/response';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') ?? '10');

  try {
    const groups = await prisma.parkingSession.groupBy({
      by: ['user_id'],
      where: { user_id: { not: null } },
      _count: { id: true },
      _sum: { amount_due: true, duration_minutes: true },
      orderBy: { _count: { id: 'desc' } },
      take: limit,
    });

    const users = await Promise.all(groups.map(async (g) => {
      const user = await prisma.user.findUnique({
        where: { id: g.user_id },
        select: { id: true, first_name: true, last_name: true, carnet: true, role: true },
      });

      // Zona favorita
      const zoneSessions = await prisma.parkingSession.findMany({
        where: { user_id: g.user_id },
        select: { space: { select: { zone: true } } },
      });
      const zoneCounts = {};
      for (const s of zoneSessions) {
        const z = s.space?.zone;
        if (z) zoneCounts[z] = (zoneCounts[z] ?? 0) + 1;
      }
      const favorite_zone = Object.entries(zoneCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

      return {
        ...user,
        visits: g._count.id,
        total_minutes: Math.round(g._sum.duration_minutes ?? 0),
        total_spent: parseFloat((g._sum.amount_due ?? 0).toString()),
        favorite_zone,
      };
    }));

    return res.ok({ users });
  } catch (e) {
    return res.error(e.message);
  }
}
