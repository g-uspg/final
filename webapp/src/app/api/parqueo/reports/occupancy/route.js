import prisma from '@/lib/prisma';
import * as res from '@/lib/response';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  try {
    const start = from ? new Date(from) : new Date(Date.now() - 7 * 86400000);
    const end = to ? new Date(to) : new Date();
    const [total_spaces, sessions] = await Promise.all([
      prisma.parkingSpace.count({ where: { is_active: true } }),
      prisma.parkingSession.count({ where: { entry_time: { gte: start, lte: end } } }),
    ]);

    return res.ok({ from: start, to: end, total_spaces, total_sessions: sessions, avg_daily_sessions: Math.round(sessions / Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000))) });
  } catch (e) {
    return res.error(e.message);
  }
}
